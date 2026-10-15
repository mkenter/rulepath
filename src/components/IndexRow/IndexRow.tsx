import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import styles from './IndexRow.module.css';

type IndexRowVariant = 'compact' | 'search';

interface IndexRowProps {
  ariaLabel?: string;
  meta?: ReactNode;
  summary?: string;
  title: string;
  to: string;
  variant?: IndexRowVariant;
}

export function IndexRow({ ariaLabel, meta, summary, title, to, variant }: IndexRowProps) {
  const className = `${styles.root}${variant ? ` ${styles[variant]}` : ''}`;

  return (
    <Link aria-label={ariaLabel} className={className} data-index-row={variant} to={to}>
      <span className={styles.content}>
        <span className={styles.title} data-index-row-title>{title}</span>
        {summary ? <span className={styles.summary}>{summary}</span> : null}
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </span>
    </Link>
  );
}
