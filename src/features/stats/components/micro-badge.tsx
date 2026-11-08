import { useI18n } from '@/hooks/use-i18n';
import { microPhotoCount, type ShootStat } from '../utils/aggregate';
import styles from './micro-badge.module.scss';

type MicroBadgeProps = {
  /** Micro images in a shoot of `total`; shown when only some are micro. */
  count?: number;
  total?: number | null;
};

/**
 * Marks micro images and shoots. Macro is the usual case, so it gets no
 * badge.
 */
export const MicroBadge = ({ count, total }: MicroBadgeProps) => {
  const { t } = useI18n();
  const partial = count !== undefined && total != null && count < total;
  return (
    <span className={styles.badge}>
      {partial
        ? t('stats.microBadgeCount', { n: count })
        : t('stats.microBadge')}
    </span>
  );
};

/** {@link MicroBadge} for a shoot with micro images, otherwise nothing. */
export const ShootMicroBadge = ({ shoot }: { shoot: ShootStat }) => {
  const count = microPhotoCount(shoot);
  return count ? (
    <MicroBadge count={count} total={shoot.publishedCount} />
  ) : null;
};
