import type { ReactNode } from 'react';
import styles from './cards.module.scss';

type CardStatProps = {
  label: string;
  value: ReactNode;
  /** The value the list is sorted by. */
  highlighted?: boolean;
  /** Revenue: full width, on the green band. */
  revenue?: boolean;
};

/** One label/value cell in a card's stats grid. */
export const CardStat = ({
  label,
  value,
  highlighted = false,
  revenue = false,
}: CardStatProps) => (
  <div
    className={[
      styles.stat,
      revenue ? styles.statRevenue : '',
      highlighted ? styles.statSorted : '',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <span className={styles.stat__label}>{label}</span>
    <span className={styles.stat__value}>{value}</span>
  </div>
);
