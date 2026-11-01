import { useParams } from 'react-router';
import { PageHeader, useAdminTitle } from '../ui';
import { Placeholder } from './Placeholder';

/** `/admin/bookings/:bookingNo` — detail = editor (no /edit route). */
export function BookingDetailScreen() {
  const { bookingNo = '' } = useParams();
  useAdminTitle(bookingNo);
  return (
    <>
      <PageHeader title={bookingNo} back={{ to: '/admin', label: 'Dashboard' }} />
      <Placeholder title="Booking detail" />
    </>
  );
}
