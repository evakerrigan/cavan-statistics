import { useEffect, useState } from 'react';
import { StatsView } from '@/features/stats';
import { SyncPanel } from '@/features/sync';
import { loadDataset } from '@/lib/storage';
import type { Dataset } from '@/types/cavan';
import styles from './dashboard.module.scss';

export const DashboardRoute = () => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadDataset().then((stored) => {
      setDataset(stored);
      setLoaded(true);
    });
  }, []);

  return (
    <div className={styles.dashboard}>
      <SyncPanel dataset={dataset} onSynced={setDataset} />
      {loaded && dataset && <StatsView dataset={dataset} />}
      {loaded && !dataset && (
        <div className={styles.dashboard__empty}>
          <p>
            Откройте cavanimages.com в этом браузере, войдите в аккаунт и
            нажмите «Обновить данные». Плагин соберёт все продажи и съёмки — это
            займёт несколько минут.
          </p>
        </div>
      )}
    </div>
  );
};
