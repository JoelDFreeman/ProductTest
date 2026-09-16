import { IconButton } from '../IconButton/IconButton.js';
import { Tooltip } from '../Tooltip/Tooltip.js';
import { useAdvancedSearch } from '../../lib/advancedSearchStore.js';
import { useEffect, useRef, useState } from 'react';
import styles from './AdvancedSearchButton.module.css';

interface AdvancedSearchButtonProps {
  shortcut?: string[];
}

export function AdvancedSearchButton({ shortcut }: AdvancedSearchButtonProps) {
  const { open, openSearch, closeSearch, appliedCount } = useAdvancedSearch();
  const count = appliedCount;
  const previousCount = useRef(count);
  const [emphasised, setEmphasised] = useState(false);
  useEffect(() => {
    if (count !== previousCount.current) {
      setEmphasised(true);
      const timer = setTimeout(() => setEmphasised(false), 200);
      previousCount.current = count;
      return () => clearTimeout(timer);
    }
    previousCount.current = count;
    return undefined;
  }, [count]);
  return (
    <span className={styles.wrap}>
      <Tooltip label="Advanced Search" shortcut={shortcut}>
        <IconButton icon="FunnelSimple" ariaLabel={open ? 'Close Advanced Search' : 'Advanced Search'} onClick={open ? closeSearch : openSearch} />
      </Tooltip>
      {count > 0 && <span className={`${styles.count} ${emphasised ? styles.countEmphasised : ''}`} aria-label={`${count} applied filter${count === 1 ? '' : 's'}`}>{count}</span>}
    </span>
  );
}
