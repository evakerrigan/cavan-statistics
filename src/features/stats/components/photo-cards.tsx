import { useI18n } from '@/hooks/use-i18n';
import { CAVAN_ORIGIN } from '@/lib/cavan-client';
import { formatDate, formatMoney } from '@/utils/format';
import type { PhotoStat } from '../utils/aggregate';
import { partnerSortKey } from '../utils/partner-columns';
import { partnerLabel } from '../utils/shoot-labels';
import { CardStat } from './card-stat';
import type { SortState } from './sort-header';
import { SortBar } from './sort-bar';
import cardStyles from './cards.module.scss';
import styles from './table.module.scss';

type PhotoCardsProps = SortState & {
  /** Already sorted and filtered. */
  photos: PhotoStat[];
  partners: string[];
  shootTitleOf: (photo: PhotoStat) => string;
  emptyText: string;
};

/** The photos table as cards, for narrow screens. */
export const PhotoCards = ({
  photos,
  partners,
  shootTitleOf,
  emptyText,
  sortKey,
  direction,
  onSort,
}: PhotoCardsProps) => {
  const { t } = useI18n();
  const sorted = (key: string) => key === sortKey;

  const options = [
    { label: t('col.revenue'), columnKey: 'revenue' },
    { label: t('col.sales'), columnKey: 'sales' },
    { label: t('photos.col.lastSale'), columnKey: 'lastSale' },
    { label: t('photos.col.photo'), columnKey: 'id' },
    { label: t('col.shoot'), columnKey: 'shoot' },
    ...partners.map((p) => ({
      label: partnerLabel(p, t),
      columnKey: partnerSortKey(p),
    })),
  ];

  return (
    <>
      <SortBar
        options={options}
        sortKey={sortKey}
        direction={direction}
        onSort={onSort}
      />
      {photos.length === 0 && (
        <p className={styles.table__empty}>{emptyText}</p>
      )}
      <div className={cardStyles.cards}>
        {photos.map((photo) => (
          <article key={photo.product.id} className={cardStyles.card}>
            <div className={cardStyles.card__head}>
              <img
                src={photo.product.thumbUrl}
                alt=""
                loading="lazy"
                className={styles.table__thumb}
              />
              <div className={cardStyles.card__text}>
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
              </div>
            </div>
            <div className={cardStyles.card__stats}>
              <CardStat
                label={t('col.revenue')}
                value={formatMoney(photo.revenue)}
                revenue
                highlighted={sorted('revenue')}
              />
              <CardStat
                label={t('col.sales')}
                value={photo.sales.length}
                highlighted={sorted('sales')}
              />
              <CardStat
                label={t('photos.col.lastSale')}
                value={formatDate(photo.lastSale)}
                highlighted={sorted('lastSale')}
              />
              <CardStat
                label={t('col.shoot')}
                value={shootTitleOf(photo)}
                highlighted={sorted('shoot')}
              />
              {partners.map((p) => (
                <CardStat
                  key={p}
                  label={partnerLabel(p, t)}
                  value={
                    photo.byPartner[p] ? formatMoney(photo.byPartner[p]) : '—'
                  }
                  highlighted={sorted(partnerSortKey(p))}
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
};
