/**
 * Bookings calendar (hand-rolled): Monday-first month grid, each Booking a bar from its Booking date to its end date labelled
 * Booking ID + Client and coloured by Status; bars break at week edges with square ends; max 3 per day, then
 * "+N more" (day popover). Click a bar → Booking detail; click a day → New booking with that start date.
 * Phones get an agenda list grouped by day instead.
 */
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { addDays, BOOKING_STATUSES, bookingDate, bookingEndDate, daysBetween, formatDate, formatMonth, isoWeekday, monthEnd, monthOf, monthStart } from '../../model';
import type { BookingRow, BookingStatus, ISODate, ISOMonth } from '../../model';
import { ButtonLink, Checkbox, StatusBadge } from '../../ui';
import { travelRange } from '../booking/views';
import { PHONE_QUERY, useMediaQuery } from './hooks';
import { Popover } from './Popover';

const LANES = 3;
const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const statusSlug = (s: BookingStatus) => s.toLowerCase().replace(/\s+/g, '-');
const newBookingHref = (date: ISODate) => `/admin/bookings/new?start=${date}`;
const bookingHref = (r: BookingRow) => `/admin/bookings/${r.booking.bookingNo}`;
const clientName = (r: BookingRow) => r.client?.name ?? 'Unknown customer';
/** Booking date and end (the end defaults to the start); a Booking with neither (no createdAt) never lands on the calendar. */
const span = (r: BookingRow): { start: ISODate; end: ISODate } | undefined => {
  const start = bookingDate(r.booking);
  if (!start) return undefined;
  const end = bookingEndDate(r.booking);
  return { start, end: end && end > start ? end : start };
};
const dates = (r: BookingRow) => travelRange(r.booking);
const describe = (r: BookingRow) =>
  [r.booking.bookingNo, clientName(r), r.booking.destination, dates(r), r.booking.status].filter(Boolean).join(', ');

type Placed = { row: BookingRow; start: number; end: number; lane: number; contL: boolean; contR: boolean };
type Week = { days: ISODate[]; bars: Placed[]; /** per weekday: every Booking on that day */ byDay: BookingRow[][] };

/** Weeks of the month grid with bars placed in lanes (greedy, earliest start first, longer first). */
export function layoutMonth(rows: readonly BookingRow[], month: ISOMonth): Week[] {
  const first = monthStart(month);
  const last = monthEnd(month);
  const gridStart = addDays(first, -(isoWeekday(first) - 1));
  const weeks: Week[] = [];
  const spans = rows.flatMap((row) => {
    const s = span(row);
    return s ? [{ row, s }] : [];
  });
  for (let ws = gridStart; ws <= last; ws = addDays(ws, 7)) {
    const we = addDays(ws, 6);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const hits = spans
      .filter(({ s }) => s.start <= we && s.end >= ws)
      .sort((a, b) => a.s.start.localeCompare(b.s.start) || b.s.end.localeCompare(a.s.end) || a.row.booking.bookingSeq - b.row.booking.bookingSeq);
    const laneEnd: number[] = [];
    const bars: Placed[] = [];
    const byDay: BookingRow[][] = days.map(() => []);
    for (const { row, s: range } of hits) {
      const s = Math.max(0, daysBetween(ws, range.start));
      const e = Math.min(6, daysBetween(ws, range.end));
      for (let d = s; d <= e; d++) byDay[d].push(row);
      let lane = laneEnd.findIndex((x) => x < s);
      if (lane === -1) lane = laneEnd.length;
      laneEnd[lane] = e;
      bars.push({ row, start: s, end: e, lane, contL: range.start < ws, contR: range.end > we });
    }
    weeks.push({ days, bars, byDay });
  }
  return weeks;
}

export function BookingsCalendar({ rows, month, today }: { rows: readonly BookingRow[]; month: ISOMonth; today: ISODate }) {
  const [showCancelled, setShowCancelled] = useState(false);
  const phone = useMediaQuery(PHONE_QUERY);
  const visible = useMemo(() => rows.filter((r) => showCancelled || r.booking.status !== 'Cancelled'), [rows, showCancelled]);
  return (
    <div className="adm-cal">
      <div className="adm-cal__tools">
        <Checkbox label="Show cancelled" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
      </div>
      {phone ? <Agenda rows={visible} month={month} /> : <Grid rows={visible} month={month} today={today} />}
      <ul className="adm-legend" aria-label="Status colours">
        {BOOKING_STATUSES.filter((s) => showCancelled || s !== 'Cancelled').map((s) => (
          <li key={s}>
            <StatusBadge status={s} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Grid({ rows, month, today }: { rows: readonly BookingRow[]; month: ISOMonth; today: ISODate }) {
  const weeks = useMemo(() => layoutMonth(rows, month), [rows, month]);
  return (
    <div className="adm-cal__grid" role="region" aria-label={`Bookings calendar, ${formatMonth(month)}`}>
      <div className="adm-cal__dows" aria-hidden>
        {DOWS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      {weeks.map((wk) => (
        <div className="adm-cal__week" key={wk.days[0]}>
          {wk.days.map((d, i) => (
            <Link
              key={d}
              to={newBookingHref(d)}
              className={['adm-cal__day', monthOf(d) !== month && 'is-out', d === today && 'is-today'].filter(Boolean).join(' ')}
              style={{ gridColumn: i + 1 }}
              aria-label={`${formatDate(d)}${d === today ? ' (today)' : ''}, new booking`}
            >
              <span>{Number(d.slice(8))}</span>
            </Link>
          ))}
          {wk.bars
            .filter((b) => b.lane < LANES)
            .map((b) => (
              <Link
                key={b.row.booking.id}
                to={bookingHref(b.row)}
                className={['adm-cal__bar', `adm-bar--${statusSlug(b.row.booking.status)}`, b.contL && 'cont-l', b.contR && 'cont-r'].filter(Boolean).join(' ')}
                style={{ gridColumn: `${b.start + 1} / ${b.end + 2}`, gridRow: b.lane + 2 }}
                title={describe(b.row)}
              >
                <span className="adm-cal__bar-id">{b.row.booking.bookingNo}</span> {clientName(b.row)}
              </Link>
            ))}
          {wk.byDay.map((all, i) => {
            const hidden = all.length - wk.bars.filter((b) => b.lane < LANES && b.start <= i && b.end >= i).length;
            if (hidden <= 0) return null;
            return (
              <Popover
                key={`more-${i}`}
                className="adm-cal__more"
                style={{ gridColumn: i + 1, gridRow: LANES + 2 }}
                align={i >= 4 ? 'end' : 'start'}
                label={`Bookings on ${formatDate(wk.days[i])}`}
                summary={`+${hidden} more`}
                summaryLabel={`${hidden} more Bookings on ${formatDate(wk.days[i])}`}
              >
                <DayList date={wk.days[i]} rows={all} />
              </Popover>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DayList({ date, rows }: { date: ISODate; rows: BookingRow[] }) {
  return (
    <>
      <h3 className="adm-h3">{formatDate(date)}</h3>
      <ul className="adm-daylist">
        {rows.map((r) => (
          <li key={r.booking.id}>
            <Link to={bookingHref(r)} title={describe(r)}>
              <strong>{r.booking.bookingNo}</strong> {clientName(r)} <StatusBadge status={r.booking.status} />
            </Link>
          </li>
        ))}
      </ul>
      <Link to={newBookingHref(date)}>New booking on this day</Link>
    </>
  );
}

/** Phone agenda: the month's Bookings grouped by day (a trip that started last month sits under the 1st). */
function Agenda({ rows, month }: { rows: readonly BookingRow[]; month: ISOMonth }) {
  const first = monthStart(month);
  const last = monthEnd(month);
  const groups = useMemo(() => {
    const map = new Map<ISODate, BookingRow[]>();
    const inMonth = rows
      .flatMap((row) => {
        const s = span(row);
        return s ? [{ row, s }] : [];
      })
      .filter(({ s }) => s.start <= last && s.end >= first)
      .sort((a, b) => a.s.start.localeCompare(b.s.start) || a.row.booking.bookingSeq - b.row.booking.bookingSeq);
    for (const { row, s } of inMonth) {
      const day = s.start < first ? first : s.start;
      map.set(day, [...(map.get(day) ?? []), row]);
    }
    return [...map.entries()];
  }, [rows, first, last]);
  if (!groups.length)
    return (
      <div className="adm-empty">
        <h3 className="adm-h3">No trips in {formatMonth(month)}</h3>
        <ButtonLink to={newBookingHref(first)} icon={<Plus aria-hidden />}>
          New booking
        </ButtonLink>
      </div>
    );
  return (
    <ol className="adm-agenda" aria-label={`Bookings agenda, ${formatMonth(month)}`}>
      {groups.map(([day, list]) => (
        <li key={day}>
          <h3 className="adm-agenda__date">
            {WEEKDAY_SHORT[isoWeekday(day) - 1]} {formatDate(day)}
          </h3>
          <ul>
            {list.map((r) => (
              <li key={r.booking.id}>
                <Link to={bookingHref(r)}>
                  <span>
                    <strong>{r.booking.bookingNo}</strong> {clientName(r)}
                  </span>
                  <StatusBadge status={r.booking.status} />
                  <span className="adm-sub adm-muted">
                    {[r.booking.destination, dates(r)].filter(Boolean).join(', ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
