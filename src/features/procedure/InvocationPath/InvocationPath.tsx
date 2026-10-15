import { Link } from 'react-router-dom';

import { procedurePath, type InvocationEntry } from '../../../navigation/invocationPath';
import styles from './InvocationPath.module.css';
import { PathItems } from './PathItems';

interface InvocationPathProps {
  path: readonly InvocationEntry[];
}

function ancestorState(path: readonly InvocationEntry[], index: number) {
  return { invocationPath: path.slice(0, index + 1) };
}

export function InvocationPath({ path }: InvocationPathProps) {
  if (path.length < 2) return null;

  const parentIndex = path.length - 2;
  const parent = path[parentIndex];

  return (
    <>
      <nav className={`${styles.root} ${styles.wide}`} aria-label="Invocation path">
        <ol><PathItems path={path} /></ol>
      </nav>
      <nav className={`${styles.root} ${styles.compact}`} aria-label="Procedure path controls">
        {parent ? (
          <Link className={styles.backLink} to={procedurePath(parent)} state={ancestorState(path, parentIndex)}>
            <span aria-hidden="true">‹</span> {parent.title}
          </Link>
        ) : null}
        <details className={styles.menu}>
          <summary aria-label="Open full invocation path">Path</summary>
          <div className={styles.sheet} data-path-sheet>
            <p>Invocation path</p>
            <ol><PathItems path={path} /></ol>
          </div>
        </details>
      </nav>
    </>
  );
}
