import { useEffect } from 'react';

import styles from './PageHeader.module.css';

interface PageHeaderProps {
  surface?: 'dark' | 'paper';
  title: string;
  summary?: string;
}

export function PageHeader({ surface = 'dark', title, summary }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} | Rulepath`;
  }, [title]);

  return (
    <header data-page-header className={`${styles.root}${surface === 'paper' ? ` ${styles.paper}` : ''}`}>
      <h1>{title}</h1>
      {summary ? <p>{summary}</p> : null}
    </header>
  );
}
