import type { Location } from 'react-router-dom';

export interface InvocationEntry {
  readonly gameId: string;
  readonly procedureId: string;
  readonly title: string;
}

export interface NavigationState {
  readonly invocationPath?: readonly InvocationEntry[];
  readonly backgroundLocation?: Location;
}

function isInvocationEntry(value: unknown): value is InvocationEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.gameId === 'string' &&
    typeof entry.procedureId === 'string' &&
    typeof entry.title === 'string'
  );
}

export function invocationPathFromState(
  state: unknown,
  gameId: string,
  procedureId: string,
): readonly InvocationEntry[] {
  if (!state || typeof state !== 'object') {
    return [];
  }

  const path = (state as NavigationState).invocationPath;
  if (!Array.isArray(path) || !path.every(isInvocationEntry)) {
    return [];
  }

  const last = path.at(-1);
  if (
    !last ||
    last.gameId !== gameId ||
    last.procedureId !== procedureId ||
    path.some((entry) => entry.gameId !== gameId)
  ) {
    return [];
  }

  return path;
}

export function appendInvocation(
  currentPath: readonly InvocationEntry[],
  current: InvocationEntry,
  target: InvocationEntry,
): readonly InvocationEntry[] {
  const pathEndsAtCurrent =
    currentPath.at(-1)?.gameId === current.gameId &&
    currentPath.at(-1)?.procedureId === current.procedureId;

  return [...(pathEndsAtCurrent ? currentPath : [current]), target];
}

export function procedurePath(entry: Pick<InvocationEntry, 'gameId' | 'procedureId'>) {
  return `/games/${entry.gameId}/procedures/${entry.procedureId}`;
}

export function backgroundLocationFromState(state: unknown): Location | undefined {
  if (!state || typeof state !== 'object') {
    return undefined;
  }

  const background = (state as NavigationState).backgroundLocation;
  return background && typeof background.pathname === 'string' ? background : undefined;
}
