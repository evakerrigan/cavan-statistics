import { useI18n } from '@/hooks/use-i18n';
import { formatMoney, formatPercent } from '@/utils/format';
import type { CollectionStat } from '../utils/aggregate';
import styles from './stats-view.module.scss';

const moneyOrDash = (value: number | null) =>
  value === null ? '—' : formatMoney(value);

/** The overview totals split into macro and micro, one row each. */
export const CollectionRows = ({
  collections,
}: {
  collections: CollectionStat[];
}) => {
  const { t } = useI18n();
  if (!collections.length) return null;

  return (
    <div className={styles.split}>
      <table className={styles.split__table}>
        <thead>
          <tr>
            <th>{t('stats.collection')}</th>
            <th>{t('stats.earned')}</th>
            <th>{t('stats.sales')}</th>
            <th>{t('stats.soldPhotos')}</th>
            <th>{t('stats.collectionSuccess')}</th>
            <th>{t('stats.shoots')}</th>
            <th>{t('stats.perSold')}</th>
            <th>{t('stats.perPortfolio')}</th>
          </tr>
        </thead>
        <tbody>
          {collections.map((c) => (
            <tr key={c.collection}>
              <th scope="row">{t(`stats.${c.collection}`)}</th>
              <td className={styles.split__strong}>{formatMoney(c.revenue)}</td>
              <td>{c.salesCount}</td>
              <td>
                {c.soldPhotos}
                <span className={styles.tile__of}>
                  {' '}
                  {t('stats.of', { n: c.publishedPhotos })}
                </span>
              </td>
              <td>{formatPercent(c.soldPhotos / c.publishedPhotos)}</td>
              <td>{c.shoots}</td>
              <td>{moneyOrDash(c.revenuePerSoldPhoto)}</td>
              <td>{moneyOrDash(c.revenuePerPortfolioPhoto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
