import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { isExtensionContext } from '@/lib/cavan-client';
import { saveDataset } from '@/lib/storage';
import type { Dataset } from '@/types/cavan';
import { formatDate } from '@/utils/format';
import { collectDataset, type SyncProgress } from '../collect';
import styles from './sync-panel.module.scss';

type SyncPanelProps = {
  /** Data from the previous update, if any. */
  dataset: Dataset | null;
  onSynced: (dataset: Dataset) => void;
};

export const SyncPanel = ({ dataset, onSynced }: SyncPanelProps) => {
  const syncedAt = dataset?.syncedAt ?? null;
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      setError(e instanceof Error ? e.message : String(e));
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
        <div>
          <h1 className={styles.syncPanel__title}>Статистика Cavan от Евы</h1>
          <p className={styles.syncPanel__meta}>
            {syncedAt
              ? `Данные обновлены ${formatDate(syncedAt)} в ${new Date(syncedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
              : 'Данных пока нет — нажмите «Обновить данные».'}
          </p>
        </div>
        <div className={styles.syncPanel__actions}>
          {dataset && (
            <Button
              variant="secondary"
              onClick={() => handleSync(true)}
              disabled={!!progress || !canSync}
            >
              Полное обновление
            </Button>
          )}
          <Button
            onClick={() => handleSync(false)}
            disabled={!!progress || !canSync}
          >
            {progress ? 'Обновляю…' : 'Обновить данные'}
          </Button>
        </div>
      </div>
      {dataset && !progress && (
        <p className={styles.syncPanel__note}>
          «Обновить данные» скачивает только новое: последние месяцы и новые
          съёмки. «Полное обновление» заново скачивает всё — это дольше.
        </p>
      )}

      {!canSync && (
        <p className={styles.syncPanel__note}>
          Обновление работает только в установленном расширении.
        </p>
      )}

      {progress && (
        <div className={styles.syncPanel__progress}>
          <div className={styles.syncPanel__progressLabel}>
            <span>{progress.label}</span>
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
          <p className={styles.syncPanel__note}>
            Не закрывайте эту вкладку и вкладку Cavan, пока идёт обновление.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className={styles.syncPanel__error}>
          {error}
        </p>
      )}
    </section>
  );
};
