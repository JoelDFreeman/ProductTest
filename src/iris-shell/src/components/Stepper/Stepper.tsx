import { Icon } from '../Icon/Icon.js';
import styles from './Stepper.module.css';

export interface StepperItem {
  label: string;
  state?: 'default' | 'current' | 'completed' | 'waiting' | 'error';
}

interface StepperProps {
  items: StepperItem[];
  activeIndex: number;
  completedThrough?: number;
  ariaLabel: string;
  onStepChange?: (index: number) => void;
  orientation?: 'horizontal' | 'vertical';
}

export function Stepper({ items, activeIndex, completedThrough = activeIndex, ariaLabel, onStepChange, orientation = 'horizontal' }: StepperProps) {
  return (
    <div
      className={`${styles.root} ${orientation === 'vertical' ? styles.rootVertical : styles.rootHorizontal}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const complete = index < completedThrough;
        const current = index === activeIndex;
        const clickable = !!onStepChange && index <= completedThrough;
        const state = item.state ?? (current ? 'current' : complete ? 'completed' : 'default');
        return (
          <button
            key={item.label}
            type="button"
            className={`${styles.item} ${styles[`item_${state}`]}`}
            role="tab"
            aria-selected={current}
            aria-current={current ? 'step' : undefined}
            aria-label={`${item.label}${state === 'completed' ? ', completed' : state === 'current' ? ', current step' : state === 'error' ? ', error' : ''}`}
            onClick={clickable ? () => onStepChange(index) : undefined}
            disabled={!clickable}
          >
            <div className={styles.label}>
              <span className={styles.visual}>{state === 'completed' ? <Icon name="CheckCircle" size="18px" /> : state === 'error' ? <Icon name="XCircle" size="18px" /> : <span className={styles.marker}>{index + 1}</span>}</span>
              <span>{item.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
