import { useId } from 'react';
import { Link } from 'react-router-dom';

import styles from './GameHomeIndexLink.module.css';

interface GameHomeIndexLinkProps {
  kind: 'procedure' | 'reference';
  showKind?: boolean;
  summary?: string;
  title: string;
  to: string;
}

export function GameHomeIndexLink({ kind, showKind, summary, title, to }: GameHomeIndexLinkProps) {
  const summaryId = useId();

  return (
    <Link className={`${styles.root} ${styles[kind]}`} aria-label={title} aria-describedby={summary ? summaryId : undefined} data-game-home-entry data-resource-kind={kind} to={to}>
      <span className={styles.text}>
        {showKind ? <span className={styles.kind}>{kind}</span> : null}
        <span className={styles.title}>{title}</span>
        {summary ? <span className={styles.summary} id={summaryId}>{summary}</span> : null}
      </span>
      <span className={styles.arrow} aria-hidden="true">↗</span>
    </Link>
  );
}
