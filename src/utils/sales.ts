import type { Sale } from '@/types/cavan';

/**
 * Identifies a sale by its day and amount: the only fields Cavan's monthly
 * reports and an image's sales history have in common.
 */
export const saleKey = (date: string, amount: number) =>
  `${date.slice(0, 10)}|${amount.toFixed(2)}`;

/**
 * Partners of the given sales, queued by {@link saleKey}. A sale with no
 * partner queues `null`: it is known, only sold without a partner.
 */
export const partnersByKey = (sales: Sale[]) => {
  const partners = new Map<string, (string | null)[]>();
  for (const sale of sales) {
    const key = saleKey(sale.date, sale.amount);
    partners.set(key, [...(partners.get(key) ?? []), sale.partner]);
  }
  return partners;
};
