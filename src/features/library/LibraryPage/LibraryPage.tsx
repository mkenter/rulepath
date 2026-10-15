import { PageHeader } from '../../../components/PageHeader';
import { contentRegistry } from '../../../content/bundled-content';
import { GameCatalogEntry } from '../GameCatalogEntry';
import styles from './LibraryPage.module.css';

export function LibraryPage() {
  return (
    <div className={styles.root}>
      <PageHeader title="Library" summary="Choose a game to browse its rules." />
      <section className={styles.index} aria-label="Games">
        <ul>
          {contentRegistry.games.map((game) => (
            <li key={game.details.id}>
              <GameCatalogEntry
                accent={game.details.accent}
                procedureCount={game.procedures.size}
                publisher={game.details.publisher}
                referenceCount={game.references.size}
                title={game.details.title}
                to={`/games/${game.details.id}`}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
