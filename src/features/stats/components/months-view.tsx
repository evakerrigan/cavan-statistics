import { useMemo, useState } from 'react';
import { formatMoney, formatMonth, formatMonthShort } from '@/utils/format';
import type { MonthStat } from '../utils/aggregate';
import styles from './table.module.scss';
import chartStyles from './months-view.module.scss';

type MonthsViewProps = {
  months: MonthStat[];
  partners: string[];
};

const RANGES = [
  { label: '12 мес', count: 12 },
  { label: '24 мес', count: 24 },
  { label: 'Всё время', count: Infinity },
] as const;

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Every month from the first sale up to now, with empty months as zero. */
const fillMonths = (months: MonthStat[]): MonthStat[] => {
  if (!months.length) return [];
  const byKey = new Map(months.map((m) => [m.key, m]));
  const [y, m] = months[0].key.split('-').map(Number);
  const cursor = new Date(y, m - 1, 1);
  const end = monthKey(new Date());
  const result: MonthStat[] = [];
  for (let key = monthKey(cursor); key <= end; key = monthKey(cursor)) {
    result.push(
      byKey.get(key) ?? { key, revenue: 0, salesCount: 0, byPartner: {} }
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
};

/** A round axis maximum with 4–5 clean ticks. */
const niceTicks = (max: number) => {
  if (max <= 0) return [0];
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((k) => k * pow).find((s) => s >= rough)!;
  const ticks = [];
  for (let t = 0; t <= max + step * 0.999; t += step) ticks.push(t);
  return ticks;
};

export const MonthsView = ({ months, partners }: MonthsViewProps) => {
  const [range, setRange] = useState<number>(24);
  const [hovered, setHovered] = useState<string | null>(null);

  const allMonths = useMemo(() => fillMonths(months), [months]);
  const visible = useMemo(
    () => (Number.isFinite(range) ? allMonths.slice(-range) : allMonths),
    [allMonths, range]
  );
  const ticks = niceTicks(Math.max(0, ...visible.map((m) => m.revenue)));
  const axisMax = ticks[ticks.length - 1] || 1;
  const labelEvery = Math.ceil(visible.length / 24);

  return (
    <>
      <div className={chartStyles.toolbar}>
        <h2 className={chartStyles.title}>Доход по месяцам</h2>
        <div className={chartStyles.ranges} role="group" aria-label="Период">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              className={`${chartStyles.range} ${range === r.count ? chartStyles.rangeActive : ''}`}
              aria-pressed={range === r.count}
              onClick={() => setRange(r.count)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className={chartStyles.chart}>
        <div className={chartStyles.plot}>
          {ticks.map((t) => (
            <div
              key={t}
              className={chartStyles.gridline}
              style={{ bottom: `${(t / axisMax) * 100}%` }}
            >
              <span className={chartStyles.tick}>${t}</span>
            </div>
          ))}
          <div className={chartStyles.columns}>
            {visible.map((m) => (
              <div
                key={m.key}
                className={chartStyles.slot}
                onMouseEnter={() => setHovered(m.key)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  className={`${chartStyles.bar} ${hovered && hovered !== m.key ? chartStyles.barDim : ''}`}
                  style={{ height: `${(m.revenue / axisMax) * 100}%` }}
                />
                {hovered === m.key && (
                  <div className={chartStyles.tooltip} role="tooltip">
                    <strong>{formatMonth(m.key)}</strong>
                    <div>{formatMoney(m.revenue)}</div>
                    <div className={chartStyles.tooltipMuted}>
                      продаж: {m.salesCount}
                    </div>
                    {partners
                      .filter((p) => m.byPartner[p])
                      .map((p) => (
                        <div key={p} className={chartStyles.tooltipMuted}>
                          {p}: {formatMoney(m.byPartner[p])}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className={chartStyles.labels}>
          {visible.map((m, i) => (
            <span key={m.key} className={chartStyles.label}>
              {i % labelEvery === 0
                ? m.key.endsWith('-01') || i === 0
                  ? formatMonth(m.key)
                  : formatMonthShort(m.key)
                : ''}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Месяц</th>
              <th className={styles.table__num}>Продаж</th>
              {partners.map((p) => (
                <th key={p} className={styles.table__num}>
                  {p}
                </th>
              ))}
              <th className={styles.table__num}>Доход</th>
            </tr>
          </thead>
          <tbody>
            {[...visible]
              .reverse()
              .filter((m) => m.salesCount)
              .map((m) => (
                <tr key={m.key}>
                  <td>{formatMonth(m.key)}</td>
                  <td className={styles.table__num}>{m.salesCount}</td>
                  {partners.map((p) => (
                    <td key={p} className={styles.table__num}>
                      {m.byPartner[p] ? formatMoney(m.byPartner[p]) : '—'}
                    </td>
                  ))}
                  <td
                    className={`${styles.table__num} ${styles.table__strong}`}
                  >
                    {formatMoney(m.revenue)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
