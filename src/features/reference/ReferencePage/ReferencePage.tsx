import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { PageHeader } from '../../../components/PageHeader';
import { NotFoundPage } from '../../not-found/NotFoundPage';
import { ReferenceContent } from '../ReferenceContent';
import { useReference } from '../useReference';
import styles from './ReferencePage.module.css';

export function ReferencePage() {
  const { gameId, game, reference } = useReference();

  if (!game || !reference) return <NotFoundPage />;

  return (
    <div className={styles.root}>
      <Breadcrumbs
        items={[
          { label: 'Library', to: '/' },
          { label: game.details.title, to: `/games/${gameId}` },
          { label: reference.title },
        ]}
      />
      <article className={styles.content}>
        <PageHeader surface="paper" title={reference.title} />
        <ReferenceContent gameId={gameId} reference={reference} />
      </article>
    </div>
  );
}
