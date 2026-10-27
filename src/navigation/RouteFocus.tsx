import { useLayoutEffect, useRef } from 'react';
import { useNavigationType, type Location } from 'react-router-dom';

interface Position {
  x: number;
  y: number;
  href?: string;
  nodeId?: string;
  id?: string;
}

export function RouteFocus({ location, suspended = false }: { location: Location; suspended?: boolean }) {
  const { key, pathname } = location;
  const navigationType = useNavigationType();
  const action = useRef(navigationType);
  action.current = navigationType;
  const positions = useRef(new Map<string, Position>());
  const previousEntry = useRef<{ key: string; pathname: string } | undefined>(undefined);
  const wasSuspended = useRef(false);

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    // A native dialog keeps focus until AnimatePresence has removed it after its exit.
    if (suspended) {
      wasSuspended.current = true;
      return;
    }
    const resuming = wasSuspended.current;
    wasSuspended.current = false;
    const content = document.querySelector<HTMLElement>('[data-route-content]');
    if (!content) return;
    const replacingQuery = action.current === 'REPLACE' && previousEntry.current?.pathname === pathname;
    const savedKey = replacingQuery ? previousEntry.current!.key : key;
    const saved = action.current === 'POP' || replacingQuery ? positions.current.get(savedKey) : undefined;
    const links = [...content.querySelectorAll<HTMLAnchorElement>('a[href]')];
    const returnLink = saved?.href ? links.find(link =>
      link.getAttribute('href') === saved.href &&
      (!saved.nodeId || link.closest<HTMLElement>('[data-flow-node-id]')?.dataset.flowNodeId === saved.nodeId),
    ) : undefined;
    const destination = (saved?.id ? content.querySelector<HTMLElement>(`#${CSS.escape(saved.id)}`) : null)
      ?? returnLink ?? content.querySelector<HTMLElement>('input[type="search"]')
      ?? content.querySelector<HTMLElement>('h1');
    if (!replacingQuery && (previousEntry.current !== undefined || pathname === '/search' || resuming)) {
      if (destination) {
        if (destination.tagName === 'H1') destination.tabIndex = -1;
        destination.focus({ preventScroll: true });
      }
      window.scrollTo({ left: saved?.x ?? 0, top: saved?.y ?? 0, behavior: 'instant' });
    }
    previousEntry.current = { key, pathname };
    let position: Position = { ...saved, x: saved?.x ?? window.scrollX, y: saved?.y ?? window.scrollY };
    const rememberScroll = () => { position.x = window.scrollX; position.y = window.scrollY; };
    const rememberFocus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      position = { ...position, href: link?.getAttribute('href') ?? undefined,
        nodeId: link?.closest<HTMLElement>('[data-flow-node-id]')?.dataset.flowNodeId,
        id: event.target.id || undefined };
    };
    window.addEventListener('scroll', rememberScroll, { passive: true });
    content.addEventListener('focusin', rememberFocus);
    return () => {
      positions.current.set(key, position);
      if (positions.current.size > 60) positions.current.delete(positions.current.keys().next().value!);
      window.removeEventListener('scroll', rememberScroll);
      content.removeEventListener('focusin', rememberFocus);
    };
  }, [key, pathname, suspended]);

  return null;
}
