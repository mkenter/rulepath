import { useEffect, type ReactNode } from 'react';

import styles from './PageHeader.module.css';

interface PageHeaderProps {
  eyebrow?: ReactNode;
  surface?: 'dark' | 'paper';
  title: string;
  summary?: string;
}

export function PageHeader({ eyebrow, surface = 'dark', title, summary }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} | Rulepath`;
  }, [title]);

  return (
    <header data-page-header className={`${styles.root}${surface === 'paper' ? ` ${styles.paper}` : ''}`}>
      {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
      <h1>{title}</h1>
      {summary ? <p>{summary}</p> : null}
    </header>
  );
}
