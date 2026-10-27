import { AnimatePresence, domAnimation, LazyMotion } from 'motion/react';
import { useLayoutEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { AppShell } from '../AppShell';
import { GameHomePage } from '../../features/game-home/GameHomePage';
import { LibraryPage } from '../../features/library/LibraryPage';
import { NotFoundPage } from '../../features/not-found/NotFoundPage';
import { ProcedurePage } from '../../features/procedure/ProcedurePage';
import { ReferencePage } from '../../features/reference/ReferencePage';
import { ReferenceSheet } from '../../features/reference/ReferenceSheet';
import { SearchPage } from '../../features/search/SearchPage';
import { RouteFocus } from '../../navigation/RouteFocus';
import { backgroundLocationFromState } from '../../navigation/invocationPath';

export function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = backgroundLocationFromState(location.state);
  const [hasSheet, setHasSheet] = useState(Boolean(backgroundLocation));
  const sheetActive = Boolean(backgroundLocation) || hasSheet;

  useLayoutEffect(() => {
    if (backgroundLocation && !hasSheet) setHasSheet(true);
  }, [backgroundLocation, hasSheet]);

  return (
    <AppShell>
      <RouteFocus location={backgroundLocation ?? location} suspended={sheetActive} />
      <div data-route-content inert={sheetActive ? true : undefined}>
        <Routes location={backgroundLocation ?? location}>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/games/:gameId" element={<GameHomePage />} />
          <Route path="/games/:gameId/procedures/:resourceId" element={<ProcedurePage />} />
          <Route path="/games/:gameId/reference/:resourceId" element={<ReferencePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      <LazyMotion features={domAnimation} strict>
        <AnimatePresence initial={false} onExitComplete={() => setHasSheet(false)}>
          {backgroundLocation ? (
            // Freeze the exiting route's context; the URL can already point at its destination.
            <Routes key={backgroundLocation.key} location={location}>
              <Route path="/games/:gameId/reference/:resourceId" element={<ReferenceSheet />} />
            </Routes>
          ) : null}
        </AnimatePresence>
      </LazyMotion>
    </AppShell>
  );
}
