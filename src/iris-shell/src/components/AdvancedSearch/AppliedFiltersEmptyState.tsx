import { Icon } from '../Icon/Icon.js';
import styles from './AppliedFiltersEmptyState.module.css';

export function AppliedFiltersEmptyState() {
  return (
    <div className={styles.empty} role="status">
      <div className={styles.icon} aria-hidden="true">
        <Icon name="File" size="24px" />
        <span>?</span>
      </div>
      <p>No results were found with the applied search filters.</p>
    </div>
  );
}
