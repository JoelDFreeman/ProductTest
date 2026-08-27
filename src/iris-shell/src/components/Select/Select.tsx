import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx.js';
import { Icon } from '../Icon/Icon.js';
import styles from './Select.module.css';

export interface SelectProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Currently selected label. */
  label: string;
  size?: 's' | 'default' | 'l';
}

/**
 * Select — dropdown trigger styled per Iris. Purely presentational; pair
 * with `Menu` (passed as its `trigger` render prop) to open a menu of options.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { label, onClick, size = 'default', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cx(styles.trigger, styles[`size_${size}`], className)}
      {...rest}
    >
      <span className={styles.label}>{label}</span>
      <Icon name="CaretDown" size="16px" className={styles.caret} />
    </button>
  );
});

