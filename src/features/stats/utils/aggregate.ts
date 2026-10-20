import type {
  Dataset,
  ManualShoot,
  PortfolioItem,
  Product,
  Sale,
  Shoot,
  ShootMerges,
  ShootPhoto,
  ShootTitles,
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
 * - `legacy`: an older Cavan shoot with no submission in Submit Content,
 *   recovered from the portfolio
 * - `manual`: a shoot the user created by hand
 * - `unmatched`: images that belong to no shoot yet
 */
export type ShootKind = 'cavan' | 'legacy' | 'manual' | 'unmatched';

export type ShootStat = {
  key: string;
  kind: ShootKind;
  /** Cavan submission ID (`cavan` only). */
  cavanId: number | null;
  /** Cavan's internal shoot ID (`legacy` only). */
  legacyId: number | null;
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
  /** Published files with no sales (`cavan` and `legacy`). */
  unsoldPhotos: ShootPhoto[];
  salesCount: number;
  revenue: number;
  revenuePerPhoto: number | null;
  lastSale: string | null;
  byPartner: PartnerTotals;
  /** Shoots the user joined into this one. */
  mergedFrom: { key: string; title: string }[];
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
  /** Portfolio size from Cavan, or the published files of known shoots. */
  publishedPhotos: number;
  /** Revenue per image that sold at least once. */
  revenuePerSoldPhoto: number | null;
  /** Revenue per image in the whole portfolio. */
  revenuePerPortfolioPhoto: number | null;
  partners: string[];
  photos: PhotoStat[];
  shoots: ShootStat[];
  months: MonthStat[];
  /** Sales that Cavan reports without an image (e.g. one-time payments). */
  otherRevenue: number;
  cavanTotal: number;
};

/** Partner key for sales without one; shown translated in the UI. */
export const UNKNOWN_PARTNER = 'other';
export const UNMATCHED_KEY = 'unmatched';

export const cavanShootKey = (id: number) => `cavan:${id}`;
export const legacyShootKey = (id: number) => `legacy:${id}`;
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

/**
 * `CR_KSLI210609-767409-01.jpg` -> `{ code: 'KSLI210609', itemId: 767409 }`.
 * The collection prefix varies (`CR_`, `R_`, …), so any prefix is accepted.
 */
export const parseCavanFileName = (name: string | null) => {
  const m = /^(?:[A-Za-z]+_)?([A-Za-z0-9]+)-(\d+)-\d+/.exec(name ?? '');
  return m ? { code: m[1], itemId: Number(m[2]) } : null;
};

/** Values that map to exactly one shoot; ambiguous ones are dropped. */
const uniqueIndex = (entries: [string, number][]) => {
  const index = new Map<string, number | null>();
  for (const [key, shootId] of entries) {
    const seen = index.get(key);
    index.set(key, seen === undefined || seen === shootId ? shootId : null);
  }
  return index;
};

/**
 * The shoot of every portfolio image, by product ID. The portfolio file name
 * carries the submission item ID, which links an image to its submission
 * exactly; the shoot code and the original file name are fallbacks. Images
 * whose Cavan shoot has no visible submission (very old uploads) are grouped
 * by that shoot.
 */
export const groupPortfolio = (
  portfolio: PortfolioItem[],
  shoots: Shoot[]
): Map<number, string> => {
  const batchOfItem = new Map<number, number>();
  for (const shoot of shoots) {
    for (const photo of shoot.photos) batchOfItem.set(photo.itemId, shoot.id);
  }
  const batchOfCode = uniqueIndex(
    shoots.flatMap((s) => (s.code ? [[s.code, s.id] as [string, number]] : []))
  );
  const batchOfName = uniqueIndex(
    shoots.flatMap((s) =>
      s.photos.map((p) => [normalizeName(p.fileName), s.id] as [string, number])
    )
  );

  const batchOfShoot = new Map<number, number>();
  for (const item of portfolio) {
    const parsed = parseCavanFileName(item.cavanFileName);
    const batchId =
      (parsed && batchOfItem.get(parsed.itemId)) ??
      (parsed && batchOfCode.get(parsed.code)) ??
      batchOfName.get(normalizeName(item.fileName)) ??
      undefined;
    if (batchId) batchOfShoot.set(item.shootId, batchId);
  }
  return new Map(
    portfolio.map((item) => {
      const batchId = batchOfShoot.get(item.shootId);
      return [
        item.id,
        batchId === undefined
          ? legacyShootKey(item.shootId)
          : cavanShootKey(batchId),
      ];
    })
  );
};

/** Only Cavan shoots can be joined; hand-made ones are edited directly. */
export const isMergeable = (shoot: ShootStat) =>
  shoot.kind === 'cavan' || shoot.kind === 'legacy';

/** Follows merge links to the shoot that finally takes in `key`. */
const resolveMerge = (
  key: string,
  merges: ShootMerges,
  existing: Set<string>
) => {
  const path = [key];
  for (;;) {
    const next = merges[path[path.length - 1]];
    if (!next || !existing.has(next)) return path[path.length - 1];
    const loopStart = path.indexOf(next);
    if (loopStart >= 0) {
      // A loop of merges: settle on one member, the same from any start.
      return [...path.slice(loopStart)].sort()[0];
    }
    path.push(next);
  }
};

const combineShoots = (target: ShootStat, sources: ShootStat[]): ShootStat => {
  const all = [target, ...sources];
  const photos = all
    .flatMap((s) => s.photos)
    .sort((a, b) => b.revenue - a.revenue);
  const byPartner: PartnerTotals = {};
  for (const shoot of all) {
    for (const [partner, amount] of Object.entries(shoot.byPartner)) {
      addTo(byPartner, partner, amount);
    }
  }
  const revenue = round(all.reduce((sum, s) => sum + s.revenue, 0));
  const publishedCount = all.every((s) => s.publishedCount !== null)
    ? all.reduce((sum, s) => sum + (s.publishedCount ?? 0), 0)
    : null;
  return {
    ...target,
    createdAt: earliest(all.map((s) => s.createdAt)),
    publishedAt: earliest(all.map((s) => s.publishedAt)),
    publishedCount,
    thumbUrl: photos[0]?.product.thumbUrl ?? target.thumbUrl,
    photos,
    unsoldPhotos: all.flatMap((s) => s.unsoldPhotos),
    salesCount: all.reduce((sum, s) => sum + s.salesCount, 0),
    revenue,
    revenuePerPhoto: publishedCount ? round(revenue / publishedCount) : null,
    lastSale: all.reduce<string | null>((d, s) => latest(d, s.lastSale), null),
    byPartner,
    mergedFrom: sources.map((s) => ({ key: s.key, title: s.title })),
  };
};

/** Folds every joined shoot into the shoot it was joined to. */
const foldMerges = (shoots: ShootStat[], merges: ShootMerges) => {
  const existing = new Set(shoots.filter(isMergeable).map((s) => s.key));
  const resolve = (key: string) =>
    existing.has(key) ? resolveMerge(key, merges, existing) : key;

  const sourcesOf = new Map<string, ShootStat[]>();
  for (const shoot of shoots) {
    const target = resolve(shoot.key);
    if (target !== shoot.key) {
      sourcesOf.set(target, [...(sourcesOf.get(target) ?? []), shoot]);
    }
  }
  const folded = shoots
    .filter((s) => resolve(s.key) === s.key)
    .map((s) =>
      sourcesOf.has(s.key) ? combineShoots(s, sourcesOf.get(s.key)!) : s
    );
  return { shoots: folded, resolve };
};

const portfolioToShootPhoto = (item: PortfolioItem): ShootPhoto => ({
  itemId: item.id,
  fileName: item.fileName,
  headline: item.headline,
  publishedAt: item.createdAt,
  thumbUrl: item.thumbUrl,
});

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
  manualShoots: ManualShoot[] = [],
  shootTitles: ShootTitles = {},
  shootMerges: ShootMerges = {}
): Stats => {
  const portfolio = dataset.portfolio ?? [];
  const portfolioGroups = groupPortfolio(portfolio, dataset.shoots);
  // Name matching is the fallback for images missing from the portfolio
  // (and for data synced before the portfolio was collected).
  const matches = matchProductsToShoots(dataset.products, dataset.shoots);

  // Priority: the user's manual assignment, then the portfolio, then names.
  const shootKeyOf = new Map<number, string>();
  for (const [productId, match] of matches) {
    shootKeyOf.set(productId, cavanShootKey(match.shootId));
  }
  for (const [productId, key] of portfolioGroups) {
    shootKeyOf.set(productId, key);
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
    | 'legacyId'
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
      mergedFrom: [],
    };
  };

  const photosOf = (key: string | null) =>
    photos.filter((p) => p.shootKey === key);

  const soldProductIds = new Set(photos.map((p) => p.product.id));
  const portfolioOf = new Map<string, PortfolioItem[]>();
  for (const item of portfolio) {
    const key = portfolioGroups.get(item.id)!;
    portfolioOf.set(key, [...(portfolioOf.get(key) ?? []), item]);
  }
  const unsoldInPortfolio = (key: string) =>
    (portfolioOf.get(key) ?? [])
      .filter((item) => !soldProductIds.has(item.id))
      .map(portfolioToShootPhoto);

  const shoots = dataset.shoots.map((shoot) => {
    const key = cavanShootKey(shoot.id);
    const inPortfolio = portfolioOf.get(key)?.length ?? 0;
    return makeShoot(
      {
        key,
        kind: 'cavan',
        cavanId: shoot.id,
        legacyId: null,
        manualId: null,
        title: shoot.title,
        code: shoot.code,
        createdAt: shoot.createdAt,
        publishedAt: earliest(shoot.photos.map((p) => p.publishedAt)),
        publishedCount: inPortfolio || shoot.publishedCount,
        unsoldPhotos: inPortfolio
          ? unsoldInPortfolio(key)
          : shoot.photos.filter((p) => !soldItemIds.has(p.itemId)),
      },
      photosOf(key)
    );
  });
  for (const [key, items] of portfolioOf) {
    if (!key.startsWith('legacy:')) continue;
    const code = parseCavanFileName(items[0].cavanFileName)?.code ?? null;
    const firstDate = earliest(items.map((i) => i.createdAt));
    shoots.push(
      makeShoot(
        {
          key,
          kind: 'legacy',
          cavanId: null,
          legacyId: items[0].shootId,
          manualId: null,
          title: shootTitles[key] || code || `#${items[0].shootId}`,
          code,
          createdAt: firstDate,
          publishedAt: firstDate,
          publishedCount: items.length,
          unsoldPhotos: unsoldInPortfolio(key),
        },
        photosOf(key)
      )
    );
  }
  for (const manual of manualShoots) {
    const shootPhotos = photosOf(manualShootKey(manual.id));
    if (!shootPhotos.length) continue;
    shoots.push(
      makeShoot(
        {
          key: manualShootKey(manual.id),
          kind: 'manual',
          cavanId: null,
          legacyId: null,
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
          legacyId: null,
          manualId: null,
          // Shown translated in the UI (see `shoot-labels.ts`).
          title: '',
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
  const merged = foldMerges(shoots, shootMerges);
  merged.shoots.sort((a, b) => b.revenue - a.revenue);
  const finalPhotos = photos.map((p) =>
    p.shootKey ? { ...p, shootKey: merged.resolve(p.shootKey) } : p
  );

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
  const revenue = round(months.reduce((sum, m) => sum + m.revenue, 0));
  const soldPhotos = photos.filter((p) => p.sales.length).length;
  const publishedPhotos =
    dataset.portfolioSize ||
    portfolio.length ||
    dataset.shoots.reduce((sum, s) => sum + s.publishedCount, 0);

  return {
    revenue,
    salesCount: months.reduce((sum, m) => sum + m.salesCount, 0),
    soldPhotos,
    publishedPhotos,
    revenuePerSoldPhoto: soldPhotos ? round(revenue / soldPhotos) : null,
    revenuePerPortfolioPhoto: publishedPhotos
      ? round(revenue / publishedPhotos)
      : null,
    partners: Object.keys(partnerTotals).sort(
      (a, b) => partnerTotals[b] - partnerTotals[a]
    ),
    photos: finalPhotos,
    shoots: merged.shoots,
    months,
    otherRevenue,
    cavanTotal: dataset.cavanTotal,
  };
};
