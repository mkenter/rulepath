import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { ReferenceContent } from '../ReferenceContent';
import { useReference } from '../useReference';
import styles from './ReferenceSheet.module.css';

export function ReferenceSheet() {
  const navigate = useNavigate();
  const { gameId, game, reference } = useReference();
  const sheetRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!game || !reference) return;
    const returnTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      returnTarget?.focus();
    };
  }, [game, reference]);

  if (!game || !reference) return null;

  function close() {
    navigate(-1);
  }

  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) close();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [...(sheetRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
    ) ?? [])].filter(element => !element.closest('details:not([open])') || element.matches('summary'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={handleBackdrop}>
      <section
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-sheet-title"
        onKeyDown={handleKeyDown}
      >
        <header className={styles.header}>
          <div>
            <p>Reference</p>
            <h1 id="reference-sheet-title">{reference.title}</h1>
          </div>
          <button ref={closeButtonRef} type="button" onClick={close} aria-label={`Close ${reference.title}`}>
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className={styles.body}>
          <ReferenceContent gameId={gameId} presentation="sheet" reference={reference} />
        </div>
      </section>
    </div>
  );
}
