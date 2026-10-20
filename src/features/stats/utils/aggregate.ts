import type {
  Dataset,
  ManualShoot,
  Product,
  Sale,
  Shoot,
  ShootPhoto,
} from '@/types/cavan';

export type PartnerTotals = Record<string, number>;

export type PhotoStat = {
  product: Product;
  /** {@link ShootStat.key} of the shoot this image belongs to. */
  shootKey: string | null;
  sales: Sale[];
  revenue: number;
  lastSale: string | null;
  byPartner: PartnerTotals;
};

/**
 * - `cavan`: a submission synced from Cavan
 * - `manual`: a shoot the user created by hand
 * - `unmatched`: images that belong to no shoot yet
 */
export type ShootKind = 'cavan' | 'manual' | 'unmatched';

export type ShootStat = {
  key: string;
  kind: ShootKind;
  /** Cavan submission ID (`cavan` only). */
  cavanId: number | null;
  /** {@link ManualShoot.id} (`manual` only). */
  manualId: string | null;
  title: string;
  code: string | null;
  /** When the submission was created (`cavan` only). */
  createdAt: string | null;
  /**
   * When the shoot went on sale: its first published file for a Cavan
   * submission, otherwise the earliest go-live date of its sold images.
   */
  publishedAt: string | null;
  /** Unknown for manual shoots: only their sold images are known. */
  publishedCount: number | null;
  thumbUrl: string | null;
  /** Images with at least one sale. */
  photos: PhotoStat[];
  /** Published files with no sales (`cavan` only). */
  unsoldPhotos: ShootPhoto[];
  salesCount: number;
  revenue: number;
  revenuePerPhoto: number | null;
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
export const UNMATCHED_KEY = 'unmatched';

export const cavanShootKey = (id: number) => `cavan:${id}`;
export const manualShootKey = (id: string) => `manual:${id}`;

const round = (n: number) => Math.round(n * 100) / 100;
const normalizeName = (name: string) => name.trim().toLowerCase();
const partnerOf = (sale: Sale) => sale.partner ?? UNKNOWN_PARTNER;

const addTo = (totals: PartnerTotals, key: string, amount: number) => {
  totals[key] = round((totals[key] ?? 0) + amount);
};

const latest = (a: string | null, b: string | null) =>
  !a ? b : !b ? a : a > b ? a : b;

const earliest = (dates: (string | null)[]) =>
  dates.reduce<string | null>(
    (min, d) => (d && (!min || d < min) ? d : min),
    null
  );

const dayDistance = (a: string | null, b: string | null) =>
  a && b
    ? Math.abs(new Date(a).getTime() - new Date(b).getTime())
    : Number.POSITIVE_INFINITY;

/**
 * Cavan's sales data knows products, its submissions know uploaded files —
 * there is no shared ID. Match on the original file name, then narrow down
 * duplicates by headline and by publish date.
 */
export type ShootMatch = { shootId: number; itemId: number };

export const matchProductsToShoots = (
  products: Product[],
  shoots: Shoot[]
): Map<number, ShootMatch> => {
  type Candidate = {
    shootId: number;
    itemId: number;
    headline: string | null;
    date: string | null;
  };
  const byName = new Map<string, Candidate[]>();
  const byHeadline = new Map<string, Candidate[]>();

  for (const shoot of shoots) {
    for (const photo of shoot.photos) {
      const candidate = {
        shootId: shoot.id,
        itemId: photo.itemId,
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

  const result = new Map<number, ShootMatch>();
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
    result.set(product.id, { shootId: best.shootId, itemId: best.itemId });
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

export const buildStats = (
  dataset: Dataset,
  manualShoots: ManualShoot[] = []
): Stats => {
  const matches = matchProductsToShoots(dataset.products, dataset.shoots);

  // A manual assignment is the user's explicit choice, so it wins.
  const shootKeyOf = new Map<number, string>();
  for (const [productId, match] of matches) {
    shootKeyOf.set(productId, cavanShootKey(match.shootId));
  }
  for (const manual of manualShoots) {
    for (const productId of manual.productIds) {
      shootKeyOf.set(productId, manualShootKey(manual.id));
    }
  }
  const soldItemIds = new Set(
    [...matches]
      .filter(([productId]) => shootKeyOf.get(productId)?.startsWith('cavan:'))
      .map(([, match]) => match.itemId)
  );

  const photos: PhotoStat[] = dataset.products.map((product) => {
    const sales = salesForProduct(product, dataset);
    const byPartner: PartnerTotals = {};
    for (const sale of sales) addTo(byPartner, partnerOf(sale), sale.amount);
    return {
      product,
      shootKey: shootKeyOf.get(product.id) ?? null,
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
  type ShootBase = Pick<
    ShootStat,
    | 'key'
    | 'kind'
    | 'cavanId'
    | 'manualId'
    | 'title'
    | 'code'
    | 'createdAt'
    | 'publishedAt'
    | 'publishedCount'
    | 'unsoldPhotos'
  >;

  const makeShoot = (base: ShootBase, shootPhotos: PhotoStat[]): ShootStat => {
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
    return {
      ...base,
      publishedAt:
        base.publishedAt ??
        earliest(shootPhotos.map((p) => p.product.createdAt)),
      thumbUrl:
        shootPhotos[0]?.product.thumbUrl ??
        base.unsoldPhotos[0]?.thumbUrl ??
        null,
      photos: shootPhotos,
      salesCount,
      revenue,
      revenuePerPhoto: base.publishedCount
        ? round(revenue / base.publishedCount)
        : null,
      lastSale,
      byPartner,
    };
  };

  const photosOf = (key: string | null) =>
    photos.filter((p) => p.shootKey === key);

  const shoots = dataset.shoots.map((shoot) =>
    makeShoot(
      {
        key: cavanShootKey(shoot.id),
        kind: 'cavan',
        cavanId: shoot.id,
        manualId: null,
        title: shoot.title,
        code: shoot.code,
        createdAt: shoot.createdAt,
        publishedAt: earliest(shoot.photos.map((p) => p.publishedAt)),
        publishedCount: shoot.publishedCount,
        unsoldPhotos: shoot.photos.filter((p) => !soldItemIds.has(p.itemId)),
      },
      photosOf(cavanShootKey(shoot.id))
    )
  );
  for (const manual of manualShoots) {
    const shootPhotos = photosOf(manualShootKey(manual.id));
    if (!shootPhotos.length) continue;
    shoots.push(
      makeShoot(
        {
          key: manualShootKey(manual.id),
          kind: 'manual',
          cavanId: null,
          manualId: manual.id,
          title: manual.title,
          code: null,
          createdAt: null,
          publishedAt: null,
          publishedCount: null,
          unsoldPhotos: [],
        },
        shootPhotos
      )
    );
  }
  const unmatched = photosOf(null);
  if (unmatched.length) {
    shoots.push(
      makeShoot(
        {
          key: UNMATCHED_KEY,
          kind: 'unmatched',
          cavanId: null,
          manualId: null,
          title: 'Без съёмки',
          code: null,
          createdAt: null,
          publishedAt: null,
          publishedCount: null,
          unsoldPhotos: [],
        },
        unmatched
      )
    );
  }
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
