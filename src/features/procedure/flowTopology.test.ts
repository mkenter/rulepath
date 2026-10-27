import { describe, expect, it } from 'vitest';

import topology from './__fixtures__/topology.json';
import type { Procedure } from '../../content/schema';
import { analyzeProcedureFlow, deriveProcedurePresentationOrder } from './flowTopology';

function fixture(procedureId: keyof typeof topology): Procedure {
  return topology[procedureId] as Procedure;
}

describe('procedure flow topology', () => {
  it.each(['detour', 'nested', 'loop', 'linked-detour'] as const)(
    'orders %s without dropping nodes or forward edges', id => {
      const procedure = fixture(id);
      const authorOrder = procedure.nodes.map(node => node.id);
      const flow = analyzeProcedureFlow(procedure);
      const presentation = deriveProcedurePresentationOrder(procedure, flow.loopEdges);
      const indexes = new Map(presentation.map((node, index) => [node.id, index]));

      expect([...indexes.keys()].sort()).toEqual([...authorOrder].sort());
      for (const edge of procedure.edges.filter(edge => !flow.loopEdges.has(edge))) {
        expect(indexes.get(edge.from), `${edge.from} → ${edge.to}`).toBeLessThan(indexes.get(edge.to)!);
      }
      expect(procedure.nodes.map(node => node.id)).toEqual(authorOrder);
    },
  );

  it('recognizes exclusive work that rejoins a direct continuation', () => {
    const testFlow = analyzeProcedureFlow(fixture('detour'));
    const detour = testFlow.detoursByDecision.get('fate');

    expect(testFlow.decisionKinds.get('fate')).toBe('conditional-detour');
    expect(detour).toMatchObject({
      detourNodeIds: ['add'],
      rejoinNodeId: 'result',
      mainEdge: { from: 'fate', to: 'result', label: 'No' },
      detourEdge: { from: 'fate', to: 'add', label: 'Yes' },
    });
  });

  it('keeps shared, nested, and loop outcomes as genuine splits', () => {
    const engagementFlow = analyzeProcedureFlow(fixture('nested'));
    const battleFlow = analyzeProcedureFlow(fixture('loop'));

    expect(engagementFlow.decisionKinds.get('choice')).toBe('true-split');
    expect(engagementFlow.decisionKinds.get('drawn')).toBe('continuation');
    expect(
      [...engagementFlow.loopEdges].some((edge) => edge.from === 'hidden' && edge.to === 'none'),
    ).toBe(false);
    expect(battleFlow.decisionKinds.get('herodead')).toBe('true-split');
    expect(battleFlow.decisionKinds.get('escape')).toBe('true-split');
    expect(
      [...battleFlow.loopEdges].some((edge) => edge.from === 'escape' && edge.to === 'hero'),
    ).toBe(true);
  });

  it('recognizes the synthetic detours without mutating fixture semantics', () => {
    const procedures = (['linked-detour', 'nested', 'loop'] as const).map(fixture);
    const before = procedures.map((procedure) => JSON.stringify(procedure));
    const [heroFlow, engagementFlow, battleFlow] = procedures.map(analyzeProcedureFlow);

    expect(heroFlow?.detoursByDecision.get('post')?.detourNodeIds).toEqual(['posteng']);
    expect(engagementFlow?.detoursByDecision.size).toBe(0);
    expect(battleFlow?.detoursByDecision.get('foedead')?.detourNodeIds).toEqual(['reward']);
    expect(procedures.map((procedure) => JSON.stringify(procedure))).toEqual(before);
  });

  it('allows a canonical procedure link to be conditional work', () => {
    const procedure: Procedure = {
      id: 'link-detour',
      title: 'Link detour',
      aliases: [],
      summary: 'Topology fixture',
      source: { section: 'Synthetic fixture' },
      nodes: [
        { id: 'start', type: 'start', label: 'Start' },
        { id: 'choice', type: 'decision', label: 'Extra procedure applies?' },
        { id: 'linked', type: 'procedure', label: 'Resolve linked procedure', target: 'target' },
        { id: 'done', type: 'end', label: 'Done' },
      ],
      edges: [
        { from: 'start', to: 'choice' },
        { from: 'choice', to: 'linked', label: 'Yes' },
        { from: 'choice', to: 'done', label: 'No' },
        { from: 'linked', to: 'done' },
      ],
      keyRules: [],
      references: [],
      related: [],
      authorNotes: [],
    };

    expect(analyzeProcedureFlow(procedure).detoursByDecision.get('choice')?.detourNodeIds).toEqual([
      'linked',
    ]);
  });
});
