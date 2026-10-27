import type { Procedure, ProcedureNode } from '../../content/schema';

export type ProcedureEdge = Procedure['edges'][number];

export interface ConditionalDetour {
  decisionId: string;
  detourEdge: ProcedureEdge;
  detourNodeIds: readonly string[];
  mainEdge: ProcedureEdge;
  rejoinNodeId: string;
}

export type DecisionFlowKind = 'conditional-detour' | 'continuation' | 'true-split';

export interface ProcedureFlowAnalysis {
  decisionKinds: ReadonlyMap<string, DecisionFlowKind>;
  detourNodeIds: ReadonlySet<string>;
  detoursByDecision: ReadonlyMap<string, ConditionalDetour>;
  loopEdges: ReadonlySet<ProcedureEdge>;
}

/**
 * Produces a stable, presentation-only topological order. Longer unfinished
 * paths stay on the spine first, leaving shorter exceptions to rejoin later.
 * Canonical node ids and edges remain untouched.
 */
export function deriveProcedurePresentationOrder(
  procedure: Procedure,
  loopEdges: ReadonlySet<ProcedureEdge>,
): readonly ProcedureNode[] {
  const authorIndexes = new Map(procedure.nodes.map((node, index) => [node.id, index]));
  const nodesById = new Map(procedure.nodes.map((node) => [node.id, node]));
  const forwardEdges = procedure.edges.filter((edge) => !loopEdges.has(edge));
  const outgoing = new Map<string, ProcedureEdge[]>();
  const indegrees = new Map(procedure.nodes.map((node) => [node.id, 0]));

  for (const edge of forwardEdges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
    indegrees.set(edge.to, (indegrees.get(edge.to) ?? 0) + 1);
  }

  const depthMemo = new Map<string, number>();
  const depthVisiting = new Set<string>();
  const remainingDepth = (nodeId: string): number => {
    const memoized = depthMemo.get(nodeId);
    if (memoized !== undefined) {
      return memoized;
    }
    if (depthVisiting.has(nodeId)) {
      return 0;
    }
    depthVisiting.add(nodeId);
    const depth = Math.max(
      0,
      ...(outgoing.get(nodeId) ?? []).map((edge) => 1 + remainingDepth(edge.to)),
    );
    depthVisiting.delete(nodeId);
    depthMemo.set(nodeId, depth);
    return depth;
  };

  const ready = procedure.nodes.filter((node) => indegrees.get(node.id) === 0);
  const ordered: ProcedureNode[] = [];
  const emitted = new Set<string>();

  while (ready.length) {
    const previousNode = ordered.at(-1);
    const previousIndex = previousNode ? (authorIndexes.get(previousNode.id) ?? 0) : 0;
    const immediateTargets = new Set(
      (previousNode ? outgoing.get(previousNode.id) : undefined)?.map((edge) => edge.to) ?? [],
    );
    ready.sort((left, right) => {
      const continuationDifference =
        Number(immediateTargets.has(right.id)) - Number(immediateTargets.has(left.id));
      const depthDifference = remainingDepth(right.id) - remainingDepth(left.id);
      const proximityDifference =
        Math.abs((authorIndexes.get(left.id) ?? 0) - previousIndex) -
        Math.abs((authorIndexes.get(right.id) ?? 0) - previousIndex);
      return (
        continuationDifference ||
        depthDifference ||
        proximityDifference ||
        (authorIndexes.get(left.id) ?? 0) - (authorIndexes.get(right.id) ?? 0)
      );
    });
    const node = ready.shift();
    if (!node || emitted.has(node.id)) {
      continue;
    }
    ordered.push(node);
    emitted.add(node.id);

    for (const edge of outgoing.get(node.id) ?? []) {
      const nextIndegree = (indegrees.get(edge.to) ?? 0) - 1;
      indegrees.set(edge.to, nextIndegree);
      if (nextIndegree === 0) {
        const target = nodesById.get(edge.to);
        if (target) {
          ready.push(target);
        }
      }
    }
  }

  // Invalid or unexpectedly cyclic input remains visible in author order. The
  // content validator owns semantic rejection; the renderer must not drop it.
  for (const node of procedure.nodes) {
    if (!emitted.has(node.id)) {
      ordered.push(node);
    }
  }

  return ordered;
}

function traceExclusiveBranch(
  procedure: Procedure,
  decisionId: string,
  branchEdge: ProcedureEdge,
  rejoinNodeId: string,
  edgesByFrom: ReadonlyMap<string, readonly ProcedureEdge[]>,
  edgesByTo: ReadonlyMap<string, readonly ProcedureEdge[]>,
  loopEdges: ReadonlySet<ProcedureEdge>,
): readonly string[] | undefined {
  const nodesById = new Map(procedure.nodes.map((node) => [node.id, node]));
  const branchNodeIds: string[] = [];
  const visited = new Set<string>([decisionId]);
  let previousId = decisionId;
  let currentId = branchEdge.to;

  while (currentId !== rejoinNodeId) {
    if (visited.has(currentId)) {
      return undefined;
    }
    visited.add(currentId);

    const node = nodesById.get(currentId);
    if (!node || (node.type !== 'step' && node.type !== 'procedure')) {
      return undefined;
    }

    const incoming = edgesByTo.get(currentId) ?? [];
    if (incoming.length !== 1 || incoming[0]?.from !== previousId) {
      return undefined;
    }

    const outgoing = edgesByFrom.get(currentId) ?? [];
    if (outgoing.length !== 1 || !outgoing[0] || loopEdges.has(outgoing[0])) {
      return undefined;
    }

    branchNodeIds.push(currentId);
    previousId = currentId;
    currentId = outgoing[0].to;
  }

  return branchNodeIds.length ? branchNodeIds : undefined;
}

export function analyzeProcedureFlow(procedure: Procedure): ProcedureFlowAnalysis {
  const edgesByFrom = new Map<string, ProcedureEdge[]>();
  const edgesByTo = new Map<string, ProcedureEdge[]>();

  for (const edge of procedure.edges) {
    edgesByFrom.set(edge.from, [...(edgesByFrom.get(edge.from) ?? []), edge]);
    edgesByTo.set(edge.to, [...(edgesByTo.get(edge.to) ?? []), edge]);
  }

  // Only an edge back into the active traversal closes a loop. Comparing
  // author indexes mislabels ordinary branch joins when the larger procedure
  // repeats, because those nodes can also reach one another around that cycle.
  const loopEdges = new Set<ProcedureEdge>();
  const visited = new Set<string>();
  const active = new Set<string>();
  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    active.add(nodeId);
    for (const edge of edgesByFrom.get(nodeId) ?? []) {
      if (active.has(edge.to)) loopEdges.add(edge);
      else visit(edge.to);
    }
    active.delete(nodeId);
  };
  const start = procedure.nodes.find((node) => node.type === 'start');
  if (start) visit(start.id);
  for (const node of procedure.nodes) visit(node.id);
  const decisionKinds = new Map<string, DecisionFlowKind>();
  const detoursByDecision = new Map<string, ConditionalDetour>();
  const detourNodeIds = new Set<string>();

  for (const node of procedure.nodes) {
    if (node.type !== 'decision') {
      continue;
    }

    const outgoing = edgesByFrom.get(node.id) ?? [];
    const distinctTargets = new Set(outgoing.map((edge) => edge.to));
    let detour: ConditionalDetour | undefined;

    if (
      outgoing.length === 2 &&
      distinctTargets.size === 2 &&
      outgoing.every((edge) => !loopEdges.has(edge))
    ) {
      for (const mainEdge of outgoing) {
        const detourEdge = outgoing.find((edge) => edge !== mainEdge);
        if (!detourEdge) {
          continue;
        }

        const branchNodeIds = traceExclusiveBranch(
          procedure,
          node.id,
          detourEdge,
          mainEdge.to,
          edgesByFrom,
          edgesByTo,
          loopEdges,
        );
        if (branchNodeIds) {
          detour = {
            decisionId: node.id,
            detourEdge,
            detourNodeIds: branchNodeIds,
            mainEdge,
            rejoinNodeId: mainEdge.to,
          };
          break;
        }
      }
    }

    if (detour && detour.detourNodeIds.every((id) => !detourNodeIds.has(id))) {
      decisionKinds.set(node.id, 'conditional-detour');
      detoursByDecision.set(node.id, detour);
      detour.detourNodeIds.forEach((id) => detourNodeIds.add(id));
    } else if (distinctTargets.size > 1) {
      decisionKinds.set(node.id, 'true-split');
    } else {
      decisionKinds.set(node.id, 'continuation');
    }
  }

  return { decisionKinds, detourNodeIds, detoursByDecision, loopEdges };
}
