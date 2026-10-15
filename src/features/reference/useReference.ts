import { useParams } from 'react-router-dom';

import { contentRegistry } from '../../content/bundled-content';

export function useReference() {
  const { gameId = '', resourceId = '' } = useParams();
  return {
    gameId,
    game: contentRegistry.getGame(gameId),
    reference: contentRegistry.getReference(gameId, resourceId),
  };
}
