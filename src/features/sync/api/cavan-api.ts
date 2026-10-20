import type { CavanSession } from '@/lib/cavan-client';
import type { MonthSales, Product, Shoot, ShootPhoto } from '@/types/cavan';

// Endpoints and payloads mirror what cavanimages.com itself sends from the
// Sales & Analytics and Submit Content pages.
const SALES_URL = '/account/photographer/api/sales';
const BATCH_LIST_URL = '/account/ingest/api/list';
const BATCH_FETCH_URL = '/account/ingest/api/fetch-batch';

// --- Raw response shapes (only the fields we read) -------------------------

type RawSaleItem = {
  product_id: number | null;
  recorded_at: string;
  payment: string;
  desc: string | null;
};

type RawOverviewResponse = {
  has_sales: number;
  total_sales: number;
  total_downloads: number;
};

type RawMonthResponse = {
  sales?: {
    year: string;
    month: string;
    month_total: string;
    items?: RawSaleItem[];
  };
};

type RawProductHistoryResponse = {
  history?: {
    product_id: number;
    original_file_name: string;
    created_at: string;
    thumb_url: string;
    url: string;
    headline: string;
    items?: { recorded_at: string; payment: string; vendor: string | null }[];
  };
};

type RawBatchSummary = {
  id: number;
  status: string;
  title: string;
  created_at: string;
  items_count: number;
  published_items_count: number;
};

type RawBatchListResponse = {
  results: {
    current_page: number;
    last_page: number;
    data: RawBatchSummary[];
  };
};

type RawBatchResponse = {
  batch: RawBatchSummary & {
    shoot_title: string | null;
    items: {
      id: number;
      headline: string | null;
      is_published: number;
      published_at: string | null;
      latest_upload: {
        original_file_name: string;
        assets?: { title: string; url: string }[];
      } | null;
    }[];
  };
};

// --- Helpers ----------------------------------------------------------------

const toAmount = (value: string | number) =>
  Math.round(Number(value) * 100) / 100;

/** `09/25/2025` -> `2025-09-25` */
const mdyToIso = (value: string): string | null => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
};

// --- API ---------------------------------------------------------------------

export const fetchSalesOverview = async (session: CavanSession) => {
  const data = await session.post<RawOverviewResponse>(SALES_URL, {
    mode: 'overview',
  });
  return {
    total: toAmount(data.total_sales ?? 0),
    downloads: data.total_downloads ?? 0,
  };
};

export const fetchMonthSales = async (
  session: CavanSession,
  year: number,
  month: number
): Promise<MonthSales> => {
  const data = await session.post<RawMonthResponse>(SALES_URL, {
    mode: 'month',
    y: year,
    m: month,
  });
  const items = data.sales?.items ?? [];
  return {
    year,
    month,
    total: toAmount(data.sales?.month_total ?? 0),
    items: items.map((item) => ({
      productId: item.product_id,
      date: item.recorded_at,
      amount: toAmount(item.payment),
      desc: item.desc,
    })),
  };
};

export const fetchProductHistory = async (
  session: CavanSession,
  productId: number
): Promise<Product | null> => {
  const data = await session.post<RawProductHistoryResponse>(SALES_URL, {
    mode: 'product-history',
    product_id: productId,
  });
  const h = data.history;
  if (!h || !h.product_id) return null;
  return {
    id: h.product_id,
    fileName: h.original_file_name,
    headline: h.headline,
    createdAt: mdyToIso(h.created_at),
    thumbUrl: h.thumb_url,
    url: h.url,
    sales: (h.items ?? []).map((item) => ({
      date: item.recorded_at,
      amount: toAmount(item.payment),
      partner: item.vendor || null,
    })),
  };
};

export const fetchCompletedBatchPage = async (
  session: CavanSession,
  page: number
) => {
  const data = await session.post<RawBatchListResponse>(BATCH_LIST_URL, {
    page,
    per_page: 10,
    tab: 'completed',
    query: '',
  });
  return {
    lastPage: data.results.last_page,
    batches: data.results.data.filter((b) => b.status === 'completed'),
  };
};

export type BatchSummary = RawBatchSummary;

export const fetchShoot = async (
  session: CavanSession,
  summary: BatchSummary
): Promise<Shoot> => {
  const { batch } = await session.post<RawBatchResponse>(BATCH_FETCH_URL, {
    batch_id: summary.id,
    step: 'completed',
  });
  const photos: ShootPhoto[] = batch.items
    .filter((item) => item.is_published && item.latest_upload)
    .map((item) => ({
      itemId: item.id,
      fileName: item.latest_upload!.original_file_name,
      headline: item.headline,
      publishedAt: item.published_at,
      thumbUrl:
        item.latest_upload!.assets?.find((a) => a.title === 'image-thumb')
          ?.url ?? null,
    }));
  return {
    id: batch.id,
    title: batch.title,
    code: batch.shoot_title,
    createdAt: batch.created_at,
    itemsCount: summary.items_count,
    publishedCount: batch.published_items_count,
    photos,
  };
};
