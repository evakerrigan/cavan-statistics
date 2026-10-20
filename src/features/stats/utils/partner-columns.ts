/** Sort key of a partner's column. */
export const partnerSortKey = (partner: string) => `partner:${partner}`;

/** Number of table columns the partner columns take up. */
export const partnerColumnCount = (partners: string[], compact: boolean) =>
  compact ? Math.min(1, partners.length) : partners.length;
