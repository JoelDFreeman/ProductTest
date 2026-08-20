import { Icon } from '../Icon/Icon.js';
import type { CSSProperties } from 'react';
import styles from './Stepper.module.css';

export interface StepperItem {
  label: string;
}

interface StepperProps {
  items: StepperItem[];
  activeIndex: number;
  completedThrough?: number;
  ariaLabel: string;
  onStepChange?: (index: number) => void;
}

export function Stepper({ items, activeIndex, completedThrough = activeIndex, ariaLabel, onStepChange }: StepperProps) {
  return (
    <div
      className={styles.root}
      role="tablist"
      aria-label={ariaLabel}
      style={{ '--active-step-index': activeIndex } as CSSProperties}
    >
      {items.map((item, index) => {
        const complete = index < completedThrough;
        const current = index === activeIndex;
        const clickable = !!onStepChange && index <= completedThrough;
        return (
          <button
            key={item.label}
            type="button"
            className={`${styles.item} ${current ? styles.itemCurrent : ''} ${complete ? styles.itemComplete : ''}`}
            role="tab"
            aria-selected={current}
            aria-current={current ? 'step' : undefined}
            aria-label={`${item.label}${complete ? ', completed' : current ? ', current step' : ''}`}
            onClick={clickable ? () => onStepChange(index) : undefined}
            disabled={!clickable}
          >
            <div className={styles.label}>
              <span className={styles.visual}>{complete ? <Icon name="CheckCircle" size="12px" /> : <span className={styles.marker}>{index + 1}</span>}</span>
              <span>{item.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
