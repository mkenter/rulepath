import { Route, Routes, useLocation } from 'react-router-dom';

import { AppShell } from '../AppShell';
import { GameHomePage } from '../../features/game-home/GameHomePage';
import { LibraryPage } from '../../features/library/LibraryPage';
import { NotFoundPage } from '../../features/not-found/NotFoundPage';
import { ProcedurePage } from '../../features/procedure/ProcedurePage';
import { ReferencePage } from '../../features/reference/ReferencePage';
import { ReferenceSheet } from '../../features/reference/ReferenceSheet';
import { SearchPage } from '../../features/search/SearchPage';
import { backgroundLocationFromState } from '../../navigation/invocationPath';

export function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = backgroundLocationFromState(location.state);

  return (
    <AppShell>
      <div data-route-content inert={backgroundLocation ? true : undefined}>
        <Routes location={backgroundLocation ?? location}>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/games/:gameId" element={<GameHomePage />} />
          <Route path="/games/:gameId/procedures/:resourceId" element={<ProcedurePage />} />
          <Route path="/games/:gameId/reference/:resourceId" element={<ReferencePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      {backgroundLocation ? (
        <Routes>
          <Route path="/games/:gameId/reference/:resourceId" element={<ReferenceSheet />} />
        </Routes>
      ) : null}
    </AppShell>
  );
}
