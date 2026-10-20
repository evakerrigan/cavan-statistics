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

const plural = (n: number, one: string, few: string, many: string) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

/** Time since a date in whole months: `3 года 5 мес`, `1 год`, `7 мес`. */
export const formatDuration = (from: string | null, to = new Date()) => {
  if (!from) return '—';
  const [y, m, d] = from.slice(0, 10).split('-').map(Number);
  let months = (to.getFullYear() - y) * 12 + (to.getMonth() + 1 - m);
  if (to.getDate() < d) months -= 1;
  if (months < 1) return 'меньше месяца';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [
    years ? `${years} ${plural(years, 'год', 'года', 'лет')}` : '',
    rest ? `${rest} мес` : '',
  ]
    .filter(Boolean)
    .join(' ');
};
