import { Icon } from '../Icon/Icon.js';
import { useAdvancedSearch } from '../../lib/advancedSearchStore.js';
import styles from './AppliedFiltersBar.module.css';

export function AppliedFiltersBar() {
  const { appliedFilters, openSearch, clearFilters } = useAdvancedSearch();
  if (appliedFilters.length === 0) return null;
  return (
    <div className={styles.bar} role="region" aria-label="Applied filters">
      <div className={styles.chips}>
        {appliedFilters.map((filter) => <span className={styles.chip} key={filter.id}>{filter.fieldId} {filter.operator ?? 'is'} {filter.value ?? '*'}</span>)}
      </div>
      <button type="button" className={styles.edit} onClick={openSearch}><Icon name="FunnelSimple" size="16px" />{appliedFilters.length} filter{appliedFilters.length === 1 ? '' : 's'}</button>
      <button type="button" className={styles.clear} onClick={clearFilters} aria-label="Clear applied filters"><Icon name="X" size="14px" /></button>
    </div>
  );
}
