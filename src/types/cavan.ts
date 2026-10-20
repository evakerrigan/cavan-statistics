// Data collected from Cavan Images and kept in extension storage.
// Only the fields the statistics need are kept; raw API responses are
// trimmed down in `features/sync/api`.

export type Sale = {
  /** ISO date, e.g. `2026-08-15`. */
  date: string;
  amount: number;
  /** Partner agency (Adobe, Getty, …); `null` when unknown. */
  partner: string | null;
};

/** A published image on Cavan, with its sales history. */
export type Product = {
  id: number;
  fileName: string;
  headline: string;
  /** ISO date the product went live on Cavan. */
  createdAt: string | null;
  thumbUrl: string;
  url: string;
  sales: Sale[];
};

/** A published file inside a submission (a shoot). */
export type ShootPhoto = {
  itemId: number;
  fileName: string;
  headline: string | null;
  publishedAt: string | null;
  thumbUrl: string | null;
};

/** A completed submission. One submission is one shoot. */
export type Shoot = {
  id: number;
  title: string;
  /** Cavan's internal shoot code, e.g. `KSLI260925`. */
  code: string | null;
  createdAt: string;
  itemsCount: number;
  publishedCount: number;
  photos: ShootPhoto[];
};

export type MonthSaleItem = {
  productId: number | null;
  date: string;
  amount: number;
  desc: string | null;
};

export type MonthSales = {
  year: number;
  month: number;
  total: number;
  items: MonthSaleItem[];
};

/**
 * A shoot the user put together by hand, for images Cavan cannot link to any
 * submission (e.g. very old uploads). Kept separately from the synced data so
 * re-syncing never touches it.
 */
export type ManualShoot = {
  id: string;
  title: string;
  productIds: number[];
  createdAt: string;
};

export type Dataset = {
  /** ISO timestamp of the last successful sync. */
  syncedAt: string;
  /** Lifetime earnings as reported by Cavan, used to check completeness. */
  cavanTotal: number;
  cavanDownloads: number;
  /**
   * Images in the portfolio, as on the Cavan dashboard. Missing in data
   * synced before this field existed.
   */
  portfolioSize?: number;
  shoots: Shoot[];
  products: Product[];
  months: MonthSales[];
};
