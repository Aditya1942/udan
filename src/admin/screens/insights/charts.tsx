/**
 * The eight Insights charts (Recharts; this module is only reachable from the lazy Insights route).
 * Colours are tokens (`fill="var(--token)"`): bars `--adm-chart-1`, the line / emphasised series `--color-teal`.
 * Horizontal grid only, no axis lines. `accessibilityLayer` and `isAnimationActive` stay at their defaults
 * (keyboard tooltips; animation honours prefers-reduced-motion).
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AgeingPoint, AmountPoint, Dmc, EnquiryMonthPoint, MonthPoint, PayablesWeek, StatusPoint } from '../../model';
import { formatDate, formatINR, formatMonthShort } from '../../model';
import { ChartFigure } from './ChartFigure';

const TICK = { fill: 'var(--color-text-muted)', fontSize: 12 };
const GRID = 'var(--color-border)';
const BAR = 'var(--adm-chart-1)';
const EMPHASIS = 'var(--color-teal)';
const STACK = ['var(--color-teal)', 'var(--adm-chart-1)', 'var(--adm-voucher-bar)', 'var(--adm-completed-bar)', 'var(--adm-pending-bar)'];
const AGEING_FILL = ['var(--adm-chart-1)', 'var(--color-teal)', 'var(--adm-voucher-bar)', 'var(--color-warn)', 'var(--color-danger)'];
const TOOLTIP = {
  contentStyle: { border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' },
  labelStyle: { color: 'var(--color-ink)', fontWeight: 600 },
  cursor: { fill: 'var(--color-surface)' },
};

/** Compact rupees for axis ticks: ₹950, ₹45k, ₹1.2L, ₹1.5Cr. */
export function compactINR(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1e7) return `${sign}₹${+(a / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `${sign}₹${+(a / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `${sign}₹${Math.round(a / 1e3)}k`;
  return `${sign}₹${a}`;
}
const inr = (v: unknown) => formatINR(Number(v));
const pct = (v: number | null) => (v === null ? 'None' : `${Math.round(v * 100)}%`);
const monthTick = (m: string) => formatMonthShort(m).split(' ')[0];
const allZero = (values: number[]) => values.every((v) => !v);
const barsHeight = (n: number) => Math.max(140, n * 34 + 40);

/** 1. Selling Price (bars) + Commission (line, second axis) by month. */
export function MonthlyChart({ data }: { data: MonthPoint[] }) {
  const months = data.length > 1;
  return (
    <ChartFigure
      wide
      preferTable={data.length > 6}
      title="Selling Price and Commission by month"
      note="Month of Travel start. Pending excluded; Cancelled counts its Cancellation Charges."
      plotLabel="Bar chart of Selling Price with a Commission line, by month. Focus the chart and use the arrow keys to read each month."
      empty={allZero(data.flatMap((d) => [d.sellingPrice, d.commission]))}
      table={{
        caption: 'Selling Price and Commission by month',
        head: ['Month', 'Selling Price', 'Commission'],
        numeric: [1, 2],
        rows: data.map((d) => [formatMonthShort(d.month), formatINR(d.sellingPrice), formatINR(d.commission)]),
      }}
    >
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="month" tickFormatter={months ? monthTick : formatMonthShort} tick={TICK} axisLine={false} tickLine={false} />
          <YAxis yAxisId="sp" tickFormatter={compactINR} tick={TICK} axisLine={false} tickLine={false} width={56} />
          <YAxis yAxisId="c" orientation="right" tickFormatter={compactINR} tick={TICK} axisLine={false} tickLine={false} width={56} />
          <Tooltip formatter={inr} labelFormatter={(m) => formatMonthShort(String(m))} {...TOOLTIP} />
          <Legend iconType="square" />
          <Bar yAxisId="sp" dataKey="sellingPrice" name="Selling Price" fill={BAR} maxBarSize={28} radius={[2, 2, 0, 0]} />
          <Line yAxisId="c" dataKey="commission" name="Commission" stroke={EMPHASIS} strokeWidth={2} dot={{ r: 3, fill: EMPHASIS }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

/** Horizontal bars (layout="vertical") for named amounts or counts. */
function HorizontalBars({
  title,
  note,
  data,
  name,
  money = true,
  emphasis = false,
  head,
}: {
  title: string;
  note?: string;
  data: { label: string; value: number }[];
  name: string;
  money?: boolean;
  emphasis?: boolean;
  head: [string, string];
}) {
  const fmt = money ? inr : (v: unknown) => String(v);
  return (
    <ChartFigure
      title={title}
      note={note}
      plotLabel={`Horizontal bar chart, ${name} by ${head[0].toLowerCase()}. Focus the chart and use the arrow keys to read each bar.`}
      empty={allZero(data.map((d) => d.value))}
      table={{
        caption: title,
        head,
        numeric: [1],
        rows: data.map((d) => [d.label, fmt(d.value)]),
      }}
    >
      <ResponsiveContainer width="100%" height={barsHeight(data.length)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" tickFormatter={money ? compactINR : undefined} allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" tick={TICK} width={112} axisLine={false} tickLine={false} />
          <Tooltip formatter={fmt} {...TOOLTIP} />
          <Bar dataKey="value" name={name} fill={emphasis ? EMPHASIS : BAR} maxBarSize={20} radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

/** 2. Bookings by status. */
export function StatusChart({ data }: { data: StatusPoint[] }) {
  return (
    <HorizontalBars
      title="Bookings by status"
      note="All Bookings travelling in the period, Pending and Cancelled included."
      data={data.map((d) => ({ label: d.status, value: d.count }))}
      name="Bookings"
      money={false}
      head={['Status', 'Bookings']}
    />
  );
}

/** 3–5. Commission by destination, Net Cost by DMC, Selling Price by Service Line type. */
export function AmountChart({ kind, data }: { kind: 'destination' | 'dmc' | 'lineType'; data: AmountPoint[] }) {
  const rows = data.map((d) => ({ label: d.label, value: d.amount }));
  if (kind === 'destination')
    return <HorizontalBars title="Commission by destination, top 10" data={rows} name="Commission" emphasis head={['Destination', 'Commission']} />;
  if (kind === 'dmc') return <HorizontalBars title="Net Cost by DMC, top 10" data={rows} name="Net Cost" head={['DMC', 'Net Cost']} />;
  return (
    <HorizontalBars
      title="Selling Price by Service Line type"
      note="A Booking's Selling Price is split across its lines in proportion to their Net Cost."
      data={rows}
      name="Selling Price"
      head={['Line type', 'Selling Price']}
    />
  );
}

/** 6. Client outstanding ageing (stacked by bucket). */
export function AgeingChart({ data }: { data: AgeingPoint[] }) {
  const row = Object.fromEntries([['name', 'Customer outstanding'], ...data.map((d) => [d.bucket, d.amount])]);
  return (
    <ChartFigure
      title="Customer outstanding ageing"
      note="Days past the Customer balance due date, as of today. All Bookings."
      plotLabel="Stacked bar of Customer outstanding split into ageing buckets: not due, 0–30, 31–60, 61–90 and 90+ days."
      empty={allZero(data.map((d) => d.amount))}
      table={{
        caption: 'Customer outstanding ageing',
        head: ['Days past due', 'Outstanding', 'Bookings'],
        numeric: [1, 2],
        rows: data.map((d) => [d.label, formatINR(d.amount), d.count]),
      }}
    >
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={[row]} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" tickFormatter={compactINR} tick={TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip formatter={inr} {...TOOLTIP} />
          <Legend iconType="square" />
          {data.map((d, i) => (
            <Bar key={d.bucket} dataKey={d.bucket} name={d.label} stackId="ageing" fill={AGEING_FILL[i]} maxBarSize={36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

/** 7. DMC payables for the next 8 weeks (stacked by DMC; top 4 + Other). */
export function PayablesChart({ data, dmcsById }: { data: PayablesWeek[]; dmcsById: ReadonlyMap<string, Dmc> }) {
  const totals = new Map<string, number>();
  for (const w of data) for (const [id, v] of Object.entries(w.byDmc)) totals.set(id, (totals.get(id) ?? 0) + v);
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id);
  const hasOther = totals.size > top.length;
  const series = [...top.map((id) => ({ key: id, name: dmcsById.get(id)?.name ?? 'Unknown DMC' })), ...(hasOther ? [{ key: 'other', name: 'Other DMCs' }] : [])];
  const chartData = data.map((w) => {
    const point: Record<string, string | number> = { label: w.label };
    for (const s of series) point[s.key] = 0;
    for (const [id, v] of Object.entries(w.byDmc)) point[top.includes(id) ? id : 'other'] = (Number(point[top.includes(id) ? id : 'other']) || 0) + v;
    return point;
  });
  const when = (w: PayablesWeek) => (w.from && w.to ? `${formatDate(w.from)} – ${formatDate(w.to)}` : 'Before today');
  return (
    <ChartFigure
      preferTable
      title="DMC payables, next 8 weeks"
      note="Unpaid line Net Cost by DMC pay-by date. Lines without a pay-by date are left out."
      plotLabel="Stacked bar chart of amounts owed to DMCs per week, overdue first. Focus the chart and use the arrow keys to read each week."
      empty={allZero(data.map((w) => w.amount))}
      table={{
        caption: 'DMC payables, next 8 weeks',
        head: ['Week', 'Dates', 'Amount', ...series.map((s) => s.name)],
        numeric: [2, ...series.map((_, i) => i + 3)],
        rows: data.map((w, i) => [w.label, when(w), formatINR(w.amount), ...series.map((s) => formatINR(Number(chartData[i][s.key])))]),
      }}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tickFormatter={(l: string) => l.replace('Week ', 'W')} tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={compactINR} tick={TICK} axisLine={false} tickLine={false} width={56} />
          <Tooltip formatter={inr} {...TOOLTIP} />
          <Legend iconType="square" />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} stackId="dmc" fill={STACK[i % STACK.length]} maxBarSize={32} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

/** 8. Enquiries → Bookings per month (cohort by Enquiry month; converted share as a line). */
export function FunnelChart({ data }: { data: EnquiryMonthPoint[] }) {
  const chartData = data.map((d) => ({ ...d, ratePct: d.rate === null ? null : Math.round(d.rate * 100) }));
  return (
    <ChartFigure
      wide
      preferTable={data.length > 6}
      title="Enquiries → Bookings per month"
      note="Enquiries by month received; converted = that month's Enquiries now converted to a Booking."
      plotLabel="Bar chart of Enquiries and converted Enquiries per month, with the conversion rate as a line. Focus the chart and use the arrow keys to read each month."
      empty={allZero(data.map((d) => d.enquiries))}
      table={{
        caption: 'Enquiries → Bookings per month',
        head: ['Month', 'Enquiries', 'Converted', 'Conversion rate'],
        numeric: [1, 2, 3],
        rows: data.map((d) => [formatMonthShort(d.month), d.enquiries, d.converted, pct(d.rate)]),
      }}
    >
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="month" tickFormatter={data.length > 1 ? monthTick : formatMonthShort} tick={TICK} axisLine={false} tickLine={false} />
          <YAxis yAxisId="n" allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} width={40} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={TICK} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            formatter={(v, name) => (name === 'Conversion rate' ? `${v}%` : String(v))}
            labelFormatter={(m) => formatMonthShort(String(m))}
            {...TOOLTIP}
          />
          <Legend iconType="square" />
          <Bar yAxisId="n" dataKey="enquiries" name="Enquiries" fill={BAR} maxBarSize={24} radius={[2, 2, 0, 0]} />
          <Bar yAxisId="n" dataKey="converted" name="Converted" fill={EMPHASIS} maxBarSize={24} radius={[2, 2, 0, 0]} />
          <Line yAxisId="r" dataKey="ratePct" name="Conversion rate" stroke="var(--color-ink)" strokeDasharray="4 3" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
