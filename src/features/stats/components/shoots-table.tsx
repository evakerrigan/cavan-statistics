import { Fragment, useMemo, useState } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { COMPACT_QUERY, useMediaQuery } from '@/hooks/use-media-query';
import type { Translate } from '@/lib/i18n';
import type { ManualShoot } from '@/types/cavan';
import { formatDate, formatDuration, formatMoney } from '@/utils/format';
import type { ManualShootsUpdate } from '../hooks/use-manual-shoots';
import { type SortAccessors, useSort } from '../hooks/use-sort';
import type { ShootStat } from '../utils/aggregate';
import { partnerColumnCount } from '../utils/partner-columns';
import { shootTitle } from '../utils/shoot-labels';
import { PartnerCells, PartnerHeaders } from './partner-columns';
import { ShootDetails } from './shoot-details';
import { SortHeader, StackedSortHeader } from './sort-header';
import { StackRow } from './stack-row';
import styles from './table.module.scss';
import shootStyles from './shoots-table.module.scss';

type ShootsTableProps = {
  shoots: ShootStat[];
  partners: string[];
  manualShoots: ManualShoot[];
  onManualShootsChange: (update: ManualShootsUpdate) => void;
  onRenameShoot: (key: string, title: string) => void;
  onMergeShoot: (source: string, target: string) => void;
  onUnmergeShoot: (source: string) => void;
};

const subtitleOf = (shoot: ShootStat, t: Translate) => {
  const base = baseSubtitleOf(shoot, t);
  const joined = shoot.mergedFrom.length;
  return joined ? `${base} · ${t('shoots.sub.joined', { n: joined })}` : base;
};

const baseSubtitleOf = (shoot: ShootStat, t: Translate) => {
  if (shoot.kind === 'unmatched') return t('shoots.sub.unmatched');
  if (shoot.kind === 'manual') return t('shoots.sub.manual');
  if (shoot.kind === 'legacy') {
    return shoot.code && shoot.title !== shoot.code
      ? t('shoots.sub.legacyCode', { code: shoot.code })
      : t('shoots.sub.legacy');
  }
  return [shoot.code, `#${shoot.cavanId}`].filter(Boolean).join(' · ');
};

export const ShootsTable = ({
  shoots,
  partners,
  manualShoots,
  onManualShootsChange,
  onRenameShoot,
  onMergeShoot,
  onUnmergeShoot,
}: ShootsTableProps) => {
  const { t } = useI18n();
  const compact = useMediaQuery(COMPACT_QUERY);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const accessors = useMemo<SortAccessors<ShootStat>>(
    () => ({
      title: (s) => shootTitle(s, t),
      createdAt: (s) => s.createdAt ?? '',
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
    [partners, t]
  );
  const { sorted, sortKey, direction, toggle } = useSort(
    shoots,
    accessors,
    'revenue'
  );
  const header = { sortKey, direction, onSort: toggle };
  const columnCount = 7 + partnerColumnCount(partners, compact);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th aria-label={t('col.preview')} />
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
            <SortHeader
              label={t('shoots.col.perPhoto')}
              columnKey="perPhoto"
              numeric
              {...header}
            />
            <PartnerHeaders partners={partners} compact={compact} {...header} />
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columnCount} className={styles.table__empty}>
                {t('shoots.empty')}
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
                        className={`${styles.table__thumb} ${shoot.photos.length ? '' : styles.table__thumbUnsold}`}
                      />
                    ) : (
                      <div className={styles.table__thumb} />
                    )}
                  </td>
                  <td className={styles.table__titleCell}>
                    <div className={styles.table__primary}>
                      {shootTitle(shoot, t)}
                      {shoot.kind === 'manual' && (
                        <span className={shootStyles.manualBadge}>
                          {t('shoots.badgeManual')}
                        </span>
                      )}
                    </div>
                    <div className={styles.table__secondary}>
                      {subtitleOf(shoot, t)}
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
                  <PartnerCells
                    partners={partners}
                    byPartner={shoot.byPartner}
                    compact={compact}
                    sortKey={sortKey}
                  />
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={columnCount} className={shootStyles.details}>
                      <ShootDetails
                        shoot={shoot}
                        manualShoots={manualShoots}
                        onManualShootsChange={onManualShootsChange}
                        onRenameShoot={onRenameShoot}
                        shoots={shoots}
                        onMergeShoot={onMergeShoot}
                        onUnmergeShoot={onUnmergeShoot}
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
