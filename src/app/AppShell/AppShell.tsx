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
          <svg className={styles.brandMark} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M7 27V5H18C22.4 5 25 7.5 25 11.5S22.4 18 18 18H7M16 18L26 27" />
            <circle cx="7" cy="5" r="2.5" />
            <circle cx="7" cy="18" r="2" />
          </svg>
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
