import { useEffect } from 'react';

import { contentRegistry } from '../../../content/bundled-content';
import { GameCatalogEntry } from '../GameCatalogEntry';
import styles from './LibraryPage.module.css';

export function LibraryPage() {
  const gameCount = contentRegistry.games.length;

  useEffect(() => {
    document.title = 'Library | Rulepath';
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Game library</p>
            <h1>Library</h1>
          </div>
          <p className={styles.count}>{gameCount} {gameCount === 1 ? 'game' : 'games'} available</p>
        </header>
        <section className={styles.index} aria-label="Games">
          <ul>
            {contentRegistry.games.map((game) => (
              <li key={game.details.id}>
                <GameCatalogEntry
                  accent={game.details.accent}
                  procedureCount={game.procedures.size}
                  publisher={game.details.publisher}
                  referenceCount={game.references.size}
                  summary={game.details.summary}
                  title={game.details.title}
                  to={`/games/${game.details.id}`}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
