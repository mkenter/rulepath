import { useParams } from 'react-router-dom';

import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { PageHeader } from '../../../components/PageHeader';
import { contentRegistry } from '../../../content/bundled-content';
import type { SectionItem } from '../../../content/schema';
import { NotFoundPage } from '../../not-found/NotFoundPage';
import { GameHomeIndexLink } from '../GameHomeIndexLink';
import styles from './GameHomePage.module.css';

function sectionItemDetails(gameId: string, item: SectionItem) {
  if ('procedure' in item) {
    const procedure = contentRegistry.getProcedure(gameId, item.procedure);
    return procedure
      ? {
          kind: 'procedure' as const,
          title: procedure.title,
          path: `/games/${gameId}/procedures/${procedure.id}`,
        }
      : undefined;
  }

  const reference = contentRegistry.getReference(gameId, item.reference);
  return reference
    ? {
        kind: 'reference' as const,
        title: reference.title,
        path: `/games/${gameId}/reference/${reference.id}`,
      }
    : undefined;
}

function isReferenceSection(items: readonly SectionItem[]) {
  return items.every((item) => 'reference' in item);
}

export function GameHomePage() {
  const { gameId = '' } = useParams();
  const game = contentRegistry.getGame(gameId);

  if (!game) return <NotFoundPage />;

  return (
    <div className={styles.root} data-game-home>
      <Breadcrumbs items={[{ label: 'Library', to: '/' }, { label: game.details.title }]} />
      <div className={styles.titleZone} data-game-home-title>
        <PageHeader title={game.details.title} summary={game.details.summary} />
        <p className={styles.metadata}>
          {game.details.publisher ? <span>{game.details.publisher}</span> : null}
          <span>
            {game.procedures.size} procedures <span aria-hidden="true">·</span>{' '}
            {game.references.size} references
          </span>
        </p>
      </div>
      <nav className={styles.contents} aria-label={`${game.details.title} contents`}>
        <div className={styles.sectionColumns} data-game-home-sections>
          {game.sections.map((section) => {
            const isReference = isReferenceSection(section.items);
            const sectionTitle = isReference ? 'References' : section.title;
            return (
              <section
                className={`${styles.section}${isReference ? ` ${styles.referenceSection}` : ''}`}
                key={section.id}
                aria-labelledby={section.id}
              >
                <h2 id={section.id}>
                  <span>{sectionTitle}</span>
                </h2>
                <ul
                  className={styles.list}
                  data-game-home-reference-list={isReference ? '' : undefined}
                >
                  {section.items.map((item) => {
                    const details = sectionItemDetails(gameId, item);
                    if (!details) return null;
                    return (
                      <li key={details.path}>
                        <GameHomeIndexLink
                          kind={details.kind}
                          title={details.title}
                          to={details.path}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
