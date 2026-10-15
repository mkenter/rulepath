import { Link } from 'react-router-dom';

import styles from './GameHomeIndexLink.module.css';

interface GameHomeIndexLinkProps {
  kind: 'procedure' | 'reference';
  title: string;
  to: string;
}

export function GameHomeIndexLink({ kind, title, to }: GameHomeIndexLinkProps) {
  return (
    <Link
      className={`${styles.root} ${styles[kind]}`}
      data-game-home-entry
      data-resource-kind={kind}
      to={to}
    >
      <span>{title}</span>
    </Link>
  );
}
