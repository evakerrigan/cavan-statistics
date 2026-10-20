import { type CavanSession, openCavanSession } from '@/lib/cavan-client';
import type {
  Dataset,
  MonthSales,
  PortfolioItem,
  Product,
  Shoot,
} from '@/types/cavan';
import {
  type BatchSummary,
  fetchCompletedBatchPage,
  fetchMonthSales,
  fetchPortfolioPage,
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

type OnProgress = (progress: SyncProgress) => void;
type YearMonth = { year: number; month: number };

// Cavan's own month picker goes back 60 months. If those months don't add up
// to the lifetime total, keep going back (up to this many months) until they do.
const BASE_MONTHS = 60;
const MAX_MONTHS = 180;
// On a quick update these recent months are always fetched again: Cavan may
// still add or correct sales in them.
const RECENT_MONTHS = 3;

const monthsBack = (count: number): YearMonth[] => {
  const d = new Date();
  d.setDate(1);
  const list: YearMonth[] = [];
  for (let i = 0; i < count; i++) {
    list.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    d.setMonth(d.getMonth() - 1);
  }
  return list;
};

const monthIndex = ({ year, month }: YearMonth) => year * 12 + month - 1;

const sumMonths = (months: MonthSales[]) =>
  Math.round(months.reduce((sum, m) => sum + m.total, 0) * 100) / 100;

const monthLabel = ({ year, month }: YearMonth) =>
  `Продажи за ${String(month).padStart(2, '0')}.${year}`;

/** Fetches the given months; months with no sales are dropped. */
const fetchMonths = async (
  session: CavanSession,
  calendar: YearMonth[],
  onProgress: OnProgress
) => {
  const months: MonthSales[] = [];
  for (let i = 0; i < calendar.length; i++) {
    onProgress({
      label: monthLabel(calendar[i]),
      done: i,
      total: calendar.length,
    });
    const { year, month } = calendar[i];
    const sales = await fetchMonthSales(session, year, month);
    if (sales.items.length) months.push(sales);
  }
  return months;
};

/** Every month back until the sales add up to Cavan's lifetime total. */
const fetchAllMonths = async (
  session: CavanSession,
  lifetimeTotal: number,
  onProgress: OnProgress
) => {
  const months: MonthSales[] = [];
  let total = 0;
  const calendar = monthsBack(MAX_MONTHS);
  for (let i = 0; i < calendar.length; i++) {
    if (i >= BASE_MONTHS && total >= lifetimeTotal - 0.01) break;
    onProgress({ label: monthLabel(calendar[i]), done: i, total: BASE_MONTHS });
    const { year, month } = calendar[i];
    const sales = await fetchMonthSales(session, year, month);
    if (sales.items.length) months.push(sales);
    total += sales.total;
  }
  return months;
};

const productIdsIn = (months: MonthSales[]) => [
  ...new Set(
    months.flatMap((m) =>
      m.items.flatMap((item) => (item.productId ? [item.productId] : []))
    )
  ),
];

export type CollectOptions = {
  /** Data from the previous update; enables a quick update. */
  previous: Dataset | null;
  /** Download everything again, ignoring `previous`. */
  full?: boolean;
};

/**
 * Downloads sales and shoots from Cavan. Requests go one at a time with a
 * pause between them to stay gentle on the site.
 *
 * With previous data, only what can have changed is fetched again: recent
 * months, the history of images sold in them, and new or changed
 * submissions. If the months then no longer add up to Cavan's lifetime
 * total, it falls back to a full update.
 */
export const collectDataset = async (
  onProgress: OnProgress,
  { previous, full: forceFull = false }: CollectOptions
): Promise<Dataset> => {
  onProgress({ label: 'Подключаюсь к Cavan', done: 0, total: 1 });
  const session = await openCavanSession();

  try {
    const overview = await fetchSalesOverview(session);
    const portfolioSize = await fetchPortfolioSize(session);
    let full = forceFull || !previous;

    // 1. Monthly sales.
    let months: MonthSales[];
    let changedProductIds: number[];
    if (full || !previous) {
      months = await fetchAllMonths(session, overview.total, onProgress);
      changedProductIds = productIdsIn(months);
    } else {
      // Recent months, plus every month since the previous update.
      const since = new Date(previous.syncedAt);
      const elapsed =
        monthIndex(monthsBack(1)[0]) -
        monthIndex({ year: since.getFullYear(), month: since.getMonth() + 1 });
      const calendar = monthsBack(
        Math.min(MAX_MONTHS, Math.max(0, elapsed) + RECENT_MONTHS)
      );
      const fresh = await fetchMonths(session, calendar, onProgress);
      const refetched = new Set(calendar.map(monthIndex));
      months = [
        ...previous.months.filter((m) => !refetched.has(monthIndex(m))),
        ...fresh,
      ];
      changedProductIds = productIdsIn(fresh);

      if (Math.abs(sumMonths(months) - overview.total) >= 0.01) {
        // Older sales were changed on Cavan's side: start over.
        full = true;
        months = await fetchAllMonths(session, overview.total, onProgress);
        changedProductIds = productIdsIn(months);
      }
    }
    months.sort((a, b) => monthIndex(a) - monthIndex(b));

    // 2. Sales history (with partner) of every image that sold.
    const productsById = new Map<number, Product>(
      full ? [] : (previous?.products ?? []).map((p) => [p.id, p])
    );
    for (let i = 0; i < changedProductIds.length; i++) {
      onProgress({
        label: 'История продаж фотографий',
        done: i,
        total: changedProductIds.length,
      });
      const product = await fetchProductHistory(session, changedProductIds[i]);
      if (product) productsById.set(product.id, product);
    }
    const products = [...productsById.values()];

    // 3. The whole portfolio: links every image to its Cavan shoot. Always
    // fetched again — it is only a few requests and catches new uploads.
    const photographerId = await session.photographerId();
    const portfolio: PortfolioItem[] = [];
    let portfolioPages = 1;
    for (let page = 1; page <= portfolioPages; page++) {
      onProgress({
        label: 'Портфолио',
        done: page - 1,
        total: portfolioPages,
      });
      const result = await fetchPortfolioPage(session, page, photographerId);
      portfolioPages = result.lastPage;
      portfolio.push(...result.items);
    }

    // 4. Shoots (completed submissions). Files are fetched again only for
    // new submissions or ones whose number of published files changed.
    onProgress({ label: 'Список съёмок', done: 0, total: 1 });
    const batchSummaries: BatchSummary[] = [];
    let lastPage = 1;
    for (let page = 1; page <= lastPage; page++) {
      const result = await fetchCompletedBatchPage(session, page);
      lastPage = result.lastPage;
      batchSummaries.push(...result.batches);
    }

    const previousShoots = new Map(
      full ? [] : (previous?.shoots ?? []).map((s) => [s.id, s])
    );
    const withPhotos = batchSummaries.filter(
      (b) => b.published_items_count > 0
    );
    const toFetch = withPhotos.filter(
      (b) =>
        previousShoots.get(b.id)?.publishedCount !== b.published_items_count
    );
    const fetched = new Map<number, Shoot>();
    for (let i = 0; i < toFetch.length; i++) {
      onProgress({
        label: `Съёмка «${toFetch[i].title}»`,
        done: i,
        total: toFetch.length,
      });
      fetched.set(toFetch[i].id, await fetchShoot(session, toFetch[i]));
    }
    // Reused shoots still pick up a title changed on Cavan.
    const shoots = withPhotos.map(
      (b) =>
        fetched.get(b.id) ?? { ...previousShoots.get(b.id)!, title: b.title }
    );

    return {
      syncedAt: new Date().toISOString(),
      cavanTotal: overview.total,
      cavanDownloads: overview.downloads,
      portfolioSize,
      portfolio,
      shoots,
      products,
      months,
    };
  } finally {
    await session.close();
  }
};
