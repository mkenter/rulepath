import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { Link } from 'react-router-dom';

import styles from './SemanticProcedureRenderer.module.css';

import type { Procedure, ProcedureNode } from '../../../content/schema';
import {
  appendInvocation,
  procedurePath,
  type InvocationEntry,
} from '../../../navigation/invocationPath';
import {
  analyzeProcedureFlow,
  deriveProcedurePresentationOrder,
  type ProcedureEdge,
} from '../flowTopology';

interface SemanticProcedureRendererProps {
  gameId: string;
  invocationPath: readonly InvocationEntry[];
  procedure: Procedure;
  procedureTitles: ReadonlyMap<string, string>;
}

interface NodeCardProps extends SemanticProcedureRendererProps {
  node: ProcedureNode;
  routeDirections: ReadonlyMap<string, RouteDirection>;
  routeTones: ReadonlyMap<string, RouteTone>;
}

interface GroupedEdge {
  edges: readonly ProcedureEdge[];
  from: string;
  key: string;
  to: string;
}

interface ConnectorRoute {
  direction: RouteDirection;
  from: string;
  isLoop: boolean;
  key: string;
  kind: 'bypass' | 'loop' | 'spine';
  label?: string;
  labelAnchor: 'end' | 'start';
  labelX: number;
  labelY: number;
  path: string;
  to: string;
  tone: RouteTone;
}

type RouteDirection = 'down' | 'left' | 'return' | 'right';
type RouteTone = 'neutral' | 'return' | 'route-a' | 'route-b' | 'route-c';

const bypassRouteTones = ['route-a', 'route-b', 'route-c'] as const;
const maximumPortFanSpan = 12;
const portFanPitch = 4;
const railEdgeClearance = 16;
const railLaneSpacing = 16;

interface RailLayout {
  bypassLanes: ReadonlyMap<string, number>;
  groupedEdges: readonly GroupedEdge[];
  leftBypasses: readonly GroupedEdge[];
  loopLanes: ReadonlyMap<string, number>;
  rightBypasses: readonly GroupedEdge[];
  routeDirections: ReadonlyMap<string, RouteDirection>;
  routeTones: ReadonlyMap<string, RouteTone>;
}

const nodeTypeLabel: Record<ProcedureNode['type'], string> = {
  start: 'Start',
  end: 'End',
  step: 'Step',
  decision: 'Decision · read only',
  procedure: 'Procedure link',
};

const routeDirectionOrder: Record<RouteDirection, number> = {
  left: 1,
  down: 2,
  right: 3,
  return: 3,
};

const nodeTypeClasses = {
  start: styles.start,
  end: styles.end,
  step: styles.node,
  decision: styles.decision,
  procedure: styles.procedure,
};

const directionClasses = {
  left: styles.left,
  down: styles.down,
  right: styles.right,
  return: styles.returnDirection,
};

const toneClasses = {
  neutral: styles.branch,
  return: styles.toneReturn,
  "route-a": styles.toneRouteA,
  "route-b": styles.toneRouteB,
  "route-c": styles.toneRouteC,
};

const markerToneClasses = {
  neutral: styles.markerNeutral,
  return: styles.markerReturn,
  "route-a": styles.markerRouteA,
  "route-b": styles.markerRouteB,
  "route-c": styles.markerRouteC,
};

const connectorToneClasses = {
  neutral: styles.connector,
  return: styles.connectorReturn,
  "route-a": styles.connectorRouteA,
  "route-b": styles.connectorRouteB,
  "route-c": styles.connectorRouteC,
};

function compactBranchLabel(label: string) {
  if (/^yes(?:\b|,)/i.test(label)) {
    return 'Yes';
  }
  if (/^no(?:\b|,)/i.test(label)) {
    return 'No';
  }
  return label;
}

function groupEdges(edges: readonly ProcedureEdge[]): GroupedEdge[] {
  const groups = new Map<string, GroupedEdge>();

  for (const edge of edges) {
    const key = `${edge.from}:${edge.to}`;
    const existing = groups.get(key);
    if (existing) {
      groups.set(key, { ...existing, edges: [...existing.edges, edge] });
    } else {
      groups.set(key, { edges: [edge], from: edge.from, key, to: edge.to });
    }
  }

  return [...groups.values()];
}

function assignLanes(
  groups: readonly GroupedEdge[],
  nodeIndexes: ReadonlyMap<string, number>,
) {
  const lanes: { end: number; start: number }[][] = [];
  const assignment = new Map<string, number>();
  const ordered = [...groups].sort((left, right) => {
    const leftLength = Math.abs(
      (nodeIndexes.get(left.to) ?? 0) - (nodeIndexes.get(left.from) ?? 0),
    );
    const rightLength = Math.abs(
      (nodeIndexes.get(right.to) ?? 0) - (nodeIndexes.get(right.from) ?? 0),
    );
    return leftLength - rightLength;
  });

  for (const group of ordered) {
    const fromIndex = nodeIndexes.get(group.from) ?? 0;
    const toIndex = nodeIndexes.get(group.to) ?? 0;
    const interval = { end: Math.max(fromIndex, toIndex), start: Math.min(fromIndex, toIndex) };
    let lane = lanes.findIndex((entries) =>
      entries.every((entry) => interval.end < entry.start || interval.start > entry.end),
    );
    if (lane === -1) {
      lane = lanes.length;
      lanes.push([]);
    }
    lanes[lane]?.push(interval);
    assignment.set(group.key, lane);
  }

  return assignment;
}

function maximumLaneDepth(assignment: ReadonlyMap<string, number>) {
  return assignment.size ? Math.max(...assignment.values()) + 1 : 0;
}

function assignPortFanOffsets(
  groups: readonly GroupedEdge[],
  routeDirections: ReadonlyMap<string, RouteDirection>,
  presentationIndexes: ReadonlyMap<string, number>,
  endpoint: 'incoming' | 'outgoing',
) {
  const buckets = new Map<string, GroupedEdge[]>();
  const offsets = new Map<string, number>();

  for (const group of groups) {
    const direction = routeDirections.get(group.key);
    if (!direction || direction === 'down') {
      continue;
    }
    const side = direction === 'left' ? 'left' : 'right';
    const nodeId = endpoint === 'incoming' ? group.to : group.from;
    const bucketKey = `${nodeId}:${side}`;
    buckets.set(bucketKey, [...(buckets.get(bucketKey) ?? []), group]);
  }

  for (const bucket of buckets.values()) {
    const ordered = [...bucket].sort((left, right) => {
      const leftPeer = endpoint === 'incoming' ? left.from : left.to;
      const rightPeer = endpoint === 'incoming' ? right.from : right.to;
      return (
        (presentationIndexes.get(leftPeer) ?? 0) -
          (presentationIndexes.get(rightPeer) ?? 0) || left.key.localeCompare(right.key)
      );
    });
    const span = Math.min(Math.max(0, ordered.length - 1) * portFanPitch, maximumPortFanSpan);
    const step = ordered.length > 1 ? span / (ordered.length - 1) : 0;
    ordered.forEach((group, index) => offsets.set(group.key, -span / 2 + index * step));
  }

  return offsets;
}

function createRailLayout(
  procedure: Procedure,
  loopEdges: ReadonlySet<ProcedureEdge>,
  presentationIndexes: ReadonlyMap<string, number>,
): RailLayout {
  const groupedEdges = groupEdges(procedure.edges);
  const routeDirections = new Map<string, RouteDirection>();

  for (const group of groupedEdges) {
    const fromIndex = presentationIndexes.get(group.from);
    const toIndex = presentationIndexes.get(group.to);
    routeDirections.set(
      group.key,
      group.edges.some((edge) => loopEdges.has(edge))
        ? 'return'
        : fromIndex !== undefined && toIndex === fromIndex + 1
          ? 'down'
          : 'left',
    );
  }

  // Three-target decisions with one immediate continuation get a compact
  // left/down/right bar without changing graph data or presentation order.
  for (const node of procedure.nodes) {
    if (node.type !== 'decision') {
      continue;
    }
    const outgoing = groupedEdges.filter(
      (group) =>
        group.from === node.id && !group.edges.some((edge) => loopEdges.has(edge)),
    );
    const nodeIndex = presentationIndexes.get(node.id);
    const central = outgoing.filter(
      (group) => presentationIndexes.get(group.to) === (nodeIndex ?? -2) + 1,
    );
    if (outgoing.length === 3 && central.length === 1) {
      const sideGroups = outgoing.filter((group) => group !== central[0]);
      routeDirections.set(central[0]!.key, 'down');
      routeDirections.set(sideGroups[0]!.key, 'left');
      routeDirections.set(sideGroups[1]!.key, 'right');
    }
  }

  const loops = groupedEdges.filter((group) => routeDirections.get(group.key) === 'return');
  const leftBypasses = groupedEdges.filter(
    (group) => routeDirections.get(group.key) === 'left',
  );
  const rightBypasses = groupedEdges.filter(
    (group) => routeDirections.get(group.key) === 'right',
  );
  const leftLanes = assignLanes(leftBypasses, presentationIndexes);
  const rightLanes = assignLanes(rightBypasses, presentationIndexes);
  const bypassLanes = new Map([...leftLanes, ...rightLanes]);
  const loopLanes = assignLanes(loops, presentationIndexes);
  const routeTones = new Map<string, RouteTone>();

  for (const group of groupedEdges) {
    const direction = routeDirections.get(group.key);
    const lane = bypassLanes.get(group.key) ?? 0;
    routeTones.set(
      group.key,
      direction === 'return'
        ? 'return'
        : direction === 'left'
          ? bypassRouteTones[lane % bypassRouteTones.length]!
          : direction === 'right'
            ? bypassRouteTones[(lane + 1) % bypassRouteTones.length]!
            : 'neutral',
    );
  }

  return {
    bypassLanes,
    groupedEdges,
    leftBypasses,
    loopLanes,
    rightBypasses,
    routeDirections,
    routeTones,
  };
}

function FlowConnectors({
  containerRef,
  flow,
  presentationIndexes,
  procedure,
  railLayout,
}: {
  containerRef: RefObject<HTMLOListElement | null>;
  flow: ReturnType<typeof analyzeProcedureFlow>;
  presentationIndexes: ReadonlyMap<string, number>;
  procedure: Procedure;
  railLayout: RailLayout;
}) {
  const markerId = useId().replaceAll(':', '');
  const [routes, setRoutes] = useState<readonly ConnectorRoute[]>([]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const calculateRoutes = () => {
      const containerBounds = container.getBoundingClientRect();
      const nodeElements = new Map<string, HTMLElement>();
      container.querySelectorAll<HTMLElement>('[data-flow-node-id]').forEach((item) => {
        const nodeId = item.dataset.flowNodeId;
        const node = item.querySelector<HTMLElement>(`.${styles.node}`);
        if (nodeId && node) {
          nodeElements.set(nodeId, node);
        }
      });

      const {
        bypassLanes,
        groupedEdges,
        loopLanes,
        routeDirections,
        routeTones,
      } = railLayout;
      const columnLeft = Math.min(
        ...[...nodeElements.values()].map((element) => element.getBoundingClientRect().left),
      );
      const columnRight = Math.max(
        ...[...nodeElements.values()].map((element) => element.getBoundingClientRect().right),
      );
      const sideIncomingNodeIds = new Set(
        groupedEdges
          .filter((group) => routeDirections.get(group.key) !== 'down')
          .map((group) => group.to),
      );
      const sideOutgoingNodeIds = new Set(
        groupedEdges
          .filter((group) => routeDirections.get(group.key) !== 'down')
          .map((group) => group.from),
      );
      const hasIncomingAndOutgoingSideRails = (nodeId: string) =>
        sideIncomingNodeIds.has(nodeId) && sideOutgoingNodeIds.has(nodeId);
      const incomingFanOffsets = assignPortFanOffsets(
        groupedEdges,
        routeDirections,
        presentationIndexes,
        'incoming',
      );
      const outgoingFanOffsets = assignPortFanOffsets(
        groupedEdges,
        routeDirections,
        presentationIndexes,
        'outgoing',
      );

      const nextRoutes = groupedEdges.flatMap<ConnectorRoute>((group) => {
        const source = nodeElements.get(group.from)?.getBoundingClientRect();
        const target = nodeElements.get(group.to)?.getBoundingClientRect();
        const fromIndex = presentationIndexes.get(group.from);
        const toIndex = presentationIndexes.get(group.to);
        if (!source || !target || fromIndex === undefined || toIndex === undefined) {
          return [];
        }

        const relative = (value: number, axis: 'x' | 'y') =>
          value - (axis === 'x' ? containerBounds.left : containerBounds.top);
        const labels = group.edges.flatMap((edge) => edge.label ?? []);
        const sourceNode = procedure.nodes.find((node) => node.id === group.from);
        const direction = routeDirections.get(group.key) ?? 'left';
        const tone = routeTones.get(group.key) ?? 'neutral';
        const label = sourceNode?.type !== 'decision' && labels.length
          ? [...new Set(labels.map(compactBranchLabel))].join(' / ')
          : undefined;
        const isLoop = group.edges.some((edge) => flow.loopEdges.has(edge));

        if (toIndex === fromIndex + 1 && !isLoop) {
          const sourceX = relative(source.left + source.width / 2, 'x');
          const sourceY = relative(source.bottom, 'y');
          const targetX = relative(target.left + target.width / 2, 'x');
          const targetY = relative(target.top, 'y');
          return [{
            direction,
            from: group.from,
            isLoop,
            key: group.key,
            kind: 'spine',
            label,
            labelAnchor: 'start',
            labelX: sourceX + 9,
            labelY: (sourceY + targetY) / 2 + 4,
            path: `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`,
            to: group.to,
            tone,
          }];
        }

        const branchElement = [...(nodeElements.get(group.from)?.querySelectorAll<HTMLElement>(`.${styles.branch}`) ?? [])].find((element) => element.dataset.routeKey === group.key);
        const branchBounds = branchElement?.getBoundingClientRect();
        const sourcePortY = branchBounds
          ? branchBounds.top + branchBounds.height / 2
          : (hasIncomingAndOutgoingSideRails(group.from)
              ? source.bottom - Math.min(18, source.height * 0.28)
              : source.top + source.height / 2) + (outgoingFanOffsets.get(group.key) ?? 0);
        const sourceY = relative(sourcePortY, 'y');
        const targetY = relative(
          hasIncomingAndOutgoingSideRails(group.to)
            ? target.top +
                Math.min(18, target.height * 0.28) +
                (incomingFanOffsets.get(group.key) ?? 0)
            : target.top + target.height / 2 + (incomingFanOffsets.get(group.key) ?? 0),
          'y',
        );
        if (isLoop) {
          const lane = loopLanes.get(group.key) ?? 0;
          const sourceX = relative(source.right, 'x');
          const targetX = relative(target.right, 'x');
          const railX = relative(columnRight, 'x') + railEdgeClearance + lane * railLaneSpacing;
          return [{
            direction,
            from: group.from,
            isLoop,
            key: group.key,
            kind: 'loop',
            label,
            labelAnchor: 'start',
            labelX: sourceX + 7,
            labelY: sourceY - 7,
            path: `M ${sourceX} ${sourceY} H ${railX} V ${targetY} H ${targetX}`,
            to: group.to,
            tone,
          }];
        }

        const lane = bypassLanes.get(group.key) ?? 0;
        const exitsRight = direction === 'right';
        const sourceX = relative(exitsRight ? source.right : source.left, 'x');
        const targetX = relative(exitsRight ? target.right : target.left, 'x');
        const railX = exitsRight
          ? relative(columnRight, 'x') + railEdgeClearance + lane * railLaneSpacing
          : relative(columnLeft, 'x') - railEdgeClearance - lane * railLaneSpacing;
        return [{
          direction,
          from: group.from,
          isLoop,
          key: group.key,
          kind: 'bypass',
          label,
          labelAnchor: exitsRight ? 'start' : 'end',
          labelX: sourceX + (exitsRight ? 7 : -7),
          labelY: sourceY - 7,
          path: `M ${sourceX} ${sourceY} H ${railX} V ${targetY} H ${targetX}`,
          to: group.to,
          tone,
        }];
      });

      setRoutes(nextRoutes);
    };

    calculateRoutes();
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(calculateRoutes);
    resizeObserver?.observe(container);
    window.addEventListener('resize', calculateRoutes);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', calculateRoutes);
    };
  }, [containerRef, flow, presentationIndexes, procedure, railLayout]);

  const markerTones: readonly RouteTone[] = [
    'neutral',
    'route-a',
    'route-b',
    'route-c',
    'return',
  ];

  return (
    <svg className={styles.connectors} data-flow-connectors aria-hidden="true">
      <defs>
        {markerTones.map((tone) => (
          <marker
            className={`${styles.marker} ${markerToneClasses[tone]}`}
            id={`${markerId}-${tone}`}
            key={tone}
            data-flow-marker-tone={tone}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="6"
            refY="3.5"
            viewBox="0 0 7 7"
          >
            <path d="M 0 0 L 7 3.5 L 0 7 z" />
          </marker>
        ))}
      </defs>
      {routes.map((route) => (
        <g
          className={`${styles.connector} ${connectorToneClasses[route.tone]}`}
          data-edge-from={route.from}
          data-edge-to={route.to}
          data-route-direction={route.direction}
          data-route-kind={route.kind}
          data-route-tone={route.tone}
          key={route.key}
        >
          <path className={styles.casing} data-flow-connector-casing d={route.path} />
          <path
            className={styles.route} data-flow-connector-route
            d={route.path}
            markerEnd={`url(#${markerId}-${route.tone})`}
          />
          {route.label ? (
            <text x={route.labelX} y={route.labelY} textAnchor={route.labelAnchor}>
              {route.label}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function NodeCard({
  gameId,
  invocationPath,
  node,
  procedure,
  procedureTitles,
  routeDirections,
  routeTones,
}: NodeCardProps) {
  const targetTitle = node.type === 'procedure' ? procedureTitles.get(node.target) : undefined;
  const currentEntry: InvocationEntry = {
    gameId,
    procedureId: procedure.id,
    title: procedure.title,
  };
  const decisionGroups =
    node.type === 'decision'
      ? groupEdges(procedure.edges.filter((edge) => edge.from === node.id))
      : [];
  const decisionBranches = decisionGroups
    .flatMap((group) => {
      const direction = routeDirections.get(group.key) ?? 'left';
      const tone = routeTones.get(group.key) ?? 'neutral';
      const labels = group.edges.length
        ? group.edges.map((edge) => compactBranchLabel(edge.label ?? 'Continue'))
        : ['Continue'];
      return labels.map((label, index) => ({
        key: `${group.key}:${index}`,
        direction,
        label,
        routeKey: group.key,
        tone,
      }));
    })
    .sort(
      (left, right) =>
        routeDirectionOrder[left.direction] - routeDirectionOrder[right.direction],
    );

  return (
    <article
      className={`${styles.node} ${nodeTypeClasses[node.type]}`} data-flow-node
      data-flow-node-type={node.type}
      aria-label={`${nodeTypeLabel[node.type]}: ${node.label}`}
    >
      <div className={styles.body}>
        {node.type === 'procedure' && targetTitle ? (
          <Link
            className={styles.procedureLink}
            to={procedurePath({ gameId, procedureId: node.target })}
            state={{
              invocationPath: appendInvocation(invocationPath, currentEntry, {
                gameId,
                procedureId: node.target,
                title: targetTitle,
              }),
            }}
          >
            {node.label} <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <p className={styles.label} data-flow-node-label>{node.label}</p>
        )}
      </div>
      {node.type === 'decision' && decisionBranches.length > 3 ? (
        <p
          className={styles.unsupported}
          data-outcome-count={decisionBranches.length}
          role="note"
        >
          {decisionBranches.length} outcomes require an authored presentation
        </p>
      ) : node.type === 'decision' && decisionBranches.length ? (
        <div className={styles.branches} data-flow-decision-branches aria-hidden="true">
          {decisionBranches.map((branch) => (
            <span
              className={`${styles.branch} ${directionClasses[branch.direction]} ${toneClasses[branch.tone]}`} data-flow-decision-branch
              data-route-key={branch.routeKey}
              key={branch.key}
            >
              {branch.direction === 'left' ? '← ' : null}
              {branch.label}
              {branch.direction === 'down' ? ' ↓' : null}
              {branch.direction === 'right' ? ' →' : null}
              {branch.direction === 'return' ? ' ↻' : null}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function SemanticProcedureRenderer(props: SemanticProcedureRendererProps) {
  const { procedure } = props;
  const listRef = useRef<HTMLOListElement>(null);
  const nodesById = new Map(procedure.nodes.map((node) => [node.id, node]));
  const flow = useMemo(() => analyzeProcedureFlow(procedure), [procedure]);
  const presentationNodes = useMemo(
    () => deriveProcedurePresentationOrder(procedure, flow.loopEdges),
    [flow.loopEdges, procedure],
  );
  const presentationIndexes = useMemo(
    () => new Map(presentationNodes.map((node, index) => [node.id, index])),
    [presentationNodes],
  );
  const railLayout = useMemo(
    () => createRailLayout(procedure, flow.loopEdges, presentationIndexes),
    [flow.loopEdges, presentationIndexes, procedure],
  );
  const railDepth = Math.max(
    maximumLaneDepth(
      new Map(
        railLayout.leftBypasses.map((group) => [group.key, railLayout.bypassLanes.get(group.key) ?? 0]),
      ),
    ),
    maximumLaneDepth(
      new Map(
        railLayout.rightBypasses.map((group) => [group.key, railLayout.bypassLanes.get(group.key) ?? 0]),
      ),
    ),
    maximumLaneDepth(railLayout.loopLanes),
  );
  const gutterWidth = railEdgeClearance + 8 + Math.max(0, railDepth - 1) * railLaneSpacing;
  const flowStyle = { '--flow-gutter': `${gutterWidth}px` } as CSSProperties;

  return (
    <section className={styles.root} data-procedure-diagram aria-label={`${procedure.title} procedure flow`}>
      <ol className={styles.list} data-flow-list data-rail-depth={railDepth} ref={listRef} style={flowStyle}>
        <FlowConnectors
          containerRef={listRef}
          flow={flow}
          presentationIndexes={presentationIndexes}
          procedure={procedure}
          railLayout={railLayout}
        />
        {presentationNodes.map((node, presentationIndex) => (
          <li
            className={styles.item}
            data-flow-kind={node.type === 'decision' ? flow.decisionKinds.get(node.id) : undefined}
            data-flow-node-id={node.id}
            data-presentation-index={presentationIndex}
            key={node.id}
          >
            <NodeCard
              node={node}
              routeDirections={railLayout.routeDirections}
              routeTones={railLayout.routeTones}
              {...props}
            />
          </li>
        ))}
      </ol>
      <ul className={styles.screenReaderEdges} aria-label="Procedure connections">
        {procedure.edges.map((edge, index) => {
          const destination = nodesById.get(edge.to)?.label ?? edge.to;
          const isLoop = flow.loopEdges.has(edge);
          return (
            <li key={`${edge.from}-${edge.to}-${edge.label ?? ''}-${index}`}>
              {edge.label ? `${edge.label}: ` : ''}
              {isLoop ? 'Return to ' : 'Continue to '}
              {destination}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
