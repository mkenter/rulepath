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
      <Breadcrumbs
        items={[
          { label: 'Library', to: '/' },
          { label: game.details.title, to: `/games/${gameId}` },
          { label: procedure.title },
        ]}
      />
      <InvocationPath path={invocationPath} />
      <PageHeader title={procedure.title} summary={procedure.summary} />
      <div className={styles.layout} data-procedure-layout>
        <SemanticProcedureRenderer
          gameId={gameId}
          invocationPath={invocationPath}
          procedure={procedure}
          procedureTitles={procedureTitles}
        />
        <aside className={styles.support} aria-label={`${procedure.title} supporting rules`}>
          {procedure.keyRules.length ? (
            <section className={styles.key} aria-labelledby="key-rules-heading">
              <h2 id="key-rules-heading">Key Rules</h2>
              <ul>{procedure.keyRules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
            </section>
          ) : null}
          {procedure.references.length ? (
            <section aria-labelledby="references-heading">
              <h2 id="references-heading">References</h2>
              <ul className={styles.links}>
                {procedure.references.map((referenceId) => {
                  const reference = game.references.get(referenceId);
                  return reference ? (
                    <li key={reference.id}>
                      <Link to={`/games/${gameId}/reference/${reference.id}`} state={{ backgroundLocation: location }}>
                        {reference.title}
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
                    <Link to={`/games/${gameId}/procedures/${related.id}`}>{related.title}</Link>
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
    </div>
  );
}
