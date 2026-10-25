import { monthsSince } from '@/utils/format';
import type { ShootStat } from './aggregate';

export type YearStat = {
  /** `YYYY` */
  year: string;
  shoots: ShootStat[];
  /** Average time on sale of the year's shoots, in whole months. */
  avgMonthsOnSale: number | null;
  /** Published images; only the sold ones are known for manual shoots. */
  photoCount: number;
  salesCount: number;
  revenue: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Shoots grouped by the year they were uploaded, newest year first. Sales
 * and revenue are each shoot's lifetime totals. Manual shoots have no upload
 * date and count from their first published image; «No shoot» is left out.
 */
export const buildYears = (shoots: ShootStat[]): YearStat[] => {
  const byYear = new Map<string, ShootStat[]>();
  for (const shoot of shoots) {
    const date = shoot.createdAt ?? shoot.publishedAt;
    if (shoot.kind === 'unmatched' || !date) continue;
    const year = date.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), shoot]);
  }

  return [...byYear]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, yearShoots]) => {
      const onSale = yearShoots.flatMap((s) =>
        s.publishedAt ? [Math.max(0, monthsSince(s.publishedAt))] : []
      );
      return {
        year,
        shoots: yearShoots,
        avgMonthsOnSale: onSale.length
          ? Math.round(onSale.reduce((sum, m) => sum + m, 0) / onSale.length)
          : null,
        photoCount: yearShoots.reduce(
          (sum, s) => sum + (s.publishedCount ?? s.photos.length),
          0
        ),
        salesCount: yearShoots.reduce((sum, s) => sum + s.salesCount, 0),
        revenue: round(yearShoots.reduce((sum, s) => sum + s.revenue, 0)),
      };
    });
};
