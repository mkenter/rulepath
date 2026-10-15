import type { PropsWithChildren } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { SearchIcon } from '../../components/SearchIcon';
import { PwaUpdatePrompt } from '../PwaUpdatePrompt';
import styles from './AppShell.module.css';

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const gameMatch = location.pathname.match(/^\/games\/([^/]+)/);
  const currentSearchGame =
    location.pathname === '/search' ? new URLSearchParams(location.search).get('game') : null;
  const searchGameId = gameMatch?.[1] ?? currentSearchGame;
  const searchPath = searchGameId
    ? `/search?game=${encodeURIComponent(searchGameId)}`
    : '/search';

  return (
    <div className={styles.root}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>
      <header className={styles.topBar}>
        <Link className={styles.brandLink} to="/" aria-label="Rulepath library">
          <span className={styles.brandMark} aria-hidden="true">R</span>
          <span>Rulepath</span>
        </Link>
        <nav className={styles.primaryNav} aria-label="Primary navigation">
          <NavLink to={searchPath}><SearchIcon /> Search</NavLink>
        </nav>
      </header>
      <main className={styles.main} id="main-content" tabIndex={-1}>{children}</main>
      <PwaUpdatePrompt />
    </div>
  );
}
