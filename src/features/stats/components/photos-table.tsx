import { useMemo, useState } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { CAVAN_ORIGIN } from '@/lib/cavan-client';
import { formatDate, formatMoney } from '@/utils/format';
import { type SortAccessors, useSort } from '../hooks/use-sort';
import {
  type PhotoStat,
  type ShootStat,
  UNMATCHED_KEY,
} from '../utils/aggregate';
import { partnerLabel, shootTitle } from '../utils/shoot-labels';
import { SortHeader } from './sort-header';
import styles from './table.module.scss';
import photoStyles from './photos-table.module.scss';

type PhotosTableProps = {
  photos: PhotoStat[];
  shoots: ShootStat[];
  partners: string[];
};

export const PhotosTable = ({ photos, shoots, partners }: PhotosTableProps) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const shootTitles = useMemo(
    () => new Map(shoots.map((s) => [s.key, shootTitle(s, t)])),
    [shoots, t]
  );
  const titleOf = (photo: PhotoStat) =>
    shootTitles.get(photo.shootKey ?? UNMATCHED_KEY) ?? '—';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return photos;
    return photos.filter((p) =>
      [
        String(p.product.id),
        p.product.fileName,
        p.product.headline,
        shootTitles.get(p.shootKey ?? UNMATCHED_KEY) ?? '',
      ].some((field) => field.toLowerCase().includes(q))
    );
  }, [photos, query, shootTitles]);

  const accessors = useMemo<SortAccessors<PhotoStat>>(
    () => ({
      id: (p) => p.product.id,
      shoot: (p) => shootTitles.get(p.shootKey ?? UNMATCHED_KEY) ?? '',
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
        placeholder={t('photos.search')}
        className={photoStyles.search}
      />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-label={t('col.preview')} />
              <SortHeader
                label={t('photos.col.photo')}
                columnKey="id"
                {...header}
              />
              <SortHeader
                label={t('col.shoot')}
                columnKey="shoot"
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
              {partners.map((p) => (
                <SortHeader
                  key={p}
                  label={partnerLabel(p, t)}
                  columnKey={`partner:${p}`}
                  numeric
                  {...header}
                />
              ))}
              <SortHeader
                label={t('photos.col.lastSale')}
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
                  {query ? t('details.nothingFound') : t('photos.empty')}
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
                <td className={`${styles.table__num} ${styles.table__revenue}`}>
                  {formatMoney(photo.revenue)}
                </td>
                {partners.map((p) => (
                  <td key={p} className={styles.table__num}>
                    {photo.byPartner[p] ? formatMoney(photo.byPartner[p]) : '—'}
                  </td>
                ))}
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
