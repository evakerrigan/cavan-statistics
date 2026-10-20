import { openCavanSession } from '@/lib/cavan-client';
import type { Dataset, MonthSales, Product, Shoot } from '@/types/cavan';
import {
  type BatchSummary,
  fetchCompletedBatchPage,
  fetchMonthSales,
  fetchPortfolioSize,
  fetchProductHistory,
  fetchSalesOverview,
  fetchShoot,
} from './api/cavan-api';

export type SyncProgress = {
  label: string;
  done: number;
  total: number;
};

// Cavan's own month picker goes back 60 months. If those months don't add up
// to the lifetime total, keep going back (up to this many months) until they do.
const BASE_MONTHS = 60;
const MAX_MONTHS = 180;

const monthsBack = (count: number) => {
  const d = new Date();
  d.setDate(1);
  const list: { year: number; month: number }[] = [];
  for (let i = 0; i < count; i++) {
    list.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    d.setMonth(d.getMonth() - 1);
  }
  return list;
};

/**
 * Downloads all sales and shoots from Cavan. Takes a few minutes: requests go
 * one at a time with a pause between them to stay gentle on the site.
 */
export const collectDataset = async (
  onProgress: (progress: SyncProgress) => void
): Promise<Dataset> => {
  onProgress({ label: 'Подключаюсь к Cavan', done: 0, total: 1 });
  const session = await openCavanSession();

  try {
    const overview = await fetchSalesOverview(session);
    const portfolioSize = await fetchPortfolioSize(session);

    // 1. Monthly sales.
    const months: MonthSales[] = [];
    let monthsTotal = 0;
    const calendar = monthsBack(MAX_MONTHS);
    for (let i = 0; i < calendar.length; i++) {
      if (i >= BASE_MONTHS && monthsTotal >= overview.total - 0.01) break;
      const { year, month } = calendar[i];
      onProgress({
        label: `Продажи за ${String(month).padStart(2, '0')}.${year}`,
        done: i,
        total: BASE_MONTHS,
      });
      const sales = await fetchMonthSales(session, year, month);
      if (sales.items.length) months.push(sales);
      monthsTotal += sales.total;
    }

    // 2. Sales history (with partner) of every image that ever sold.
    const productIds = [
      ...new Set(
        months.flatMap((m) =>
          m.items.flatMap((item) => (item.productId ? [item.productId] : []))
        )
      ),
    ];
    const products: Product[] = [];
    for (let i = 0; i < productIds.length; i++) {
      onProgress({
        label: 'История продаж фотографий',
        done: i,
        total: productIds.length,
      });
      const product = await fetchProductHistory(session, productIds[i]);
      if (product) products.push(product);
    }

    // 3. Shoots (completed submissions) and the files in each of them.
    onProgress({ label: 'Список съёмок', done: 0, total: 1 });
    const batchSummaries: BatchSummary[] = [];
    let lastPage = 1;
    for (let page = 1; page <= lastPage; page++) {
      const result = await fetchCompletedBatchPage(session, page);
      lastPage = result.lastPage;
      batchSummaries.push(...result.batches);
    }

    const shoots: Shoot[] = [];
    const withPhotos = batchSummaries.filter(
      (b) => b.published_items_count > 0
    );
    for (let i = 0; i < withPhotos.length; i++) {
      onProgress({
        label: `Съёмка «${withPhotos[i].title}»`,
        done: i,
        total: withPhotos.length,
      });
      shoots.push(await fetchShoot(session, withPhotos[i]));
    }

    return {
      syncedAt: new Date().toISOString(),
      cavanTotal: overview.total,
      cavanDownloads: overview.downloads,
      portfolioSize,
      shoots,
      products,
      months,
    };
  } finally {
    await session.close();
  }
};
