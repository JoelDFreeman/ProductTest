import { cx } from '../../lib/cx.js';
import styles from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Toggle — controlled on/off switch, mirrors iris-ui's `iris-toggle`.
 */
export function Toggle({ checked, disabled = false, onChange, ariaLabel, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cx(styles.toggle, checked && styles.on, disabled && styles.disabled, className)}
      onClick={() => onChange?.(!checked)}
    >
      <span className={styles.knob} aria-hidden="true" />
    </button>
  );
}
