import type { ReactNode } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { MessageKey } from '@/lib/i18n';
import { formatMoney, formatPercent } from '@/utils/format';
import type { CollectionStat } from '../utils/aggregate';
import styles from './stats-view.module.scss';

/** Below this width the one-row-per-collection table no longer fits. */
const STACKED_QUERY = '(max-width: 899px)';

const moneyOrDash = (value: number | null) =>
  value === null ? '—' : formatMoney(value);

type Column = {
  label: MessageKey;
  value: (c: CollectionStat) => ReactNode;
  strong?: boolean;
};

/**
 * The overview totals split into macro and micro. One row per collection on
 * a wide screen; below 900px, where that row doesn't fit, one vertical
 * table per collection with the column names as rows.
 */
export const CollectionRows = ({
  collections,
}: {
  collections: CollectionStat[];
}) => {
  const { t } = useI18n();
  const stacked = useMediaQuery(STACKED_QUERY);
  if (!collections.length) return null;

  const columns: Column[] = [
    {
      label: 'stats.earned',
      value: (c) => formatMoney(c.revenue),
      strong: true,
    },
    { label: 'stats.sales', value: (c) => c.salesCount },
    {
      label: 'stats.soldPhotos',
      value: (c) => (
        <>
          {c.soldPhotos}
          <span className={styles.tile__of}>
            {' '}
            {t('stats.of', { n: c.publishedPhotos })}
          </span>
        </>
      ),
    },
    {
      label: 'stats.collectionSuccess',
      value: (c) => formatPercent(c.soldPhotos / c.publishedPhotos),
    },
    { label: 'stats.shoots', value: (c) => c.shoots },
    {
      label: 'stats.perSold',
      value: (c) => moneyOrDash(c.revenuePerSoldPhoto),
    },
    {
      label: 'stats.perCollection',
      value: (c) => moneyOrDash(c.revenuePerPortfolioPhoto),
    },
  ];
  const valueClass = (column: Column) =>
    column.strong ? styles.split__strong : undefined;

  if (stacked) {
    return (
      <div className={styles.splitPair}>
        {collections.map((c) => (
          <div key={c.collection} className={styles.split}>
            <table
              className={`${styles.split__table} ${styles.split__tableVertical}`}
            >
              <thead>
                <tr>
                  <th colSpan={2}>{t(`stats.${c.collection}`)}</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((column) => (
                  <tr key={column.label}>
                    <th scope="row">{t(column.label)}</th>
                    <td className={valueClass(column)}>{column.value(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.split}>
      <table className={styles.split__table}>
        <thead>
          <tr>
            <th>{t('stats.collection')}</th>
            {columns.map((column) => (
              <th key={column.label}>{t(column.label)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {collections.map((c) => (
            <tr key={c.collection}>
              <th scope="row">{t(`stats.${c.collection}`)}</th>
              {columns.map((column) => (
                <td key={column.label} className={valueClass(column)}>
                  {column.value(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
