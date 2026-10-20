import type { SortDirection } from '../hooks/use-sort';
import styles from './table.module.scss';

type SortHeaderProps = {
  label: string;
  columnKey: string;
  sortKey: string;
  direction: SortDirection;
  onSort: (key: string) => void;
  numeric?: boolean;
};

export const SortHeader = ({
  label,
  columnKey,
  sortKey,
  direction,
  onSort,
  numeric = false,
}: SortHeaderProps) => {
  const active = columnKey === sortKey;
  return (
    <th
      className={numeric ? styles.table__num : undefined}
      aria-sort={
        active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
    >
      <button
        type="button"
        className={`${styles.table__sort} ${active ? styles.table__sortActive : ''}`}
        onClick={() => onSort(columnKey)}
      >
        {label}
        <span aria-hidden="true">
          {active ? (direction === 'asc' ? ' ↑' : ' ↓') : ''}
        </span>
      </button>
    </th>
  );
};
