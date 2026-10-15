import { useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

import styles from './PwaUpdatePrompt.module.css';

export function PwaUpdatePrompt() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [updateServiceWorker] = useState(() =>
    registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedsRefresh(true),
    }),
  );

  if (!needsRefresh) return null;

  return (
    <aside className={styles.root} aria-label="Application update available">
      <p>A fresh offline version is ready.</p>
      <div>
        <button type="button" onClick={() => void updateServiceWorker(true)}>Update now</button>
        <button type="button" className={styles.dismiss} onClick={() => setNeedsRefresh(false)}>
          Later
        </button>
      </div>
    </aside>
  );
}
