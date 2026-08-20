import { Icon } from '../Icon/Icon.js';
import styles from './Stepper.module.css';

export interface StepperItem {
  label: string;
}

interface StepperProps {
  items: StepperItem[];
  activeIndex: number;
  ariaLabel: string;
}

export function Stepper({ items, activeIndex, ariaLabel }: StepperProps) {
  return (
    <div className={styles.root} role="tablist" aria-label={ariaLabel}>
      {items.map((item, index) => {
        const complete = index < activeIndex;
        const current = index === activeIndex;
        return (
          <div
            key={item.label}
            className={`${styles.item} ${current ? styles.itemCurrent : ''} ${complete ? styles.itemComplete : ''}`}
            role="tab"
            aria-selected={current}
            aria-current={current ? 'step' : undefined}
          >
            <div className={styles.label}>
              {complete ? <Icon name="CheckCircle" size="12px" /> : <span className={styles.marker}>{index + 1}</span>}
              <span>{item.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
