import styles from './table.module.scss';

/**
 * One label/value line inside a `table__pairs` cell: labels line up in one
 * column, values in the next.
 */
export const StackRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <>
    <span className={styles.table__stackLabel}>{label}</span>
    <span className={styles.table__pairsValue}>{value}</span>
  </>
);
