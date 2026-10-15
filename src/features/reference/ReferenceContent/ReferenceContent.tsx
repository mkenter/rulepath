import { Link } from 'react-router-dom';

import { SourceDetails } from '../../../components/SourceDetails';
import { contentRegistry } from '../../../content/bundled-content';
import { resolveSource } from '../../../content/registry';
import type { Reference } from '../../../content/schema';
import styles from './ReferenceContent.module.css';

interface ReferenceContentProps {
  gameId: string;
  presentation?: 'page' | 'sheet';
  reference: Reference;
}

export function ReferenceContent({
  gameId,
  presentation = 'page',
  reference,
}: ReferenceContentProps) {
  const game = contentRegistry.getGame(gameId);
  if (!game) return null;
  const sectionClassName = `${styles.section}${presentation === 'page' ? ` ${styles.page}` : ''}`;
  const sourceClassName = `${styles.source}${presentation === 'page' ? ` ${styles.page}` : ''}`;

  return (
    <>
      <p className={styles.summary}>{reference.summary}</p>
      {reference.related.length ? (
        <section className={sectionClassName} aria-labelledby="reference-related-heading">
          <h2 id="reference-related-heading">Related</h2>
          <ul className={styles.links}>
            {reference.related.map((related) => {
              if ('procedure' in related) {
                const procedure = game?.procedures.get(related.procedure);
                return procedure ? (
                  <li key={`procedure-${procedure.id}`}>
                    <Link to={`/games/${gameId}/procedures/${procedure.id}`}>{procedure.title}</Link>
                  </li>
                ) : null;
              }

              const relatedReference = game?.references.get(related.reference);
              return relatedReference ? (
                <li key={`reference-${relatedReference.id}`}>
                  <Link to={`/games/${gameId}/reference/${relatedReference.id}`}>{relatedReference.title}</Link>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      ) : null}
      <section className={sourceClassName} aria-labelledby="reference-source-heading">
        <h2 id="reference-source-heading">Source</h2>
        <SourceDetails source={resolveSource(game.details.source, reference.source)} />
      </section>
    </>
  );
}
