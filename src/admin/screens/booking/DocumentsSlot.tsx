/**
 * DOCUMENTS SLOT — placeholder for the rail's Documents card (Invoice / Voucher: Prepare, Share, Preview,
 * Download, WhatsApp, Email). The Documents phase replaces this component's body; BookingPage already
 * renders it in the rail under Money with the saved `booking` and its `client`. Don't build PDFs here.
 */
import type { Booking, Client } from '../../model';
import { Panel } from '../../ui';

export function DocumentsSlot({ booking }: { booking: Booking; client?: Client }) {
  return (
    <Panel title="Documents">
      <p className="adm-muted">
        Invoice and Voucher for {booking.bookingNo} arrive in a later phase.
        {booking.status === 'Cancelled' ? ' The Voucher is disabled while the booking is Cancelled.' : ''}
      </p>
    </Panel>
  );
}
