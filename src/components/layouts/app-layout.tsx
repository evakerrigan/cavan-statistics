import { Outlet } from 'react-router-dom';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { useI18n } from '@/hooks/use-i18n';
import styles from './app-layout.module.scss';

const TELEGRAM_URL = 'https://t.me/EvaKerrigan';

export const AppLayout = () => {
  const { t } = useI18n();
  return (
    <div className={styles.appLayout}>
      <main className={styles.appLayout__content}>
        <Outlet />
      </main>
      <footer className={styles.appLayout__footer}>
        {t('footer.author')}{' '}
        <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
          Telegram @EvaKerrigan
        </a>
      </footer>
      <ScrollToTop />
    </div>
  );
};
