import type { ResolvedSource } from '../../content/schema';

import styles from './SourceDetails.module.css';

interface SourceDetailsProps {
  source: ResolvedSource;
}

export function SourceDetails({ source }: SourceDetailsProps) {
  return (
    <dl className={styles.root}>
      <div>
        <dt>Edition</dt>
        <dd>{source.publication.edition}</dd>
      </div>
      <div>
        <dt>Section</dt>
        <dd>{source.section}</dd>
      </div>
      {source.pages?.length ? (
        <div>
          <dt>{source.pages.length === 1 ? 'Page' : 'Pages'}</dt>
          <dd>{source.pages.join(', ')}</dd>
        </div>
      ) : null}
      <div className={styles.verification}>
        <dt>Attribution</dt>
        <dd><details><summary>Source and license</summary>
          <p><a href={source.publication.url}>{source.publication.title}</a> — {source.publication.creator}
            {source.publication.publisher ? `; published by ${source.publication.publisher}` : ''}.</p>
          <p>{source.licensing.copyright}</p>
          <p>{source.licensing.attribution}</p>
          <p><a href={source.licensing.license.url}>{source.licensing.license.name}</a></p>
          <p>{source.licensing.adaptation}</p>
        </details></dd>
      </div>
    </dl>
  );
}
