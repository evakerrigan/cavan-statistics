import { Fragment, useMemo, useState } from 'react';
import { CAVAN_ORIGIN } from '@/lib/cavan-client';
import { formatDate, formatMoney } from '@/utils/format';
import { type SortAccessors, useSort } from '../hooks/use-sort';
import type { ShootStat } from '../utils/aggregate';
import { SortHeader } from './sort-header';
import styles from './table.module.scss';
import shootStyles from './shoots-table.module.scss';

type ShootsTableProps = {
  shoots: ShootStat[];
  partners: string[];
};

const shootKey = (shoot: ShootStat) => shoot.id ?? 'unmatched';

export const ShootsTable = ({ shoots, partners }: ShootsTableProps) => {
  const [openKey, setOpenKey] = useState<number | string | null>(null);

  const accessors = useMemo<SortAccessors<ShootStat>>(
    () => ({
      title: (s) => s.title,
      createdAt: (s) => s.createdAt ?? '',
      published: (s) => s.publishedCount,
      sold: (s) => s.photos.length,
      sales: (s) => s.salesCount,
      revenue: (s) => s.revenue,
      perPhoto: (s) => s.revenuePerPhoto,
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
  const columnCount = 8 + partners.length;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th aria-label="Превью" />
            <SortHeader label="Съёмка" columnKey="title" {...header} />
            <SortHeader label="Создана" columnKey="createdAt" {...header} />
            <SortHeader
              label="Опубл. фото"
              columnKey="published"
              numeric
              {...header}
            />
            <SortHeader
              label="Продано фото"
              columnKey="sold"
              numeric
              {...header}
            />
            <SortHeader label="Продаж" columnKey="sales" numeric {...header} />
            {partners.map((p) => (
              <SortHeader
                key={p}
                label={p}
                columnKey={`partner:${p}`}
                numeric
                {...header}
              />
            ))}
            <SortHeader label="Доход" columnKey="revenue" numeric {...header} />
            <SortHeader
              label="На 1 фото"
              columnKey="perPhoto"
              numeric
              {...header}
            />
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
            const key = shootKey(shoot);
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
                    <div className={styles.table__primary}>{shoot.title}</div>
                    <div className={styles.table__secondary}>
                      {shoot.id === null
                        ? 'Фото, которые не удалось связать со съёмкой'
                        : [shoot.code, `#${shoot.id}`]
                            .filter(Boolean)
                            .join(' · ')}
                    </div>
                  </td>
                  <td>{formatDate(shoot.createdAt)}</td>
                  <td className={styles.table__num}>
                    {shoot.id === null ? '—' : shoot.publishedCount}
                  </td>
                  <td className={styles.table__num}>{shoot.photos.length}</td>
                  <td className={styles.table__num}>{shoot.salesCount}</td>
                  {partners.map((p) => (
                    <td key={p} className={styles.table__num}>
                      {shoot.byPartner[p]
                        ? formatMoney(shoot.byPartner[p])
                        : '—'}
                    </td>
                  ))}
                  <td
                    className={`${styles.table__num} ${styles.table__strong}`}
                  >
                    {formatMoney(shoot.revenue)}
                  </td>
                  <td className={styles.table__num}>
                    {shoot.id === null
                      ? '—'
                      : formatMoney(shoot.revenuePerPhoto)}
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={columnCount} className={shootStyles.details}>
                      {shoot.photos.length === 0 ? (
                        <p className={styles.table__secondary}>
                          Из этой съёмки пока ничего не продалось.
                        </p>
                      ) : (
                        <div className={shootStyles.grid}>
                          {shoot.photos.map((photo) => (
                            <a
                              key={photo.product.id}
                              href={`${CAVAN_ORIGIN}/account/reporting/sales/product/${photo.product.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className={shootStyles.card}
                            >
                              <img
                                src={photo.product.thumbUrl}
                                alt={photo.product.headline}
                                loading="lazy"
                                className={shootStyles.card__image}
                              />
                              <div className={shootStyles.card__info}>
                                <span>{photo.product.id}</span>
                                <strong>{formatMoney(photo.revenue)}</strong>
                              </div>
                              <div className={styles.table__secondary}>
                                {photo.sales.length} прод. · посл.{' '}
                                {formatDate(photo.lastSale)}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
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
