import { useSyncExternalStore } from 'react';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(reducedMotionQuery);
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}
function getSnapshot() {
  return window.matchMedia?.(reducedMotionQuery).matches ?? true;
}
const getServerSnapshot = () => true;

// Also stop motion when the preference changes while a component is mounted.
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
