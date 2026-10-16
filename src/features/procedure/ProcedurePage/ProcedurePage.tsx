import type { MouseEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { PageHeader } from '../../../components/PageHeader';
import { SourceDetails } from '../../../components/SourceDetails';
import { contentRegistry } from '../../../content/bundled-content';
import { resolveSource } from '../../../content/registry';
import { invocationPathFromState } from '../../../navigation/invocationPath';
import { NotFoundPage } from '../../not-found/NotFoundPage';
import { InvocationPath } from '../InvocationPath';
import { SemanticProcedureRenderer } from '../SemanticProcedureRenderer';
import styles from './ProcedurePage.module.css';

// Section jumps should not add history entries or discard invocation state.
// Focusing the destination also gives keyboard readers a useful next Tab stop.
function jumpToSection(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = document.getElementById(event.currentTarget.hash.slice(1));
  if (!target) return;
  event.preventDefault();
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'start' });
}

export function ProcedurePage() {
  const { gameId = '', resourceId = '' } = useParams();
  const location = useLocation();
  const game = contentRegistry.getGame(gameId);
  const procedure = contentRegistry.getProcedure(gameId, resourceId);

  if (!game || !procedure) return <NotFoundPage />;

  const invocationPath = invocationPathFromState(location.state, gameId, procedure.id);
  const procedureTitles = new Map([...game.procedures.values()].map((entry) => [entry.id, entry.title]));
  const diagramProcedureTargets = new Set(
    procedure.nodes.flatMap((node) => (node.type === 'procedure' ? [node.target] : [])),
  );
  const relatedProcedures = procedure.related.flatMap((relatedId) => {
    const related = game.procedures.get(relatedId);
    return related && !diagramProcedureTargets.has(relatedId) ? [related] : [];
  });

  return (
    <div className={styles.root}>
      <div className={styles.reading}>
        <Breadcrumbs
          items={[
            { label: 'Library', to: '/' },
            { label: game.details.title, to: `/games/${gameId}` },
          ]}
        />
        <PageHeader surface="paper" title={procedure.title} summary={procedure.summary} />
        <InvocationPath path={invocationPath} />
        <nav className={styles.sectionNav} aria-label="On this page">
          <a href="#procedure-flow" onClick={jumpToSection}>Procedure</a>
          {procedure.keyRules.length ? <a href="#key-rules" onClick={jumpToSection}>Key rules</a> : null}
          {procedure.references.length ? <a href="#references" onClick={jumpToSection}>References</a> : null}
        </nav>
        <div className={styles.layout} data-procedure-layout>
          <SemanticProcedureRenderer
            gameId={gameId}
            invocationPath={invocationPath}
            procedure={procedure}
            procedureTitles={procedureTitles}
          />
          <aside className={styles.support} aria-label={`${procedure.title} supporting rules`}>
            {procedure.keyRules.length ? (
              <section className={styles.key} id="key-rules" tabIndex={-1} aria-labelledby="key-rules-heading">
                <h2 id="key-rules-heading">Key Rules</h2>
                <ul>{procedure.keyRules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
              </section>
            ) : null}
            {procedure.references.length ? (
              <section id="references" tabIndex={-1} aria-labelledby="references-heading">
                <h2 id="references-heading">References</h2>
                <ul className={styles.links}>
                  {procedure.references.map((referenceId) => {
                    const reference = game.references.get(referenceId);
                    return reference ? (
                      <li key={reference.id}>
                        <Link to={`/games/${gameId}/reference/${reference.id}`} state={{ backgroundLocation: location }}>
                          {reference.title}<span aria-hidden="true">↗</span>
                        </Link>
                      </li>
                    ) : null;
                  })}
                </ul>
              </section>
            ) : null}
            {relatedProcedures.length ? (
              <section aria-labelledby="related-heading">
                <h2 id="related-heading">Related</h2>
                <ul className={styles.links}>
                  {relatedProcedures.map((related) => (
                    <li key={related.id}>
                      <Link to={`/games/${gameId}/procedures/${related.id}`}>{related.title}<span aria-hidden="true">→</span></Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className={styles.source} aria-labelledby="source-heading">
              <h2 id="source-heading">Source</h2>
              <SourceDetails source={resolveSource(game.details.source, procedure.source)} />
            </section>
          </aside>
        </div>
        <a className={styles.backToFlow} href="#procedure-flow" onClick={jumpToSection}>↑ Back to procedure</a>
      </div>
    </div>
  );
}
