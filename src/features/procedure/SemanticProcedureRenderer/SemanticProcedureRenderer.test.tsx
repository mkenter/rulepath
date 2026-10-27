import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { procedureSchema, type Procedure } from '../../../content/schema';
import topology from '../__fixtures__/topology.json';
import { SemanticProcedureRenderer } from './SemanticProcedureRenderer';

function renderGraph(procedure: Procedure) {
  return render(<MemoryRouter><SemanticProcedureRenderer
    gameId="fixture" invocationPath={[]} procedure={procedure}
    procedureTitles={new Map(procedure.nodes.flatMap(node => node.type === 'procedure' ? [[node.target, node.label]] : []))}
  /></MemoryRouter>);
}
describe('semantic graph regression cases', () => {
  it.each(['detour', 'nested', 'loop', 'linked-detour'] as const)('keeps all nodes and connections in %s', id => {
    const procedure = procedureSchema.parse(topology[id]);
    const before = JSON.stringify(procedure);
    renderGraph(procedure);
    for (const node of procedure.nodes) {
      expect(screen.getByRole('article', { name: new RegExp(`: ${node.label}$`) })).toBeInTheDocument();
    }
    expect(within(screen.getByRole('list', { name: 'Procedure connections' })).getAllByRole('listitem')).toHaveLength(procedure.edges.length);
    expect(JSON.stringify(procedure)).toBe(before);
    for (const node of procedure.nodes.filter(node => node.type === 'procedure')) {
      expect(within(screen.getByLabelText(`Procedure link: ${node.label}`)).getByRole('link')).toHaveAttribute('href', `/games/fixture/procedures/${node.target}`);
    }
  });
  it('preserves distinct same-target outcomes and read-only decisions', () => {
    renderGraph(procedureSchema.parse(topology.nested));
    const decision = screen.getByLabelText('Decision · read only: Node drawn');
    expect(decision).toHaveTextContent('Yes');
    expect(decision).toHaveTextContent('No');
    const connections = screen.getByRole('list', { name: 'Procedure connections' });
    expect(connections).toHaveTextContent('Yes: Continue to Node hidden');
    expect(connections).toHaveTextContent('No: Continue to Node hidden');
    expect(decision).toHaveAccessibleDescription('From “Node drawn”: Yes: Continue to Node hidden From “Node drawn”: No: Continue to Node hidden');
    expect(within(decision).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Decision · read only: Node hidden' })).toBeInTheDocument();
  });
  it('retains all four canonical outcomes when visual presentation is unsupported', () => {
    const procedure = procedureSchema.parse({
      id: 'four-outcomes', title: 'Four outcomes', summary: 'Synthetic fixture',
      source: { section: 'Synthetic fixture' },
      nodes: [
        { id: 'start', type: 'start', label: 'Start' },
        { id: 'choice', type: 'decision', label: 'Choose a route' },
        ...['a', 'b', 'c', 'd'].map(id => ({ id, type: 'end', label: `End ${id}` })),
      ],
      edges: [{ from: 'start', to: 'choice' }, ...['a', 'b', 'c', 'd'].map(id => ({ from: 'choice', to: id, label: `Route ${id}` }))],
    });
    renderGraph(procedure);
    expect(screen.getByRole('note')).toHaveTextContent('4 outcomes require an authored presentation');
    const connections = screen.getByRole('list', { name: 'Procedure connections' });
    for (const id of ['a', 'b', 'c', 'd']) expect(connections).toHaveTextContent(`Route ${id}:`);
  });
});
