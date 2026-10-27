import { AnimatePresence, domAnimation, LazyMotion, useIsPresent, type Variants } from 'motion/react';
import * as m from 'motion/react-m';
import { forwardRef, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { IndexRow } from '../../../components/IndexRow';
import { SearchIcon } from '../../../components/SearchIcon';
import { contentRegistry } from '../../../content/bundled-content';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { createSearchIndex, searchContent } from '../searchIndex';
import styles from './SearchPage.module.css';

const searchIndex = createSearchIndex(contentRegistry);
const scopeVariants: Variants = {
  enter: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.2, 0.6, 0.3, 1] } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.22, ease: [0.2, 0.6, 0.3, 1] } },
  still: { opacity: 1, y: 0, transition: { duration: 0 } },
  gone: { opacity: 0, y: 0, transition: { duration: 0 } },
};

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeQuery = searchParams.get('q') ?? '';
  const requestedGameId = searchParams.get('game') ?? '';
  const scopedGame = contentRegistry.getGame(requestedGameId);
  const [query, setQuery] = useState(routeQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(
    () => searchContent(searchIndex, query, scopedGame?.details.id),
    [query, scopedGame?.details.id],
  );

  useEffect(() => setQuery(routeQuery), [routeQuery]);
  useEffect(() => { document.title = 'Search | Rulepath'; }, []);

  useEffect(() => {
    if (query.trim() === routeQuery) return;
    const timeout = window.setTimeout(() => updateRouteQuery(query), 180);
    return () => window.clearTimeout(timeout);
  }, [query, routeQuery, scopedGame?.details.id]);

  function updateRouteQuery(nextQuery: string) {
    // A pending debounce must not restore a game scope that was just removed.
    const nextParams = new URLSearchParams(window.location.search);
    const trimmed = nextQuery.trim();
    if (trimmed) nextParams.set('q', trimmed);
    else nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateRouteQuery(query);
  }

  function removeGameScope() {
    const nextParams: Record<string, string> = {};
    if (query.trim()) nextParams.q = query.trim();
    setSearchParams(nextParams, { replace: true });
    inputRef.current?.focus();
  }

  function clearSearch() {
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <div className={styles.root}>
      <div className={styles.inner}><div className={styles.breadcrumbs}><Breadcrumbs items={[{ label: 'Library', to: '/' }, { label: 'Search' }]} /></div>
      <div className={styles.masthead}><header><h1>Search rules</h1><p className={styles.context}>Find a procedure, reference, or passage of rule text.</p></header>
      <form className={styles.form} role="search" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="library-search">Search games, procedures, and references</label>
        <div className={styles.controls}>
          <span className={styles.icon} aria-hidden="true"><SearchIcon /></span>
          <input
            ref={inputRef}
            id="library-search"
            name="q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search procedures, references, or rule text"
            autoComplete="off"
          />
          {query ? (
            <button
              className={styles.clear}
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
        <div className={styles.scope}>
          <LazyMotion features={domAnimation} strict>
            <AnimatePresence initial={false} mode="popLayout">
              <SearchScope
                key={scopedGame?.details.id ?? 'all-games'}
                gameTitle={scopedGame?.details.title}
                onRemove={removeGameScope}
              />
            </AnimatePresence>
          </LazyMotion>
        </div>
      </form></div>
      <p className="visually-hidden" role="status" aria-atomic="true">
        {query.trim() ? `${results.length} ${results.length === 1 ? 'result' : 'results'}${scopedGame ? ` in ${scopedGame.details.title}` : ' across all games'}.` : 'Enter a title, alias, or phrase from a rule.'}
      </p>
      <section className={styles.results} aria-labelledby="search-results-heading">
        <div className={styles.heading}>
          <h2 id="search-results-heading">
            {query.trim() ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'Results'}
          </h2>
        </div>
        {!query.trim() ? (
          <p className={styles.empty}>Enter a title, alias, or phrase from a rule.</p>
        ) : results.length ? (
          <ul>
            {results.map((result) => (
              <li key={result.path}>
                <IndexRow
                  variant="search"
                  to={result.path}
                  ariaLabel={`${result.kind} ${result.title} in ${result.gameTitle}`}
                  title={result.title}
                  summary={result.summary}
                  meta={<>{result.kind} <span aria-hidden="true">·</span> {result.gameTitle}</>}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No bundled rules match “{query.trim()}”.</p>
        )}
      </section></div>
    </div>
  );
}

const SearchScope = forwardRef<HTMLDivElement, { gameTitle?: string; onRemove: () => void }>(
  function SearchScope({ gameTitle, onRemove }, ref) {
    const isPresent = useIsPresent();
    const reduceMotion = usePrefersReducedMotion();
    return (
      <m.div
        ref={ref}
        className={styles.scopeContent}
        role={gameTitle ? 'group' : undefined}
        aria-label={gameTitle ? 'Active search filters' : undefined}
        aria-hidden={!isPresent || undefined}
        inert={!isPresent}
        variants={scopeVariants}
        initial={reduceMotion ? false : 'enter'}
        animate={reduceMotion ? 'still' : 'visible'}
        exit={reduceMotion ? 'gone' : 'exit'}
      >
        {gameTitle ? <>
          <span>Searching within</span>
          <button
            className={styles.scopePill}
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${gameTitle} filter and search all games`}
          >
            <span>{gameTitle}</span>
            <span className={styles.remove} aria-hidden="true">
              <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M3.5 3.5l9 9m0-9l-9 9" /></svg>
            </span>
          </button>
        </> : <p className={styles.globalScope}>Searching all games</p>}
      </m.div>
    );
  },
);
