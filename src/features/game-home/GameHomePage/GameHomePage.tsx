import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { contentRegistry } from '../../../content/bundled-content';
import type { SectionItem } from '../../../content/schema';
import { NotFoundPage } from '../../not-found/NotFoundPage';
import { GameHomeIndexLink } from '../GameHomeIndexLink';
import styles from './GameHomePage.module.css';

function sectionItemDetails(gameId: string, item: SectionItem) {
  if ('procedure' in item) {
    const procedure = contentRegistry.getProcedure(gameId, item.procedure);
    return procedure
      ? { kind: 'procedure' as const, title: procedure.title, summary: procedure.summary, path: `/games/${gameId}/procedures/${procedure.id}` }
      : undefined;
  }

  const reference = contentRegistry.getReference(gameId, item.reference);
  return reference
    ? { kind: 'reference' as const, title: reference.title, summary: undefined, path: `/games/${gameId}/reference/${reference.id}` }
    : undefined;
}

function isReferenceSection(items: readonly SectionItem[]) {
  return items.length > 0 && items.every((item) => 'reference' in item);
}

export function GameHomePage() {
  const { gameId = '' } = useParams();
  const game = contentRegistry.getGame(gameId);

  useEffect(() => {
    if (game) document.title = `${game.details.title} | Rulepath`;
  }, [game]);

  if (!game) return <NotFoundPage />;

  const indexedSections = game.sections.map((section, index) => ({
    ...section,
    number: index + 1,
    referenceOnly: isReferenceSection(section.items),
    mixed: section.items.some((item) => 'procedure' in item) && section.items.some((item) => 'reference' in item),
  }));
  const mainSections = indexedSections.filter((section) => !section.referenceOnly);
  const referenceSections = indexedSections.filter((section) => section.referenceOnly);

  function renderSection(section: (typeof indexedSections)[number]) {
    const count = section.items.length;
    const resourceKind = section.mixed ? 'resource' : section.referenceOnly ? 'reference' : 'procedure';

    return (
      <section className={styles.section} key={section.id} aria-labelledby={section.id}>
        <div className={styles.sectionHeading}>
          <span className={styles.ordinal} aria-hidden="true">{section.number.toString().padStart(2, '0')}</span>
          <h2 id={section.id} tabIndex={-1}>{section.title}</h2>
          <span className={styles.sectionCount}>{count} {resourceKind}{count === 1 ? '' : 's'}</span>
        </div>
        <ul className={styles.list} data-game-home-reference-list={section.referenceOnly ? '' : undefined}>
          {section.items.map((item) => {
            const details = sectionItemDetails(gameId, item);
            if (!details) return null;
            return (
              <li key={details.path}>
                <GameHomeIndexLink
                  kind={details.kind}
                  showKind={section.mixed}
                  summary={details.summary}
                  title={details.title}
                  to={details.path}
                />
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <div className={styles.root} data-game-home>
      <div className={styles.inner}>
        <div className={styles.breadcrumbs}>
          <Breadcrumbs items={[{ label: 'Library', to: '/' }, { label: game.details.title }]} />
        </div>
        <header className={styles.titleZone} data-game-home-title>
          <p className={styles.eyebrow}>Game guide</p>
          <h1>{game.details.title}</h1>
          {game.details.summary ? <p className={styles.summary}>{game.details.summary}</p> : null}
          <div className={styles.metadata}>
            {game.details.publisher ? <span>{game.details.publisher}</span> : null}
            <span>{game.procedures.size} {game.procedures.size === 1 ? 'procedure' : 'procedures'} <span className={styles.separator} aria-hidden="true">/</span> {game.references.size} {game.references.size === 1 ? 'reference' : 'references'}</span>
          </div>
        </header>
        {indexedSections.length ? (
          <nav className={styles.jumpNav} aria-label="On this page">
            <span className={styles.jumpLabel}>On this page</span>
            {indexedSections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>{section.title}</a>
            ))}
          </nav>
        ) : null}
        <nav className={styles.contents} aria-label={`${game.details.title} contents`}>
          <div className={`${styles.sectionColumns}${mainSections.length && referenceSections.length ? ` ${styles.hasReferences}` : ''}`} data-game-home-sections>
            {mainSections.length ? <div className={styles.mainSections}>{mainSections.map(renderSection)}</div> : null}
            {referenceSections.length ? <div className={styles.referenceSections}>{referenceSections.map(renderSection)}</div> : null}
          </div>
        </nav>
      </div>
    </div>
  );
}
