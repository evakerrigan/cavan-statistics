import { useMemo, useState } from 'react';
import { CAVAN_ORIGIN } from '@/lib/cavan-client';
import { formatDate, formatMoney } from '@/utils/format';
import { type SortAccessors, useSort } from '../hooks/use-sort';
import type { PhotoStat, ShootStat } from '../utils/aggregate';
import { SortHeader } from './sort-header';
import styles from './table.module.scss';
import photoStyles from './photos-table.module.scss';

type PhotosTableProps = {
  photos: PhotoStat[];
  shoots: ShootStat[];
  partners: string[];
};

export const PhotosTable = ({ photos, shoots, partners }: PhotosTableProps) => {
  const [query, setQuery] = useState('');

  const shootTitles = useMemo(
    () => new Map(shoots.map((s) => [s.id, s.title])),
    [shoots]
  );
  const titleOf = (photo: PhotoStat) => shootTitles.get(photo.shootId) ?? '—';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return photos;
    return photos.filter((p) =>
      [
        String(p.product.id),
        p.product.fileName,
        p.product.headline,
        shootTitles.get(p.shootId) ?? '',
      ].some((field) => field.toLowerCase().includes(q))
    );
  }, [photos, query, shootTitles]);

  const accessors = useMemo<SortAccessors<PhotoStat>>(
    () => ({
      id: (p) => p.product.id,
      shoot: (p) => shootTitles.get(p.shootId) ?? '',
      sales: (p) => p.sales.length,
      revenue: (p) => p.revenue,
      lastSale: (p) => p.lastSale ?? '',
      ...Object.fromEntries(
        partners.map((name) => [
          `partner:${name}`,
          (p: PhotoStat) => p.byPartner[name] ?? 0,
        ])
      ),
    }),
    [partners, shootTitles]
  );
  const { sorted, sortKey, direction, toggle } = useSort(
    filtered,
    accessors,
    'revenue'
  );
  const header = { sortKey, direction, onSort: toggle };

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по ID, имени файла, описанию или съёмке"
        className={photoStyles.search}
      />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-label="Превью" />
              <SortHeader label="Фото" columnKey="id" {...header} />
              <SortHeader label="Съёмка" columnKey="shoot" {...header} />
              <SortHeader
                label="Продаж"
                columnKey="sales"
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
              <SortHeader
                label="Доход"
                columnKey="revenue"
                numeric
                {...header}
              />
              <SortHeader
                label="Посл. продажа"
                columnKey="lastSale"
                numeric
                {...header}
              />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={6 + partners.length}
                  className={styles.table__empty}
                >
                  {query ? 'Ничего не найдено.' : 'Продаж пока нет.'}
                </td>
              </tr>
            )}
            {sorted.map((photo) => (
              <tr key={photo.product.id}>
                <td>
                  <img
                    src={photo.product.thumbUrl}
                    alt=""
                    loading="lazy"
                    className={styles.table__thumb}
                  />
                </td>
                <td className={photoStyles.photoCell}>
                  <a
                    href={`${CAVAN_ORIGIN}/account/reporting/sales/product/${photo.product.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`${styles.table__primary} ${styles.table__link}`}
                  >
                    {photo.product.id}
                  </a>{' '}
                  <span className={styles.table__secondary}>
                    {photo.product.fileName}
                  </span>
                  <div className={styles.table__secondary}>
                    {photo.product.headline}
                  </div>
                </td>
                <td>{titleOf(photo)}</td>
                <td className={styles.table__num}>{photo.sales.length}</td>
                {partners.map((p) => (
                  <td key={p} className={styles.table__num}>
                    {photo.byPartner[p] ? formatMoney(photo.byPartner[p]) : '—'}
                  </td>
                ))}
                <td className={`${styles.table__num} ${styles.table__strong}`}>
                  {formatMoney(photo.revenue)}
                </td>
                <td className={styles.table__num}>
                  {formatDate(photo.lastSale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
