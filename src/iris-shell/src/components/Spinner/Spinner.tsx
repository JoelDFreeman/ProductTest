import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function Spinner({ size = 'default', className }: SpinnerProps) {
  return (
    <svg
      className={`${styles.spinner} ${styles[`size_${size}`]} ${styles.loop} ${className ?? ''}`}
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle className={styles.track} cx="12" cy="12" r="9" />
      <circle className={styles.arc} cx="12" cy="12" r="9" />
    </svg>
  );
}
