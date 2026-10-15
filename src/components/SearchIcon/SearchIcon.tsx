import styles from './SearchIcon.module.css';

export function SearchIcon() {
  return (
    <svg className={styles.root} aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <circle cx="8.5" cy="8.5" r="5.25" />
      <path d="m12.5 12.5 4 4" />
    </svg>
  );
}
