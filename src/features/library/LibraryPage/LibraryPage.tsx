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
            <p className={styles.eyebrow}>Rulepath / Game library</p>
            <h1>Library</h1>
            <p className={styles.summary}>Choose a game to browse its rules.</p>
          </div>
          <p className={styles.count}><span>{gameCount.toString().padStart(2, '0')}</span> {gameCount === 1 ? 'game' : 'games'} available</p>
        </header>
        <section className={styles.index} aria-label="Games">
          <ul className={gameCount === 1 ? styles.singleGame : undefined}>
            {contentRegistry.games.map((game, index) => (
              <li key={game.details.id}>
                <GameCatalogEntry
                  compact={gameCount > 1}
                  accent={game.details.accent}
                  number={index + 1}
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
