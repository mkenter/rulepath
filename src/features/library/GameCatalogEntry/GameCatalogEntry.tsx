import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import styles from './GameCatalogEntry.module.css';

interface GameCatalogEntryProps {
  accent?: string;
  compact?: boolean;
  number: number;
  procedureCount: number;
  publisher?: string;
  referenceCount: number;
  summary?: string;
  title: string;
  to: string;
}

export function GameCatalogEntry({ accent, compact = false, number, procedureCount, publisher, referenceCount, summary, title, to }: GameCatalogEntryProps) {
  const style = accent ? ({ '--catalog-accent': accent } as CSSProperties) : undefined;

  return (
    <Link className={`${styles.root}${compact ? ` ${styles.compact}` : ''}`} data-library-game style={style} to={to}>
      <span className={styles.number} aria-hidden="true">{number.toString().padStart(2, '0')}</span>
      <span className={styles.body}>
        <span className={styles.identity}>
          <span className={styles.title} data-game-title>{title}</span>
          {publisher ? <span className={styles.publisher} data-game-publisher>{publisher}</span> : null}
        </span>
        {summary ? <span className={styles.summary}>{summary}</span> : null}
        <span className={styles.footer}>
          <span className={styles.counts} data-game-counts>
            <span>{procedureCount} {procedureCount === 1 ? 'procedure' : 'procedures'}</span>
            <span aria-hidden="true">/</span>
            <span>{referenceCount} {referenceCount === 1 ? 'reference' : 'references'}</span>
          </span>
          <span className={styles.explore}>Explore game</span>
        </span>
      </span>
      <svg className={styles.arrow} viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <path d="M10 40H66M46 20L66 40L46 60" />
      </svg>
    </Link>
  );
}
