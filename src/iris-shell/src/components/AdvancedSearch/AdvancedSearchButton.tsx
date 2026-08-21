import { IconButton } from '../IconButton/IconButton.js';
import { Tooltip } from '../Tooltip/Tooltip.js';
import { useAdvancedSearch } from '../../lib/advancedSearchStore.js';
import styles from './AdvancedSearchButton.module.css';

interface AdvancedSearchButtonProps {
  shortcut?: string[];
}

export function AdvancedSearchButton({ shortcut }: AdvancedSearchButtonProps) {
  const { openSearch, appliedCount } = useAdvancedSearch();
  const count = appliedCount;
  return (
    <span className={styles.wrap}>
      <Tooltip label="Advanced Search" shortcut={shortcut}>
        <IconButton icon="FunnelSimple" ariaLabel="Advanced Search" onClick={openSearch} />
      </Tooltip>
      {count > 0 && <span className={styles.count} aria-label={`${count} applied filter${count === 1 ? '' : 's'}`}>{count}</span>}
    </span>
  );
}
