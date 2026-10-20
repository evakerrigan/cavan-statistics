const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatMoney = (value: number) => money.format(value);

/** `2026-08-15` or a full ISO timestamp -> `15.08.2026` */
export const formatDate = (value: string | null) => {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};

const MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

/** `2026-08` -> `авг 2026` */
export const formatMonth = (key: string) => {
  const [y, m] = key.split('-');
  return `${MONTHS_SHORT[Number(m) - 1]} ${y}`;
};

/** `2026-08` -> `авг` */
export const formatMonthShort = (key: string) =>
  MONTHS_SHORT[Number(key.split('-')[1]) - 1];
