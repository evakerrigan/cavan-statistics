import { useMemo } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { COMPACT_QUERY, useMediaQuery } from '@/hooks/use-media-query';
import {
  formatDate,
  formatDuration,
  formatMoney,
  formatMonths,
} from '@/utils/format';
import { type SortAccessors, useSort } from '../hooks/use-sort';
import type { ShootStat } from '../utils/aggregate';
import { shootSubtitle, shootTitle } from '../utils/shoot-labels';
import { buildYears, type YearStat } from '../utils/years';
import { SortHeader, StackedSortHeader } from './sort-header';
import { StackRow } from './stack-row';
import { TableWrap } from './table-wrap';
import styles from './table.module.scss';
import tileStyles from './stats-view.module.scss';
import yearStyles from './years-view.module.scss';

type YearsViewProps = {
  shoots: ShootStat[];
};

/** One table per upload year, each with the year's totals above it. */
export const YearsView = ({ shoots }: YearsViewProps) => {
  const { t } = useI18n();
  const years = useMemo(() => buildYears(shoots), [shoots]);

  if (!years.length) {
    return <p className={styles.table__empty}>{t('shoots.empty')}</p>;
  }
  return (
    <>
      {years.map((year) => (
        <YearSection key={year.year} year={year} />
      ))}
    </>
  );
};

const YearSection = ({ year }: { year: YearStat }) => {
  const { t } = useI18n();
  const tiles = [
    {
      label: t('years.avgOnSale'),
      value:
        year.avgMonthsOnSale === null
          ? '—'
          : formatMonths(year.avgMonthsOnSale),
    },
    { label: t('stats.shoots'), value: year.shoots.length },
    { label: t('years.photos'), value: year.photoCount },
    { label: t('stats.sales'), value: year.salesCount },
    { label: t('years.revenue'), value: formatMoney(year.revenue) },
  ];

  return (
    <section className={yearStyles.year}>
      <h2 className={yearStyles.year__title}>{year.year}</h2>
      <div className={tileStyles.tiles}>
        {tiles.map((tile) => (
          <div key={tile.label} className={tileStyles.tile}>
            <div className={tileStyles.tile__label}>{tile.label}</div>
            <div className={tileStyles.tile__value}>{tile.value}</div>
          </div>
        ))}
      </div>
      <YearTable shoots={year.shoots} />
    </section>
  );
};

/** The shoots table's main columns, without partners and details. */
const YearTable = ({ shoots }: { shoots: ShootStat[] }) => {
  const { t } = useI18n();
  const compact = useMediaQuery(COMPACT_QUERY);

  const accessors = useMemo<SortAccessors<ShootStat>>(
    () => ({
      title: (s) => shootTitle(s, t),
      createdAt: (s) => s.createdAt ?? s.publishedAt ?? '',
      onSale: (s) =>
        s.publishedAt
          ? Date.now() - new Date(s.publishedAt.slice(0, 10)).getTime()
          : -1,
      published: (s) => s.publishedCount ?? -1,
      sold: (s) => s.photos.length,
      sales: (s) => s.salesCount,
      revenue: (s) => s.revenue,
    }),
    [t]
  );
  const { sorted, sortKey, direction, toggle } = useSort(
    shoots,
    accessors,
    'createdAt'
  );
  const header = { sortKey, direction, onSort: toggle };

  return (
    <TableWrap>
      <table className={styles.table}>
        <thead>
          <tr>
            <th
              aria-label={t('col.preview')}
              className={styles.table__pinned}
            />
            <SortHeader label={t('col.shoot')} columnKey="title" {...header} />
            <StackedSortHeader
              columns={[
                { label: t('shoots.col.created'), columnKey: 'createdAt' },
                { label: t('shoots.col.onSale'), columnKey: 'onSale' },
              ]}
              className={styles.table__compact}
              {...header}
            />
            <StackedSortHeader
              columns={[
                {
                  label: t(
                    compact
                      ? 'shoots.col.publishedShort'
                      : 'shoots.col.published'
                  ),
                  columnKey: 'published',
                },
                {
                  label: t(
                    compact ? 'shoots.col.soldShort' : 'shoots.col.sold'
                  ),
                  columnKey: 'sold',
                },
              ]}
              numeric
              {...header}
            />
            <SortHeader
              label={t('col.sales')}
              columnKey="sales"
              numeric
              {...header}
            />
            <SortHeader
              label={t('col.revenue')}
              columnKey="revenue"
              numeric
              className={styles.table__revenue}
              {...header}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((shoot) => (
            <tr key={shoot.key}>
              <td className={styles.table__pinned}>
                {shoot.thumbUrl ? (
                  <img
                    src={shoot.thumbUrl}
                    alt=""
                    loading="lazy"
                    className={`${styles.table__thumb} ${shoot.photos.length ? '' : styles.table__thumbUnsold}`}
                  />
                ) : (
                  <div className={styles.table__thumb} />
                )}
              </td>
              <td className={styles.table__titleCell}>
                <div className={styles.table__primary}>
                  {shootTitle(shoot, t)}
                </div>
                <div className={styles.table__secondary}>
                  {shootSubtitle(shoot, t)}
                </div>
              </td>
              <td className={styles.table__compact}>
                <div className={styles.table__stack}>
                  <span>{formatDate(shoot.createdAt)}</span>
                  <span>{formatDuration(shoot.publishedAt)}</span>
                </div>
              </td>
              <td className={styles.table__num}>
                <div className={styles.table__pairs}>
                  <StackRow
                    label={t('shoots.pair.published')}
                    value={shoot.publishedCount ?? '—'}
                  />
                  <StackRow
                    label={t('shoots.pair.sold')}
                    value={shoot.photos.length}
                  />
                </div>
              </td>
              <td className={styles.table__num}>{shoot.salesCount}</td>
              <td className={`${styles.table__num} ${styles.table__revenue}`}>
                {formatMoney(shoot.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
};
