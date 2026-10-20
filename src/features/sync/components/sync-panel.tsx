import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useI18n } from '@/hooks/use-i18n';
import {
  CavanAuthError,
  CavanHttpError,
  isExtensionContext,
} from '@/lib/cavan-client';
import type { Translate } from '@/lib/i18n';
import { saveDataset } from '@/lib/storage';
import type { Dataset } from '@/types/cavan';
import { formatDate, formatMonth, formatTime } from '@/utils/format';
import { collectDataset, type SyncProgress } from '../collect';
import styles from './sync-panel.module.scss';

type SyncPanelProps = {
  /** Data from the previous update, if any. */
  dataset: Dataset | null;
  onSynced: (dataset: Dataset) => void;
};

const progressLabel = (progress: SyncProgress, t: Translate) => {
  switch (progress.step) {
    case 'connect':
      return t('progress.connect');
    case 'month':
      return t('progress.month', { month: formatMonth(progress.detail ?? '') });
    case 'history':
      return t('progress.history');
    case 'portfolio':
      return t('progress.portfolio');
    case 'shootList':
      return t('progress.shootList');
    case 'shoot':
      return t('progress.shoot', { title: progress.detail ?? '' });
  }
};

const errorMessage = (error: unknown, t: Translate) => {
  if (error instanceof CavanAuthError) return t('sync.errorAuth');
  if (error instanceof CavanHttpError) {
    return t('sync.errorHttp', { status: error.status });
  }
  return error instanceof Error ? error.message : String(error);
};

export const SyncPanel = ({ dataset, onSynced }: SyncPanelProps) => {
  const { t } = useI18n();
  const syncedAt = dataset?.syncedAt ?? null;
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [error, setError] = useState<unknown>(null);
  const canSync = isExtensionContext();

  const handleSync = async (full: boolean) => {
    setError(null);
    try {
      const next = await collectDataset(setProgress, {
        previous: dataset,
        full,
      });
      await saveDataset(next);
      onSynced(next);
    } catch (e) {
      setError(e);
    } finally {
      setProgress(null);
    }
  };

  const percent = progress
    ? Math.min(
        100,
        Math.round((progress.done / Math.max(1, progress.total)) * 100)
      )
    : 0;

  return (
    <section className={styles.syncPanel}>
      <div className={styles.syncPanel__row}>
        <h1 className={styles.syncPanel__title}>{t('app.title')}</h1>
        <div className={styles.syncPanel__controls}>
          <div className={styles.syncPanel__actions}>
            <LanguageToggle />
            <ThemeToggle />
            {dataset && (
              <Button
                variant="secondary"
                onClick={() => handleSync(true)}
                disabled={!!progress || !canSync}
              >
                {t('sync.full')}
              </Button>
            )}
            <Button
              onClick={() => handleSync(false)}
              disabled={!!progress || !canSync}
            >
              {progress
                ? t('sync.loading')
                : dataset
                  ? t('sync.quick')
                  : t('sync.first')}
            </Button>
          </div>
          <p className={styles.syncPanel__meta}>
            {syncedAt
              ? t('sync.updatedAt', {
                  date: formatDate(syncedAt),
                  time: formatTime(syncedAt),
                })
              : t('sync.noData')}
          </p>
        </div>
      </div>
      {!canSync && (
        <p className={styles.syncPanel__note}>{t('sync.extensionOnly')}</p>
      )}

      {progress && (
        <div className={styles.syncPanel__progress}>
          <div className={styles.syncPanel__progressLabel}>
            <span>{progressLabel(progress, t)}</span>
            {progress.total > 1 && (
              <span>
                {progress.done} / {progress.total}
              </span>
            )}
          </div>
          <div className={styles.syncPanel__bar}>
            <div
              className={styles.syncPanel__barFill}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className={styles.syncPanel__note}>{t('sync.keepOpen')}</p>
        </div>
      )}

      {error !== null && (
        <p role="alert" className={styles.syncPanel__error}>
          {errorMessage(error, t)}
        </p>
      )}
    </section>
  );
};
