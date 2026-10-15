import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import styles from './GameCatalogEntry.module.css';

interface GameCatalogEntryProps {
  accent?: string;
  procedureCount: number;
  publisher?: string;
  referenceCount: number;
  title: string;
  to: string;
}

export function GameCatalogEntry({
  accent,
  procedureCount,
  publisher,
  referenceCount,
  title,
  to,
}: GameCatalogEntryProps) {
  const style = accent
    ? ({ '--catalog-accent': accent } as CSSProperties)
    : undefined;

  return (
    <Link className={styles.root} data-library-game style={style} to={to}>
      <span className={styles.identity}>
        <span className={styles.title} data-game-title>{title}</span>
        {publisher ? <span className={styles.publisher} data-game-publisher>{publisher}</span> : null}
      </span>
      <span className={styles.counts} data-game-counts>
        <span>{procedureCount} procedures</span>
        <span className={styles.separator} aria-hidden="true">·</span>
        <span>{referenceCount} references</span>
      </span>
    </Link>
  );
}
