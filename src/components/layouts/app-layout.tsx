import { Outlet } from 'react-router-dom';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import styles from './app-layout.module.scss';

const TELEGRAM_URL = 'https://t.me/EvaKerrigan';

export const AppLayout = () => {
  return (
    <div className={styles.appLayout}>
      <main className={styles.appLayout__content}>
        <Outlet />
      </main>
      <footer className={styles.appLayout__footer}>
        Автор — Ева. Вопросы и предложения:{' '}
        <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
          Telegram @EvaKerrigan
        </a>
      </footer>
      <ScrollToTop />
    </div>
  );
};
