import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { IndexRow } from '../../../components/IndexRow';
import { SearchIcon } from '../../../components/SearchIcon';
import { contentRegistry } from '../../../content/bundled-content';
import { createSearchIndex, searchContent } from '../searchIndex';
import styles from './SearchPage.module.css';

const searchIndex = createSearchIndex(contentRegistry);

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
  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    if (query.trim() === routeQuery) return;
    const timeout = window.setTimeout(() => updateRouteQuery(query), 180);
    return () => window.clearTimeout(timeout);
  }, [query, routeQuery, scopedGame?.details.id]);

  function updateRouteQuery(nextQuery: string) {
    const trimmed = nextQuery.trim();
    const nextParams: Record<string, string> = {};
    if (scopedGame) nextParams.game = scopedGame.details.id;
    if (trimmed) nextParams.q = trimmed;
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
        {scopedGame ? (
          <div className={styles.scope} role="group" aria-label="Active search filters">
            <span>Searching within</span>
            <button
              className={styles.scopePill}
              type="button"
              onClick={removeGameScope}
              aria-label={`Remove ${scopedGame.details.title} filter and search all games`}
            >
              <span>{scopedGame.details.title}</span>
              <span className={styles.remove} aria-hidden="true">
                <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M3.5 3.5l9 9m0-9l-9 9" /></svg>
              </span>
            </button>
          </div>
        ) : (
          <p className={`${styles.scope} ${styles.globalScope}`}>Searching all games</p>
        )}
      </form></div>
      <section className={styles.results} aria-labelledby="search-results-heading" aria-live="polite">
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
