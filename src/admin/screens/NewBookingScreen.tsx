import { useSearchParams } from 'react-router';
import { PageHeader, useAdminTitle } from '../ui';
import { Placeholder } from './Placeholder';

/** `/admin/bookings/new` (`?start=YYYY-MM-DD` from a calendar day, `?enquiry=<id>` from Convert). */
export function NewBookingScreen() {
  const [params] = useSearchParams();
  useAdminTitle('New booking');
  const start = params.get('start');
  const enquiry = params.get('enquiry');
  return (
    <>
      <PageHeader title="New booking" back={{ to: '/admin', label: 'Dashboard' }} />
      <Placeholder title="New booking">
        The booking form arrives in a later phase.
        {start ? ` Start date: ${start}.` : ''}
        {enquiry ? ' Prefilled from an Enquiry.' : ''}
      </Placeholder>
    </>
  );
}
