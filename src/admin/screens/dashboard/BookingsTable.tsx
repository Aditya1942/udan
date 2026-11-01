/**
 * Bookings table — the Booking list. Search (debounced), scope (month | All time), Filters popover + chips, CSV,
 * column visibility, sortable headers, footer totals (counting rules), 50 rows + "Show more" outside a month.
 * All query state lives in the URL (`useTableQuery`).
 */
import { ArrowDown, ArrowUp, Columns3, Download, ListFilter, Plus, Search } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { bookingsCsv, bookingsFilename, CSV_MIME, downloadText } from '../../export';
import {
  activeFilterCount,
  ALL_TIME_PAGE_SIZE,
  applyTableQuery,
  clearFilters,
  formatINR,
  formatMonthShort,
  hasDateRange,
  tableFooter,
} from '../../model';
import type { BookingRow, Client, Dmc, ISODate, SortKey, TableQuery } from '../../model';
import { Button, ButtonLink, Checkbox, EmptyState, Segmented, StatusBadge } from '../../ui';
import { dateRange, paxText } from '../booking/views';
import { Outstanding } from '../directory/shared';
import { FilterChips, FilterFields } from './TableFilters';
import { Popover } from './Popover';

type ColumnKey = 'client' | 'destination' | 'travel' | 'pax' | 'status' | 'sellingPrice' | 'received' | 'outstanding' | 'commission' | 'dmcs';
type Column = { key: ColumnKey; label: string; sort?: SortKey; num?: boolean };

/** Booking ID is always shown (row header); the rest can be hidden from the Columns menu. */
export const BOOKING_TABLE_COLUMNS: Column[] = [
  { key: 'client', label: 'Client', sort: 'client' },
  { key: 'destination', label: 'Destination', sort: 'destination' },
  { key: 'travel', label: 'Travel dates', sort: 'travelStart' },
  { key: 'pax', label: 'Pax', num: true },
  { key: 'status', label: 'Status', sort: 'status' },
  { key: 'sellingPrice', label: 'Selling Price', sort: 'sellingPrice', num: true },
  { key: 'received', label: 'Received', num: true },
  { key: 'outstanding', label: 'Client outstanding', sort: 'outstanding', num: true },
  { key: 'commission', label: 'Commission', sort: 'commission', num: true },
  { key: 'dmcs', label: 'DMC(s)' },
];

const HIDDEN_KEY = 'udan-admin:table-hidden-columns';
function useHiddenColumns(): [ColumnKey[], (next: ColumnKey[]) => void] {
  const [hidden, setHidden] = useState<ColumnKey[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]');
      return Array.isArray(v) ? v.filter((k) => BOOKING_TABLE_COLUMNS.some((c) => c.key === k)) : [];
    } catch {
      return [];
    }
  });
  const set = (next: ColumnKey[]) => {
    setHidden(next);
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable: keep for this session only
    }
  };
  return [hidden, set];
}

const paxCount = (r: BookingRow) => r.booking.pax.adults + r.booking.pax.children + r.booking.pax.infants;

function Cell({ col, row }: { col: ColumnKey; row: BookingRow }) {
  const { booking: b, money: m } = row;
  switch (col) {
    case 'client':
      return (
        <>
          {row.client?.name ?? <span className="adm-muted">Unknown client</span>}
          {row.client?.mobile ? <span className="adm-sub">{row.client.mobile}</span> : null}
        </>
      );
    case 'destination':
      return <>{b.destination}</>;
    case 'travel':
      return (
        <>
          {dateRange(b.travelStart, b.travelEnd)}
          {row.flags.travelEnded ? <span className="adm-flag">Not marked Completed</span> : null}
        </>
      );
    case 'pax':
      return <span title={paxText(b.pax)}>{paxCount(row)}</span>;
    case 'status':
      return <StatusBadge status={b.status} />;
    case 'sellingPrice':
      return <>{formatINR(m.sellingPrice)}</>;
    case 'received':
      return <>{formatINR(m.clientNetReceived)}</>;
    case 'outstanding':
      return <Outstanding value={m.clientOutstanding} />;
    case 'commission':
      return <>{formatINR(m.commission)}</>;
    case 'dmcs':
      return <>{row.dmcs.map((d) => d.name).join(', ')}</>;
  }
}

export function BookingsTable({
  rows,
  query,
  update,
  clients,
  dmcs,
  today,
}: {
  rows: readonly BookingRow[];
  query: TableQuery;
  update: (patch: Partial<TableQuery> | ((q: TableQuery) => TableQuery)) => void;
  clients: readonly Client[];
  dmcs: readonly Dmc[];
  today: ISODate;
}) {
  const [hidden, setHidden] = useHiddenColumns();
  const columns = BOOKING_TABLE_COLUMNS.filter((c) => !hidden.includes(c.key));
  const result = useMemo(() => applyTableQuery(rows, query), [rows, query]);
  const footer = useMemo(() => tableFooter(result), [result]);
  const paged = query.scope === 'all' || hasDateRange(query);
  const queryKey = JSON.stringify(query);
  const [shown, setShown] = useState({ key: queryKey, limit: ALL_TIME_PAGE_SIZE });
  const limit = shown.key === queryKey ? shown.limit : ALL_TIME_PAGE_SIZE;
  const visible = paged ? result.slice(0, limit) : result;
  const filters = activeFilterCount(query);
  const monthLabel = formatMonthShort(query.month);

  const sortBy = (key: SortKey) => update(query.sort === key ? { dir: query.dir === 'asc' ? 'desc' : 'asc' } : { sort: key, dir: 'asc' });
  const header = (label: ReactNode, key: SortKey | undefined, num?: boolean) => {
    const active = key && query.sort === key;
    return (
      <th scope="col" className={num ? 'num' : undefined} aria-sort={active ? (query.dir === 'asc' ? 'ascending' : 'descending') : key ? 'none' : undefined}>
        {key ? (
          <button type="button" className="adm-th-btn" onClick={() => sortBy(key)}>
            {label}
            {active ? query.dir === 'asc' ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden /> : null}
          </button>
        ) : (
          label
        )}
      </th>
    );
  };

  const footerValue: Partial<Record<ColumnKey, ReactNode>> = {
    sellingPrice: formatINR(footer.sellingPrice),
    received: formatINR(footer.received),
    outstanding: (
      <>
        {formatINR(footer.outstanding)}
        {footer.refundsOwed ? <span className="adm-sub is-refund">Refunds {formatINR(footer.refundsOwed)}</span> : null}
      </>
    ),
    commission: formatINR(footer.commission),
  };

  return (
    <div className="adm-block">
      <div className="adm-table-tools">
        <SearchInput value={query.q} onChange={(q) => update({ q })} />
        <Segmented
          label="Scope"
          options={[
            { value: 'month', label: monthLabel },
            { value: 'all', label: 'All time' },
          ]}
          value={query.scope}
          onChange={(scope) => update({ scope })}
        />
        <Popover
          className="adm-filter-pop"
          label="Filters"
          summaryClassName="adm-btn adm-btn--outline"
          summary={
            <>
              <ListFilter aria-hidden /> Filters{filters ? ` (${filters})` : ''}
            </>
          }
        >
          <FilterFields query={query} update={update} clients={clients} dmcs={dmcs} />
        </Popover>
        <Popover
          label="Columns"
          align="end"
          summaryClassName="adm-btn adm-btn--outline"
          summary={
            <>
              <Columns3 aria-hidden /> Columns
            </>
          }
        >
          <fieldset className="adm-fieldset">
            <legend>Show columns</legend>
            {BOOKING_TABLE_COLUMNS.map((c) => (
              <Checkbox
                key={c.key}
                label={c.label}
                checked={!hidden.includes(c.key)}
                onChange={() => setHidden(hidden.includes(c.key) ? hidden.filter((k) => k !== c.key) : [...hidden, c.key])}
              />
            ))}
          </fieldset>
        </Popover>
        <Button icon={<Download aria-hidden />} onClick={() => downloadText(bookingsFilename(today), bookingsCsv(result), CSV_MIME)} disabled={!result.length}>
          CSV
        </Button>
      </div>
      <FilterChips query={query} update={update} clients={clients} dmcs={dmcs} />
      {hasDateRange(query) ? (
        <p className="adm-muted">The date range overrides the month.</p>
      ) : query.q.trim() && query.scope === 'month' ? (
        <p className="adm-muted">
          Searching {monthLabel} only.{' '}
          <button type="button" className="adm-link-btn" onClick={() => update({ scope: 'all' })}>
            Search all time
          </button>
        </p>
      ) : null}
      {result.length === 0 ? (
        filters || query.q.trim() ? (
          <EmptyState
            title="No Bookings match"
            action={
              <Button onClick={() => update((q) => ({ ...clearFilters(q), q: '' }))}>Clear search and filters</Button>
            }
          >
            Nothing matches this search and these filters{paged ? '' : ` in ${monthLabel}`}.
          </EmptyState>
        ) : (
          <EmptyState
            title={`No Bookings travel in ${monthLabel}`}
            action={
              <ButtonLink to="/admin/bookings/new" icon={<Plus aria-hidden />}>
                New booking
              </ButtonLink>
            }
          >
            The month is by Travel start.{' '}
            <button type="button" className="adm-link-btn" onClick={() => update({ scope: 'all' })}>
              Show all time
            </button>
          </EmptyState>
        )
      ) : (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--bookings">
              <caption className="visually-hidden">Bookings, {paged ? 'all time' : monthLabel}</caption>
              <thead>
                <tr>
                  {header('Booking ID', 'bookingNo')}
                  {columns.map((c) => (
                    <Fragment key={c.key}>{header(c.label, c.sort, c.num)}</Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.booking.id} className={row.booking.status === 'Cancelled' ? 'is-cancelled' : undefined}>
                    <th scope="row" data-label="Booking ID">
                      <Link to={`/admin/bookings/${row.booking.bookingNo}`}>{row.booking.bookingNo}</Link>
                    </th>
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        data-label={c.label}
                        className={
                          [c.num && 'num', c.key === 'outstanding' && row.flags.clientOverdue && 'is-overdue'].filter(Boolean).join(' ') || undefined
                        }
                      >
                        <Cell col={c.key} row={row} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">
                    {footer.count} {footer.count === 1 ? 'Booking' : 'Bookings'}
                    <span className="adm-sub adm-muted">Pending excluded from totals</span>
                  </th>
                  {columns.map((c) => (
                    <td key={c.key} className={c.num ? 'num' : undefined} data-label={footerValue[c.key] !== undefined ? c.label : undefined}>
                      {footerValue[c.key] ?? null}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          {paged && result.length > visible.length ? (
            <div className="adm-table-more">
              <Button onClick={() => setShown({ key: queryKey, limit: limit + ALL_TIME_PAGE_SIZE })}>
                Show more ({result.length - visible.length} more)
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Search box: local text, written to `?q=` after a pause (debounced). */
function SearchInput({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    // URL changed elsewhere (Clear, back): follow it.
    setSynced(value);
    setText(value);
  }
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onChange(text), 250);
    return () => clearTimeout(t);
  }, [text, value, onChange]);
  return (
    <label className="adm-search">
      <Search aria-hidden />
      <span className="visually-hidden">Search bookings</span>
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search ID, client, mobile, destination, DMC, confirmation or invoice no."
        autoComplete="off"
      />
    </label>
  );
}
