import { Link } from 'react-router-dom';

import { PageHeader } from '../../../components/PageHeader';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.root}>
      <PageHeader
        eyebrow="Not found"
        title="That rules entry is not in this library"
        summary="The address may be incomplete, or the content may not be bundled yet."
      />
      <Link className={styles.link} to="/">Return to Library</Link>
    </div>
  );
}
