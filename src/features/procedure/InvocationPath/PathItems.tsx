import { Link } from 'react-router-dom';

import { procedurePath, type InvocationEntry } from '../../../navigation/invocationPath';

interface PathItemsProps {
  path: readonly InvocationEntry[];
}

function ancestorState(path: readonly InvocationEntry[], index: number) {
  return { invocationPath: path.slice(0, index + 1) };
}

export function PathItems({ path }: PathItemsProps) {
  return path.map((entry, index) => {
    const isCurrent = index === path.length - 1;
    return (
      <li key={`${entry.procedureId}-${index}`}>
        {isCurrent ? (
          <span aria-current="page">{entry.title}</span>
        ) : (
          <Link to={procedurePath(entry)} state={ancestorState(path, index)}>{entry.title}</Link>
        )}
      </li>
    );
  });
}
