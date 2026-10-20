import { useMemo, useState } from 'react';
import type { Dataset } from '@/types/cavan';
import { formatMoney } from '@/utils/format';
import { useManualShoots } from '../hooks/use-manual-shoots';
import { buildStats } from '../utils/aggregate';
import { MonthsView } from './months-view';
import { PhotosTable } from './photos-table';
import { ShootsTable } from './shoots-table';
import styles from './stats-view.module.scss';

type StatsViewProps = {
  dataset: Dataset;
};

const TABS = [
  { id: 'shoots', label: 'По съёмкам' },
  { id: 'photos', label: 'По фото' },
  { id: 'months', label: 'По месяцам' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export const StatsView = ({ dataset }: StatsViewProps) => {
  const [tab, setTab] = useState<TabId>('shoots');
  const { manualShoots, ready, update } = useManualShoots();
  const stats = useMemo(
    () => buildStats(dataset, manualShoots),
    [dataset, manualShoots]
  );

  // Wait for the user's own shoots, so «Без съёмки» doesn't flash on load.
  if (!ready) return null;

  const missing = Math.round((stats.cavanTotal - stats.revenue) * 100) / 100;
  const matchedShoots = stats.shoots.filter((s) => s.kind !== 'unmatched');
  const unmatched = stats.shoots.find((s) => s.kind === 'unmatched');

  return (
    <div className={styles.stats}>
      <div className={styles.tiles}>
        <div className={styles.tile}>
          <div className={styles.tile__label}>Заработано</div>
          <div className={`${styles.tile__value} ${styles.tile__hero}`}>
            {formatMoney(stats.revenue)}
          </div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tile__label}>Продаж</div>
          <div className={styles.tile__value}>{stats.salesCount}</div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tile__label}>Продано фото</div>
          <div className={styles.tile__value}>
            {stats.soldPhotos}
            <span className={styles.tile__of}> из {stats.publishedPhotos}</span>
          </div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tile__label}>Съёмок</div>
          <div className={styles.tile__value}>{matchedShoots.length}</div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tile__label}>Ср. доход с проданного фото</div>
          <div className={styles.tile__value}>
            {stats.revenuePerSoldPhoto === null
              ? '—'
              : formatMoney(stats.revenuePerSoldPhoto)}
          </div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tile__label}>КПД на 1 фото портфеля</div>
          <div className={styles.tile__value}>
            {stats.revenuePerPortfolioPhoto === null
              ? '—'
              : formatMoney(stats.revenuePerPortfolioPhoto)}
          </div>
        </div>
      </div>

      <div className={styles.tiles}>
        {stats.partners.map((p) => (
          <div key={p} className={styles.tile}>
            <div className={styles.tile__label}>{p}</div>
            <div className={styles.tile__value}>
              {formatMoney(
                stats.months.reduce((sum, m) => sum + (m.byPartner[p] ?? 0), 0)
              )}
            </div>
          </div>
        ))}
      </div>

      {Math.abs(missing) >= 0.01 && (
        <p className={styles.notice}>
          Cavan показывает общий доход {formatMoney(stats.cavanTotal)}, а
          собрано {formatMoney(stats.revenue)} (разница {formatMoney(missing)}).
          Попробуйте обновить данные ещё раз.
        </p>
      )}
      {unmatched && (
        <p className={styles.notice}>
          {unmatched.photos.length} фото на {formatMoney(unmatched.revenue)} не
          удалось связать со съёмкой: их имени файла нет ни в одной съёмке из
          раздела Submit Content. Откройте строку «Без съёмки», отметьте фото и
          соберите из них свою съёмку.
        </p>
      )}

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'shoots' && (
        <ShootsTable
          shoots={stats.shoots}
          partners={stats.partners}
          manualShoots={manualShoots}
          onManualShootsChange={update}
        />
      )}
      {tab === 'photos' && (
        <PhotosTable
          photos={stats.photos}
          shoots={stats.shoots}
          partners={stats.partners}
        />
      )}
      {tab === 'months' && (
        <MonthsView months={stats.months} partners={stats.partners} />
      )}
    </div>
  );
};
