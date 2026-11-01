import { useLocation, useParams } from 'react-router';
import { useAdminData, useBookingByNo } from '../data';
import { ButtonLink, EmptyState, ErrorState, LoadingState, PageHeader, useAdminTitle } from '../ui';
import { BookingDetail, BOOKINGS_BACK } from './booking/BookingPage';

/** `/admin/bookings/:bookingNo` — detail = editor (no /edit route). */
export function BookingDetailScreen() {
  const { bookingNo = '' } = useParams();
  const location = useLocation();
  useAdminTitle(bookingNo);
  const { clients, dmcs, retry } = useAdminData();
  const { status, booking, error } = useBookingByNo(bookingNo);
  // Just created: the listener may deliver the new doc a moment after the transaction resolves.
  const justCreated = (location.state as { created?: boolean } | null)?.created === true;

  const failed = [
    { name: 'bookings' as const, state: { status, error } },
    { name: 'clients' as const, state: clients },
    { name: 'dmcs' as const, state: dmcs },
  ].find((s) => s.state.status === 'error');
  if (failed) {
    return (
      <>
        <PageHeader title={bookingNo} back={BOOKINGS_BACK} />
        <ErrorState title={`Couldn't load ${bookingNo}`} error={failed.state.error} onRetry={() => retry(failed.name)} />
      </>
    );
  }
  if (status === 'loading' || clients.status === 'loading' || dmcs.status === 'loading' || (!booking && justCreated)) {
    return (
      <>
        <PageHeader title={bookingNo} back={BOOKINGS_BACK} />
        <LoadingState lines={8} label={`Loading ${bookingNo}`} />
      </>
    );
  }
  if (!booking) {
    return (
      <>
        <PageHeader title={bookingNo} back={BOOKINGS_BACK} />
        <EmptyState
          title={`No booking ${bookingNo}`}
          action={
            <ButtonLink to="/admin/bookings/new" variant="primary">
              New booking
            </ButtonLink>
          }
        >
          Check the Booking ID, or find it in the Bookings table.
        </EmptyState>
      </>
    );
  }
  // Keyed so a different Booking starts with fresh section state.
  return <BookingDetail key={booking.id} booking={booking} />;
}
