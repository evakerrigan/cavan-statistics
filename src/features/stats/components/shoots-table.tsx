import { Fragment, useMemo, useState } from 'react';
import type { ManualShoot } from '@/types/cavan';
import { formatDate, formatDuration, formatMoney } from '@/utils/format';
import type { ManualShootsUpdate } from '../hooks/use-manual-shoots';
import { type SortAccessors, useSort } from '../hooks/use-sort';
import type { ShootStat } from '../utils/aggregate';
import { ShootDetails } from './shoot-details';
import { SortHeader, StackedSortHeader } from './sort-header';
import styles from './table.module.scss';
import shootStyles from './shoots-table.module.scss';

type ShootsTableProps = {
  shoots: ShootStat[];
  partners: string[];
  manualShoots: ManualShoot[];
  onManualShootsChange: (update: ManualShootsUpdate) => void;
};

const subtitleOf = (shoot: ShootStat) => {
  if (shoot.kind === 'unmatched')
    return 'Отметьте фото и соберите из них свою съёмку';
  if (shoot.kind === 'manual') return 'Только проданные фото';
  return [shoot.code, `#${shoot.cavanId}`].filter(Boolean).join(' · ');
};

const StackRow = ({
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

export const ShootsTable = ({
  shoots,
  partners,
  manualShoots,
  onManualShootsChange,
}: ShootsTableProps) => {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const accessors = useMemo<SortAccessors<ShootStat>>(
    () => ({
      title: (s) => s.title,
      createdAt: (s) => s.createdAt ?? '',
      publishedAt: (s) => s.publishedAt ?? '',
      onSale: (s) =>
        s.publishedAt
          ? Date.now() - new Date(s.publishedAt.slice(0, 10)).getTime()
          : -1,
      published: (s) => s.publishedCount ?? -1,
      sold: (s) => s.photos.length,
      sales: (s) => s.salesCount,
      revenue: (s) => s.revenue,
      perPhoto: (s) => s.revenuePerPhoto ?? -1,
      ...Object.fromEntries(
        partners.map((p) => [
          `partner:${p}`,
          (s: ShootStat) => s.byPartner[p] ?? 0,
        ])
      ),
    }),
    [partners]
  );
  const { sorted, sortKey, direction, toggle } = useSort(
    shoots,
    accessors,
    'revenue'
  );
  const header = { sortKey, direction, onSort: toggle };
  const columnCount = 7 + partners.length;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th aria-label="Превью" />
            <SortHeader label="Съёмка" columnKey="title" {...header} />
            <StackedSortHeader
              columns={[
                { label: 'Создана', columnKey: 'createdAt' },
                { label: 'Опубликована', columnKey: 'publishedAt' },
                { label: 'В продаже', columnKey: 'onSale' },
              ]}
              {...header}
            />
            <StackedSortHeader
              columns={[
                { label: 'Опубл. фото', columnKey: 'published' },
                { label: 'Продано фото', columnKey: 'sold' },
              ]}
              numeric
              {...header}
            />
            <SortHeader label="Продаж" columnKey="sales" numeric {...header} />
            <SortHeader
              label="Доход"
              columnKey="revenue"
              numeric
              className={styles.table__revenue}
              {...header}
            />
            <SortHeader
              label="На 1 фото"
              columnKey="perPhoto"
              numeric
              {...header}
            />
            {partners.map((p) => (
              <SortHeader
                key={p}
                label={p}
                columnKey={`partner:${p}`}
                numeric
                {...header}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columnCount} className={styles.table__empty}>
                Съёмок пока нет.
              </td>
            </tr>
          )}
          {sorted.map((shoot) => {
            const key = shoot.key;
            const isOpen = openKey === key;
            return (
              <Fragment key={key}>
                <tr
                  className={styles.table__clickable}
                  onClick={() => setOpenKey(isOpen ? null : key)}
                  aria-expanded={isOpen}
                >
                  <td>
                    {shoot.thumbUrl ? (
                      <img
                        src={shoot.thumbUrl}
                        alt=""
                        loading="lazy"
                        className={styles.table__thumb}
                      />
                    ) : (
                      <div className={styles.table__thumb} />
                    )}
                  </td>
                  <td>
                    <div className={styles.table__primary}>
                      {shoot.title}
                      {shoot.kind === 'manual' && (
                        <span className={shootStyles.manualBadge}>своя</span>
                      )}
                    </div>
                    <div className={styles.table__secondary}>
                      {subtitleOf(shoot)}
                    </div>
                  </td>
                  <td>
                    <div className={styles.table__pairs}>
                      <StackRow
                        label="создана"
                        value={formatDate(shoot.createdAt)}
                      />
                      <StackRow
                        label="опубл."
                        value={formatDate(shoot.publishedAt)}
                      />
                      <StackRow
                        label="в продаже"
                        value={formatDuration(shoot.publishedAt)}
                      />
                    </div>
                  </td>
                  <td className={styles.table__num}>
                    <div className={styles.table__pairs}>
                      <StackRow
                        label="опубл."
                        value={shoot.publishedCount ?? '—'}
                      />
                      <StackRow label="продано" value={shoot.photos.length} />
                    </div>
                  </td>
                  <td className={styles.table__num}>{shoot.salesCount}</td>
                  <td
                    className={`${styles.table__num} ${styles.table__revenue}`}
                  >
                    {formatMoney(shoot.revenue)}
                  </td>
                  <td className={styles.table__num}>
                    {shoot.revenuePerPhoto === null
                      ? '—'
                      : formatMoney(shoot.revenuePerPhoto)}
                  </td>
                  {partners.map((p) => (
                    <td key={p} className={styles.table__num}>
                      {shoot.byPartner[p]
                        ? formatMoney(shoot.byPartner[p])
                        : '—'}
                    </td>
                  ))}
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={columnCount} className={shootStyles.details}>
                      <ShootDetails
                        shoot={shoot}
                        manualShoots={manualShoots}
                        onManualShootsChange={onManualShootsChange}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
