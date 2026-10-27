import { useIsPresent, type Variants } from 'motion/react';
import * as m from 'motion/react-m';
import { useId, useLayoutEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { ReferenceContent } from '../ReferenceContent';
import { useReference } from '../useReference';
import styles from './ReferenceSheet.module.css';

const sheetOffset = { x: 'var(--sheet-offset-x, 32px)', y: 'var(--sheet-offset-y, 0px)' };
const sheetVariants: Variants = {
  enter: { ...sheetOffset, opacity: 1, '--backdrop-opacity': 0 },
  open: {
    x: 0, y: 0, opacity: 1, '--backdrop-opacity': 1,
    transition: { duration: 0.32, ease: [0.22, 0.61, 0.36, 1] },
  },
  exit: {
    ...sheetOffset, opacity: 0, '--backdrop-opacity': 0,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
  still: { x: 0, y: 0, opacity: 1, '--backdrop-opacity': 1, transition: { duration: 0 } },
  gone: { x: 0, y: 0, opacity: 0, '--backdrop-opacity': 0, transition: { duration: 0 } },
};

export function ReferenceSheet() {
  const navigate = useNavigate();
  const { gameId, game, reference } = useReference();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const backdropPressed = useRef(false);
  const closeRequested = useRef(false);
  const isPresent = useIsPresent();
  const reduceMotion = usePrefersReducedMotion();
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useLayoutEffect(() => {
    dialogRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    closeButtonRef.current?.focus({ preventScroll: true });
  }, [reference]);

  useLayoutEffect(() => {
    if (isPresent) closeRequested.current = false;
  }, [isPresent]);

  if (!game || !reference) return null;

  function close() {
    if (!isPresent || closeRequested.current) return;
    closeRequested.current = true;
    navigate(-1);
  }

  function outsideSheet(event: MouseEvent<HTMLDialogElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.target === event.currentTarget &&
      (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom);
  }

  // Keep Tab within the sheet, including table scrollers and expanded disclosures.
  // Native modality also prevents pointer, programmatic, and assistive-tech access behind it.
  function containTab(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const elements = [...event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
    )].filter(element => element.getClientRects().length > 0 &&
      (!element.closest('details:not([open])') || element.matches('summary')));
    const first = elements[0];
    const last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <m.dialog
      ref={dialogRef}
      className={styles.sheet}
      aria-labelledby={titleId}
      data-exiting={!isPresent ? true : undefined}
      variants={sheetVariants}
      initial={reduceMotion ? false : 'enter'}
      animate={reduceMotion ? 'still' : 'open'}
      exit={reduceMotion ? 'gone' : 'exit'}
      onPointerDown={(event) => { backdropPressed.current = outsideSheet(event); }}
      onClick={(event) => { if (backdropPressed.current && outsideSheet(event)) close(); }}
      onClickCapture={(event) => {
        if (!isPresent) { event.preventDefault(); event.stopPropagation(); }
      }}
      onKeyDown={containTab}
      onCancel={(event) => { event.preventDefault(); close(); }}
    >
      <header className={styles.header}>
        <h1 id={titleId}>{reference.title}</h1>
        <button ref={closeButtonRef} type="button" onClick={close} aria-label={`Close ${reference.title}`}>
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <div className={styles.body}>
        <ReferenceContent gameId={gameId} presentation="sheet" reference={reference} />
      </div>
    </m.dialog>
  );
}
