import { useId, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import styles from './GameCatalogEntry.module.css';

interface GameCatalogEntryProps {
  accent?: string;
  procedureCount: number;
  publisher?: string;
  referenceCount: number;
  summary?: string;
  title: string;
  to: string;
}

export function GameCatalogEntry({ accent, procedureCount, publisher, referenceCount, summary, title, to }: GameCatalogEntryProps) {
  const style = accent ? ({ '--catalog-accent': accent } as CSSProperties) : undefined;

  const titleId = useId();

  return (
    <Link className={styles.root} aria-labelledby={titleId} data-library-game style={style} to={to}>
      <div className={styles.identity}>
        {publisher ? <p className={styles.publisher} data-game-publisher>{publisher}</p> : null}
        <h2 className={styles.title} data-game-title id={titleId}>{title}</h2>
      </div>
      {summary ? <p className={styles.summary}>{summary}</p> : null}
      <div className={styles.metadata}>
        <div className={styles.counts} data-game-counts>
          <span>{procedureCount} {procedureCount === 1 ? 'procedure' : 'procedures'}</span>
          <span>{referenceCount} {referenceCount === 1 ? 'reference' : 'references'}</span>
        </div>
        <span className={styles.explore}>Open game</span>
      </div>
    </Link>
  );
}
