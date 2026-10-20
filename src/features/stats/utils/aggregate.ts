import type { Dataset, Product, Sale, Shoot } from '@/types/cavan';

export type PartnerTotals = Record<string, number>;

export type PhotoStat = {
  product: Product;
  shootId: number | null;
  sales: Sale[];
  revenue: number;
  lastSale: string | null;
  byPartner: PartnerTotals;
};

export type ShootStat = {
  /** `null` for the bucket of images that could not be matched to a shoot. */
  id: number | null;
  title: string;
  code: string | null;
  createdAt: string | null;
  publishedCount: number;
  thumbUrl: string | null;
  photos: PhotoStat[];
  salesCount: number;
  revenue: number;
  revenuePerPhoto: number;
  lastSale: string | null;
  byPartner: PartnerTotals;
};

export type MonthStat = {
  /** `YYYY-MM` */
  key: string;
  revenue: number;
  salesCount: number;
  byPartner: PartnerTotals;
};

export type Stats = {
  revenue: number;
  salesCount: number;
  soldPhotos: number;
  publishedPhotos: number;
  partners: string[];
  photos: PhotoStat[];
  shoots: ShootStat[];
  months: MonthStat[];
  /** Sales that Cavan reports without an image (e.g. one-time payments). */
  otherRevenue: number;
  cavanTotal: number;
};

export const UNKNOWN_PARTNER = 'Другое';

const round = (n: number) => Math.round(n * 100) / 100;
const normalizeName = (name: string) => name.trim().toLowerCase();
const partnerOf = (sale: Sale) => sale.partner ?? UNKNOWN_PARTNER;

const addTo = (totals: PartnerTotals, key: string, amount: number) => {
  totals[key] = round((totals[key] ?? 0) + amount);
};

const latest = (a: string | null, b: string | null) =>
  !a ? b : !b ? a : a > b ? a : b;

const dayDistance = (a: string | null, b: string | null) =>
  a && b
    ? Math.abs(new Date(a).getTime() - new Date(b).getTime())
    : Number.POSITIVE_INFINITY;

/**
 * Cavan's sales data knows products, its submissions know uploaded files —
 * there is no shared ID. Match on the original file name, then narrow down
 * duplicates by headline and by publish date.
 */
export const matchProductsToShoots = (
  products: Product[],
  shoots: Shoot[]
): Map<number, number> => {
  type Candidate = {
    shootId: number;
    headline: string | null;
    date: string | null;
  };
  const byName = new Map<string, Candidate[]>();
  const byHeadline = new Map<string, Candidate[]>();

  for (const shoot of shoots) {
    for (const photo of shoot.photos) {
      const candidate = {
        shootId: shoot.id,
        headline: photo.headline,
        date: photo.publishedAt,
      };
      const name = normalizeName(photo.fileName);
      byName.set(name, [...(byName.get(name) ?? []), candidate]);
      if (photo.headline) {
        const h = photo.headline.trim();
        byHeadline.set(h, [...(byHeadline.get(h) ?? []), candidate]);
      }
    }
  }

  const result = new Map<number, number>();
  for (const product of products) {
    let candidates = byName.get(normalizeName(product.fileName)) ?? [];

    if (candidates.length > 1) {
      const sameHeadline = candidates.filter(
        (c) => c.headline?.trim() === product.headline.trim()
      );
      if (sameHeadline.length) candidates = sameHeadline;
    }
    if (!candidates.length) {
      // File renamed on upload: fall back to an unambiguous headline.
      const sameHeadline = byHeadline.get(product.headline.trim()) ?? [];
      if (new Set(sameHeadline.map((c) => c.shootId)).size === 1) {
        candidates = sameHeadline;
      }
    }
    if (!candidates.length) continue;

    const best = [...candidates].sort(
      (a, b) =>
        dayDistance(a.date, product.createdAt) -
        dayDistance(b.date, product.createdAt)
    )[0];
    result.set(product.id, best.shootId);
  }
  return result;
};

/** Sales for one product: its full history, or the monthly rows as a fallback. */
const salesForProduct = (product: Product, dataset: Dataset): Sale[] => {
  if (product.sales.length) return product.sales;
  return dataset.months.flatMap((m) =>
    m.items
      .filter((item) => item.productId === product.id)
      .map((item) => ({ date: item.date, amount: item.amount, partner: null }))
  );
};

export const buildStats = (dataset: Dataset): Stats => {
  const shootOf = matchProductsToShoots(dataset.products, dataset.shoots);

  const photos: PhotoStat[] = dataset.products.map((product) => {
    const sales = salesForProduct(product, dataset);
    const byPartner: PartnerTotals = {};
    for (const sale of sales) addTo(byPartner, partnerOf(sale), sale.amount);
    return {
      product,
      shootId: shootOf.get(product.id) ?? null,
      sales,
      revenue: round(sales.reduce((sum, s) => sum + s.amount, 0)),
      lastSale: sales.reduce<string | null>((d, s) => latest(d, s.date), null),
      byPartner,
    };
  });
  photos.sort((a, b) => b.revenue - a.revenue);

  const otherSales: Sale[] = dataset.months.flatMap((m) =>
    m.items
      .filter((item) => !item.productId)
      .map((item) => ({ date: item.date, amount: item.amount, partner: null }))
  );

  // Shoots
  const makeShoot = (
    shoot: Shoot | null,
    shootPhotos: PhotoStat[]
  ): ShootStat => {
    const byPartner: PartnerTotals = {};
    let salesCount = 0;
    let lastSale: string | null = null;
    for (const photo of shootPhotos) {
      salesCount += photo.sales.length;
      lastSale = latest(lastSale, photo.lastSale);
      for (const [partner, amount] of Object.entries(photo.byPartner)) {
        addTo(byPartner, partner, amount);
      }
    }
    const revenue = round(shootPhotos.reduce((sum, p) => sum + p.revenue, 0));
    const publishedCount = shoot ? shoot.publishedCount : shootPhotos.length;
    return {
      id: shoot?.id ?? null,
      title: shoot?.title ?? 'Без съёмки',
      code: shoot?.code ?? null,
      createdAt: shoot?.createdAt ?? null,
      publishedCount,
      thumbUrl:
        shootPhotos[0]?.product.thumbUrl ?? shoot?.photos[0]?.thumbUrl ?? null,
      photos: shootPhotos,
      salesCount,
      revenue,
      revenuePerPhoto: publishedCount ? round(revenue / publishedCount) : 0,
      lastSale,
      byPartner,
    };
  };

  const shoots = dataset.shoots.map((shoot) =>
    makeShoot(
      shoot,
      photos.filter((p) => p.shootId === shoot.id)
    )
  );
  const unmatched = photos.filter((p) => p.shootId === null);
  if (unmatched.length) shoots.push(makeShoot(null, unmatched));
  shoots.sort((a, b) => b.revenue - a.revenue);

  // Months
  const monthMap = new Map<string, MonthStat>();
  for (const sale of [...photos.flatMap((p) => p.sales), ...otherSales]) {
    const key = sale.date.slice(0, 7);
    const month = monthMap.get(key) ?? {
      key,
      revenue: 0,
      salesCount: 0,
      byPartner: {},
    };
    month.revenue = round(month.revenue + sale.amount);
    month.salesCount += 1;
    addTo(month.byPartner, partnerOf(sale), sale.amount);
    monthMap.set(key, month);
  }
  const months = [...monthMap.values()].sort((a, b) =>
    a.key.localeCompare(b.key)
  );

  const partnerTotals: PartnerTotals = {};
  for (const m of months) {
    for (const [partner, amount] of Object.entries(m.byPartner)) {
      addTo(partnerTotals, partner, amount);
    }
  }

  const otherRevenue = round(otherSales.reduce((sum, s) => sum + s.amount, 0));

  return {
    revenue: round(months.reduce((sum, m) => sum + m.revenue, 0)),
    salesCount: months.reduce((sum, m) => sum + m.salesCount, 0),
    soldPhotos: photos.filter((p) => p.sales.length).length,
    publishedPhotos: dataset.shoots.reduce(
      (sum, s) => sum + s.publishedCount,
      0
    ),
    partners: Object.keys(partnerTotals).sort(
      (a, b) => partnerTotals[b] - partnerTotals[a]
    ),
    photos,
    shoots,
    months,
    otherRevenue,
    cavanTotal: dataset.cavanTotal,
  };
};
