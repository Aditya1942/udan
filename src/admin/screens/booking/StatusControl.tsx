/** Status select (applies immediately; leaving Cancelled un-cancels) and the Cancel dialog with its live preview. */
import { Ban } from 'lucide-react';
import { useState } from 'react';
import { cancelBooking, setStatus, useAdminDb } from '../../data';
import {
  BOOKING_STATUSES,
  bookingMoney,
  formatINR,
  linesMissingConfirmation,
  type Booking,
  type BookingStatus,
  type Dmc,
  type INR,
} from '../../model';
import { Button, Dialog, errorMessage, Field, KeyValues, MoneyInput, Note, useToast } from '../../ui';

export function StatusControl({ booking, dmcsById }: { booking: Booking; dmcsById: ReadonlyMap<string, Dmc> }) {
  const db = useAdminDb();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [warning, setWarning] = useState('');

  const change = async (status: BookingStatus) => {
    setWarning('');
    if (status === booking.status) return;
    if (status === 'Cancelled') {
      setCancelOpen(true);
      return;
    }
    const wasCancelled = booking.status === 'Cancelled';
    setBusy(true);
    try {
      await setStatus(db, booking.id, status);
      const missing = linesMissingConfirmation(booking).length;
      if (status === 'Voucher Received' && missing) {
        setWarning(
          `${missing} Service ${missing === 1 ? 'Line has' : 'Lines have'} no confirmation number yet. Status saved anyway.`,
        );
      }
      toast(wasCancelled ? `Un-cancelled ${booking.bookingNo}: ${status}` : `Status changed to ${status}`);
    } catch (err) {
      toast(`Couldn't change the status. ${errorMessage(err as Error)}`, { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-status">
      <Field label="Status" className="adm-field--inline">
        <select value={booking.status} disabled={busy} onChange={(e) => void change(e.target.value as BookingStatus)}>
          {BOOKING_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      {booking.status === 'Cancelled' ? (
        <p className="adm-muted">Choosing another status un-cancels: the cancellation charges are cleared, Refund entries stay.</p>
      ) : null}
      {warning ? (
        <p className="adm-note adm-note--warn" role="status">
          {warning}
        </p>
      ) : null}
      {cancelOpen ? <CancelDialog booking={booking} dmcsById={dmcsById} onClose={() => setCancelOpen(false)} /> : null}
    </div>
  );
}

function CancelDialog({ booking, dmcsById, onClose }: { booking: Booking; dmcsById: ReadonlyMap<string, Dmc>; onClose: () => void }) {
  const db = useAdminDb();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [clientCharge, setClientCharge] = useState<INR>(0);
  const [lineCharges, setLineCharges] = useState<Record<string, INR>>({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const preview = bookingMoney({
    ...booking,
    status: 'Cancelled',
    clientCancellationCharge: clientCharge,
    lines: booking.lines.map((l) => ({ ...l, dmcCancellationCharge: lineCharges[l.id] ?? 0 })),
  });
  const client = preview.clientOutstanding;
  const dmc = preview.dmcOutstanding;

  const submit = async () => {
    setTried(true);
    if (!reason.trim()) return;
    setBusy(true);
    setFailure('');
    try {
      await cancelBooking(db, booking.id, { reason, clientCancellationCharge: clientCharge, lineCharges });
      toast(`${booking.bookingNo} cancelled`);
      onClose();
    } catch (err) {
      setFailure(errorMessage(err as Error));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={() => !busy && onClose()}
      title={`Cancel ${booking.bookingNo}?`}
      onSubmit={() => void submit()}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Keep booking
          </Button>
          <Button type="submit" variant="danger" icon={<Ban aria-hidden />} busy={busy}>
            Cancel booking
          </Button>
        </>
      }
    >
      <Field label="Reason" error={tried && !reason.trim() ? 'Enter a reason.' : undefined}>
        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Field
        label="Customer cancellation charge"
        hint={`Replaces the Selling price (${formatINR(booking.sellingPrice)}) while Cancelled. 0 = full refund.`}
      >
        <MoneyInput value={clientCharge} onChange={setClientCharge} />
      </Field>
      {booking.lines.length ? (
        <fieldset className="adm-fieldset">
          <legend>DMC cancellation charge per Service Line</legend>
          {booking.lines.map((l) => (
            <Field
              key={l.id}
              className="adm-field--row"
              label={
                <>
                  {l.type}, {dmcsById.get(l.dmcId)?.name ?? 'Unknown DMC'} <span className="adm-muted">net {formatINR(l.netCost)}</span>
                </>
              }
            >
              <MoneyInput
                aria-label={`DMC cancellation charge for ${l.type}, ${dmcsById.get(l.dmcId)?.name ?? 'Unknown DMC'}`}
                value={lineCharges[l.id] ?? 0}
                onChange={(v) => setLineCharges((c) => ({ ...c, [l.id]: v }))}
              />
            </Field>
          ))}
        </fieldset>
      ) : null}
      <section aria-label="Preview" className="adm-kv--result">
        <KeyValues
          items={[
            { label: 'Commission becomes', value: formatINR(preview.commission) },
            {
              label: 'Customer',
              value: client < 0 ? `Refund owed ${formatINR(-client)}` : client > 0 ? `Still owes ${formatINR(client)}` : 'Settled',
            },
            { label: 'DMC', value: dmc < 0 ? `Due back ${formatINR(-dmc)}` : dmc > 0 ? `You owe ${formatINR(dmc)}` : 'Settled' },
          ]}
        />
      </section>
      <p className="adm-muted">
        Record actual refunds afterwards as Refund entries in Customer or DMC payments. The Voucher is disabled while Cancelled.
      </p>
      {failure ? <Note tone="danger">{failure}</Note> : null}
    </Dialog>
  );
}
