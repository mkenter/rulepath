import { Link, useLocation } from 'react-router-dom';

import { SourceDetails } from '../../../components/SourceDetails';
import { contentRegistry } from '../../../content/bundled-content';
import { resolveSource } from '../../../content/registry';
import type { Reference } from '../../../content/schema';
import styles from './ReferenceContent.module.css';
import { backgroundLocationFromState } from '../../../navigation/invocationPath';

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
  const location = useLocation();
  const backgroundLocation = backgroundLocationFromState(location.state);
  const game = contentRegistry.getGame(gameId);
  if (!game) return null;
  const sectionClassName = `${styles.section}${presentation === 'page' ? ` ${styles.page}` : ''}`;
  const sourceClassName = `${styles.source}${presentation === 'page' ? ` ${styles.page}` : ''}`;

  return (
    <>
      <p className={styles.summary}>{reference.summary}</p>
      {reference.sections?.map((section, index) => (
        <section className={sectionClassName} key={index} aria-labelledby={`reference-section-${index}`}>
          <h2 id={`reference-section-${index}`}>{section.heading}</h2>
          {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
          {section.bullets.length ? <ul>{section.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}</ul> : null}
          {section.table ? (
            <div className={styles.tableScroll} role="region" aria-label={section.heading} tabIndex={0}>
              <table>
                <caption>{section.heading}</caption>
                <thead><tr>{section.table.columns.map((column, columnIndex) => <th scope="col" key={columnIndex}>{column}</th>)}</tr></thead>
                <tbody>{section.table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : null}
        </section>
      ))}
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
                  <Link to={`/games/${gameId}/reference/${relatedReference.id}`}
                    replace={presentation === 'sheet'}
                    state={presentation === 'sheet' ? { backgroundLocation } : undefined}>{relatedReference.title}</Link>
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
