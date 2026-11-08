/**
 * `/admin/insights` — lazy route chunk (Recharts lives only here). Period presets (`?period=`, custom `?pfrom=&pto=`),
 * KPIs compared with the previous equal period, eight charts with table fallbacks, Top Clients / DMCs / Destinations.
 * Default export for React.lazy.
 */
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { useAdminData, useBookingRows } from '../data';
import { delta, formatDate, formatINR, insights, insightsPeriod, isISODate, PERIOD_PRESETS, todayIST } from '../model';
import type { InsightsData, Period, PeriodPreset } from '../model';
import { ButtonLink, DataRegion, EmptyState, Field, LoadingState, Panel, Segmented, StatStrip, useAdminTitle } from '../ui';
import { DashboardHeader } from './DashboardHeader';
import { Outstanding, useRetryRows } from './directory/shared';
import { AgeingChart, AmountChart, FunnelChart, MonthlyChart, PayablesChart, StatusChart } from './insights/charts';

const PRESET_LABELS: Record<PeriodPreset, string> = {
  thisMonth: 'This month',
  lastMonth: 'Last month',
  thisFy: 'This FY',
  lastFy: 'Last FY',
  custom: 'Custom range',
};

const rangeText = (p: Period) => `${formatDate(p.from)} – ${formatDate(p.to)}`;
const pctText = (v: number | null) => (v === null ? 'None' : `${(v * 100).toFixed(1)}%`);

function usePeriod(today: string) {
  const [params, setParams] = useSearchParams();
  const raw = params.get('period');
  const preset: PeriodPreset = (PERIOD_PRESETS as readonly string[]).includes(raw ?? '') ? (raw as PeriodPreset) : 'thisFy';
  const fallback = insightsPeriod('thisFy', today);
  const pfrom = params.get('pfrom');
  const pto = params.get('pto');
  let custom: Period = { from: isISODate(pfrom) ? pfrom : fallback.from, to: isISODate(pto) ? pto : fallback.to };
  if (custom.to < custom.from) custom = { from: custom.to, to: custom.from };
  const period = insightsPeriod(preset, today, custom);
  const set = (patch: Record<string, string | undefined>) =>
    setParams(
      (p) => {
        const out = new URLSearchParams(p);
        for (const [k, v] of Object.entries(patch)) if (v) out.set(k, v);
        else out.delete(k);
        return out;
      },
      { replace: true },
    );
  const setPreset = (next: PeriodPreset) =>
    next === 'custom'
      ? set({ period: 'custom', pfrom: period.from, pto: period.to })
      : set({ period: next === 'thisFy' ? undefined : next, pfrom: undefined, pto: undefined });
  return { preset, period, setPreset, setCustom: (from: string, to: string) => set({ pfrom: from, pto: to }) };
}

/** "+12%" / "−4%" / "No change"; rates compare in percentage points. */
function deltaText(cur: number | null, prev: number | null, kind: 'relative' | 'points'): string {
  if (kind === 'points') {
    if (cur === null || prev === null) return 'No earlier figure';
    const pts = (cur - prev) * 100;
    if (Math.abs(pts) < 0.05) return 'No change';
    return `${pts > 0 ? '+' : '−'}${Math.abs(pts).toFixed(1)} pts`;
  }
  const d = delta(cur, prev);
  if (d === null) return cur === prev ? 'No change' : 'No earlier figure';
  if (Math.abs(d) < 0.005) return 'No change';
  return `${d > 0 ? '+' : '−'}${Math.round(Math.abs(d) * 100)}%`;
}

function KpiStrip({ data }: { data: InsightsData }) {
  const k = data.kpis;
  const p = data.previousKpis;
  const item = (label: string, value: string, cur: number | null, prev: number | null, kind: 'relative' | 'points' = 'relative') => ({
    label,
    value: (
      <>
        {value}
        <span className="adm-stat__delta">{deltaText(cur, prev, kind)}</span>
      </>
    ),
  });
  const money = (v: number | null) => (v === null ? 'None' : formatINR(v));
  return (
    <>
      <StatStrip
        className="adm-stats--kpis"
        label="Key figures"
        items={[
          item('Bookings', String(k.bookings), k.bookings, p.bookings),
          item('Selling Price', formatINR(k.sellingPrice), k.sellingPrice, p.sellingPrice),
          item('Commission', formatINR(k.commission), k.commission, p.commission),
          item('Commission %', pctText(k.commissionPct), k.commissionPct, p.commissionPct, 'points'),
          item('Average Selling Price', money(k.averageSellingPrice), k.averageSellingPrice, p.averageSellingPrice),
          item('Cancellation rate', pctText(k.cancellationRate), k.cancellationRate, p.cancellationRate, 'points'),
        ]}
      />
      <p className="adm-muted">
        Compared with {rangeText(data.previous)}. Pending pipeline: {k.pendingPipeline.count}{' '}
        {k.pendingPipeline.count === 1 ? 'Booking' : 'Bookings'}, {formatINR(k.pendingPipeline.sellingPrice)} (not in the figures above).
      </p>
    </>
  );
}

function TopTables({ data }: { data: InsightsData }) {
  return (
    <div className="adm-top-tables">
      <Panel title="Top Clients" padded={false}>
        {data.topClients.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <caption className="visually-hidden">Top Clients</caption>
              <thead>
                <tr>
                  <th scope="col">Client</th>
                  <th scope="col" className="num">Bookings</th>
                  <th scope="col" className="num">Selling Price</th>
                  <th scope="col" className="num">Commission</th>
                  <th scope="col">Repeat</th>
                </tr>
              </thead>
              <tbody>
                {data.topClients.map((c) => (
                  <tr key={c.clientId}>
                    <th scope="row">
                      <Link to={`/admin/clients/${c.clientId}`}>{c.name}</Link>
                    </th>
                    <td className="num">{c.bookings}</td>
                    <td className="num">{formatINR(c.sellingPrice)}</td>
                    <td className="num">{formatINR(c.commission)}</td>
                    <td>{c.repeat ? 'Repeat' : <span className="adm-muted">New</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="adm-pad adm-muted">No Clients in this period.</p>
        )}
      </Panel>
      <Panel title="Top DMCs" padded={false}>
        {data.topDmcs.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <caption className="visually-hidden">Top DMCs</caption>
              <thead>
                <tr>
                  <th scope="col">DMC</th>
                  <th scope="col" className="num">Lines</th>
                  <th scope="col" className="num">Net Cost</th>
                  <th scope="col" className="num">Paid</th>
                  <th scope="col" className="num">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {data.topDmcs.map((d) => (
                  <tr key={d.dmcId}>
                    <th scope="row">
                      <Link to={`/admin/dmcs/${d.dmcId}`}>{d.name}</Link>
                    </th>
                    <td className="num">{d.lines}</td>
                    <td className="num">{formatINR(d.netCost)}</td>
                    <td className="num">{formatINR(d.paid)}</td>
                    <td className="num">
                      <Outstanding value={d.outstanding} negative="Due back" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="adm-pad adm-muted">No DMCs in this period.</p>
        )}
      </Panel>
      <Panel title="Destinations" padded={false}>
        {data.destinations.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <caption className="visually-hidden">Destinations</caption>
              <thead>
                <tr>
                  <th scope="col">Destination</th>
                  <th scope="col" className="num">Bookings</th>
                  <th scope="col" className="num">Selling Price</th>
                  <th scope="col" className="num">Commission %</th>
                </tr>
              </thead>
              <tbody>
                {data.destinations.map((d) => (
                  <tr key={d.destination.toLowerCase()}>
                    <th scope="row">{d.destination}</th>
                    <td className="num">{d.bookings}</td>
                    <td className="num">{formatINR(d.sellingPrice)}</td>
                    <td className="num">{pctText(d.commissionPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="adm-pad adm-muted">No destinations in this period.</p>
        )}
      </Panel>
    </div>
  );
}

export default function InsightsScreen() {
  useAdminTitle('Insights');
  const today = todayIST();
  const { search } = useLocation();
  const { enquiries, dmcsById, retry } = useAdminData();
  const rowsState = useBookingRows(today);
  const retryRows = useRetryRows();
  const { preset, period, setPreset, setCustom } = usePeriod(today);

  const status = rowsState.status === 'error' || enquiries.status === 'error' ? 'error' : rowsState.status === 'ready' && enquiries.status === 'ready' ? 'ready' : 'loading';
  const data = useMemo(
    () => (status === 'ready' ? insights({ rows: rowsState.rows, enquiries: enquiries.data, period, today }) : null),
    [status, rowsState.rows, enquiries.data, period, today],
  );

  return (
    <>
      <DashboardHeader search={search} />
      <div className="adm-insights">
        <div className="adm-insights__period">
          <Segmented label="Period" options={PERIOD_PRESETS.map((p) => ({ value: p, label: PRESET_LABELS[p] }))} value={preset} onChange={setPreset} />
          {preset === 'custom' ? (
            <>
              <Field label="From">
                <input type="date" value={period.from} max={period.to} onChange={(e) => e.target.value && setCustom(e.target.value, period.to)} />
              </Field>
              <Field label="To">
                <input type="date" value={period.to} min={period.from} onChange={(e) => e.target.value && setCustom(period.from, e.target.value)} />
              </Field>
            </>
          ) : (
            <p className="adm-muted">{rangeText(period)}, by Travel start</p>
          )}
        </div>
        <DataRegion
          status={status}
          error={rowsState.errors[0] ?? enquiries.error}
          onRetry={() => {
            retryRows();
            if (enquiries.status === 'error') retry('enquiries');
          }}
          errorTitle="Couldn't load insights"
          loading={<LoadingState lines={6} label="Loading insights" />}
          isEmpty={rowsState.rows.length === 0}
          empty={
            <EmptyState
              title="No Bookings yet"
              action={
                <ButtonLink to="/admin/bookings/new" variant="primary" icon={<Plus aria-hidden />}>
                  New booking
                </ButtonLink>
              }
            >
              Insights chart Selling Price, Commission, payables and Enquiries once there are Bookings.
            </EmptyState>
          }
        >
          {data ? (
            <>
              <KpiStrip data={data} />
              <div className="adm-charts">
                <MonthlyChart data={data.byMonth} />
                <StatusChart data={data.byStatus} />
                <AmountChart kind="destination" data={data.commissionByDestination} />
                <AmountChart kind="dmc" data={data.netCostByDmc} />
                <AmountChart kind="lineType" data={data.sellingPriceByLineType} />
                <AgeingChart data={data.clientAgeing} />
                <PayablesChart data={data.dmcPayables} dmcsById={dmcsById} />
                <FunnelChart data={data.enquiryFunnel} />
              </div>
              <TopTables data={data} />
            </>
          ) : null}
        </DataRegion>
      </div>
    </>
  );
}
