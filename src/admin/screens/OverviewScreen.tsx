/**
 * `/admin` — Dashboard Overview: month bar (`?month=`), month stat strip, Needs attention (all-time), and the
 * Bookings block with a Calendar | Table switch (`?view=`). Month basis = Travel start (IST).
 */
import { CalendarDays, Plus, Table2 } from 'lucide-react';
import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { useAdminData, useBookingRows } from '../data';
import { useLastBackup } from '../export';
import { formatINR, formatMonth, monthStats, needsAttention, todayIST } from '../model';
import { ButtonLink, DataRegion, EmptyState, LoadingState, Segmented, StatStrip, useAdminTitle } from '../ui';
import { DashboardHeader } from './DashboardHeader';
import { BookingsCalendar } from './dashboard/BookingsCalendar';
import { BookingsTable } from './dashboard/BookingsTable';
import { useBookingsView, useTableQuery } from './dashboard/hooks';
import { MonthBar } from './dashboard/MonthBar';
import { NeedsAttention } from './dashboard/NeedsAttention';
import { useRetryRows } from './directory/shared';

export function OverviewScreen() {
  useAdminTitle('Dashboard');
  const today = todayIST();
  const { search } = useLocation();
  const { clients, dmcs, enquiries, retry } = useAdminData();
  const rowsState = useBookingRows(today);
  const retryRows = useRetryRows();
  const lastBackup = useLastBackup();
  const { query, update } = useTableQuery(today);
  const [view, setView] = useBookingsView();
  const month = query.month;

  const stats = useMemo(() => monthStats(rowsState.rows, month), [rowsState.rows, month]);
  const attention = useMemo(
    () => needsAttention({ rows: rowsState.rows, enquiries: enquiries.data, lastBackup, today }),
    [rowsState.rows, enquiries.data, lastBackup, today],
  );
  const attentionStatus = rowsState.status === 'error' || enquiries.status === 'error' ? 'error' : rowsState.status === 'ready' && enquiries.status === 'ready' ? 'ready' : 'loading';

  const newBooking = (
    <ButtonLink to="/admin/bookings/new" variant="primary" icon={<Plus aria-hidden />}>
      New booking
    </ButtonLink>
  );

  return (
    <>
      <DashboardHeader search={search} />
      <div className="adm-dash">
        <MonthBar month={month} today={today} onChange={(m) => update({ month: m })} />

        <DataRegion status={rowsState.status} error={rowsState.errors[0]} onRetry={retryRows} errorTitle="Couldn't load the month's figures" loading={<LoadingState lines={2} label="Loading figures" />}>
          <StatStrip
            label={`${formatMonth(month)} figures`}
            items={[
              { label: 'Bookings', value: stats.bookings },
              { label: 'Selling Price', value: formatINR(stats.sellingPrice) },
              { label: 'Commission', value: formatINR(stats.commission) },
              { label: 'Client outstanding', value: formatINR(stats.clientOutstanding) },
            ]}
          />
        </DataRegion>

        <DataRegion
          status={attentionStatus}
          error={rowsState.errors[0] ?? enquiries.error}
          onRetry={() => {
            retryRows();
            if (enquiries.status === 'error') retry('enquiries');
          }}
          errorTitle="Couldn't check what needs attention"
          loading={<LoadingState lines={2} label="Loading needs attention" />}
        >
          <NeedsAttention categories={attention} today={today} />
        </DataRegion>

        <section className="adm-block" aria-labelledby="bookings-h">
          <div className="adm-block__head">
            <h2 id="bookings-h" className="adm-h2">
              Bookings
            </h2>
            <Segmented
              label="Bookings view"
              options={[
                {
                  value: 'calendar',
                  label: (
                    <>
                      <CalendarDays aria-hidden /> Calendar
                    </>
                  ),
                },
                {
                  value: 'table',
                  label: (
                    <>
                      <Table2 aria-hidden /> Table
                    </>
                  ),
                },
              ]}
              value={view}
              onChange={setView}
            />
          </div>
          <DataRegion
            status={rowsState.status}
            error={rowsState.errors[0]}
            onRetry={retryRows}
            errorTitle="Couldn't load Bookings"
            isEmpty={rowsState.rows.length === 0}
            empty={
              <EmptyState title="No Bookings yet" action={newBooking}>
                Bookings show here on a calendar and in a table. Start one, or convert an Enquiry.
              </EmptyState>
            }
          >
            {view === 'calendar' ? (
              <BookingsCalendar rows={rowsState.rows} month={month} today={today} />
            ) : (
              <BookingsTable rows={rowsState.rows} query={query} update={update} clients={clients.data} dmcs={dmcs.data} today={today} />
            )}
          </DataRegion>
        </section>
      </div>
    </>
  );
}
