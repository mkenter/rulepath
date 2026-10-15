import { describe, expect, it } from 'vitest';

import { appendInvocation, invocationPathFromState } from './invocationPath';

const hero = { gameId: 'fixture-game', procedureId: 'overview', title: 'Overview' };
const details = {
  gameId: 'fixture-game',
  procedureId: 'details',
  title: 'Details',
};

describe('invocation path state', () => {
  it('starts with the invoking procedure rather than a canonical parent', () => {
    expect(appendInvocation([], hero, details)).toEqual([hero, details]);
  });

  it('accepts state only when its final entry matches the canonical route', () => {
    const state = { invocationPath: [hero, details] };

    expect(invocationPathFromState(state, 'fixture-game', 'details')).toEqual([
      hero,
      details,
    ]);
    expect(invocationPathFromState(state, 'fixture-game', 'test')).toEqual([]);
  });

  it('rejects malformed or cross-game history state', () => {
    expect(invocationPathFromState({ invocationPath: [{ title: 'Bad' }] }, 'game', 'flow')).toEqual(
      [],
    );
    expect(
      invocationPathFromState(
        {
          invocationPath: [
            hero,
            { gameId: 'another-game', procedureId: 'details', title: 'Details' },
          ],
        },
        'another-game',
        'details',
      ),
    ).toEqual([]);
  });
});
