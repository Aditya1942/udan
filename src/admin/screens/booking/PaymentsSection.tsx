/** Client payments / DMC payments: inline add, edit (pencil, same row) and delete (confirm). Each change writes the whole list. */
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Fragment, useState } from 'react';
import { addPayment, deletePayment, updatePayment, useAdminDb, type PaymentSide } from '../../data';
import {
  bookingMoney,
  formatDate,
  formatINR,
  hasErrors,
  lineDmcIds,
  PAY_MODES,
  PAYMENT_KINDS,
  todayIST,
  validatePayment,
  type Booking,
  type ClientPayment,
  type Dmc,
  type DmcPayment,
  type PaymentEntry,
  type PaymentKind,
  type PayMode,
} from '../../model';
import { Button, ConfirmDialog, errorMessage, Field, IconButton, MoneyInput, Note, Panel, useToast } from '../../ui';

type Row = { kind: PaymentKind; date: string; mode: PayMode; ref: string; note: string; amount: number; dmcId: string };

const toRow = (p: PaymentEntry): Row => ({
  kind: p.kind,
  date: p.date,
  mode: p.mode,
  ref: p.ref ?? '',
  note: p.note ?? '',
  amount: p.amount,
  dmcId: (p as DmcPayment).dmcId ?? '',
});

function toEntry(row: Row, side: PaymentSide): Omit<DmcPayment, 'id'> | Omit<ClientPayment, 'id'> {
  const base = { kind: row.kind, date: row.date, mode: row.mode, amount: row.amount, ref: row.ref.trim() || undefined, note: row.note.trim() || undefined };
  return side === 'dmc' ? { ...base, dmcId: row.dmcId } : base;
}

export function PaymentsSection({ booking, side, dmcsById }: { booking: Booking; side: PaymentSide; dmcsById: ReadonlyMap<string, Dmc> }) {
  const db = useAdminDb();
  const toast = useToast();
  const list: PaymentEntry[] = side === 'client' ? booking.clientPayments : booking.dmcPayments;
  const lineDmcs = lineDmcIds(booking);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [deleting, setDeleting] = useState<PaymentEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const title = side === 'client' ? 'Client payments' : 'DMC payments';
  const dmcName = (id: string) => dmcsById.get(id)?.name ?? 'Unknown DMC';
  const net = list.reduce((s, p) => s + (p.kind === 'Refund' ? -p.amount : p.amount), 0);
  const money = bookingMoney(booking);
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
  const cols = side === 'dmc' ? 7 : 6;

  const save = async (row: Row, existing?: PaymentEntry) => {
    setBusy(true);
    try {
      const entry = toEntry(row, side);
      if (existing) await updatePayment(db, booking.id, side, { ...entry, id: existing.id } as DmcPayment);
      else await addPayment(db, booking.id, side, entry as Omit<DmcPayment, 'id'>);
      setEditing(null);
      toast(existing ? 'Entry updated' : 'Entry added');
    } catch (err) {
      toast(`Couldn't save the entry. ${errorMessage(err as Error)}`, { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };
  const remove = async (entry: PaymentEntry) => {
    setBusy(true);
    try {
      await deletePayment(db, booking.id, side, entry.id);
      setDeleting(null);
      toast('Entry deleted');
    } catch (err) {
      toast(`Couldn't delete the entry. ${errorMessage(err as Error)}`, { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const form = (existing?: PaymentEntry) => {
    // DMC choices: DMCs on this Booking's lines (+ the entry's own DMC when editing, even if its line was deleted).
    const allowed = side === 'dmc' ? [...new Set([...lineDmcs, ...(existing ? [(existing as DmcPayment).dmcId] : [])])] : undefined;
    return (
      <tr className="adm-add-row">
        <td colSpan={cols}>
          <PaymentRowForm
            side={side}
            initial={existing ? toRow(existing) : { kind: 'Payment', date: todayIST(), mode: 'UPI', ref: '', note: '', amount: 0, dmcId: lineDmcs[0] ?? '' }}
            allowedDmcIds={allowed}
            dmcName={dmcName}
            busy={busy}
            submitLabel={existing ? 'Save entry' : 'Add entry'}
            onSave={(row) => void save(row, existing)}
            onCancel={() => setEditing(null)}
          />
        </td>
      </tr>
    );
  };

  return (
    <Panel
      title={title}
      padded={false}
      actions={
        editing === 'new' ? null : (
          <Button
            size="sm"
            icon={<Plus aria-hidden />}
            onClick={() => setEditing('new')}
            disabled={side === 'dmc' && lineDmcs.length === 0}
            title={side === 'dmc' && lineDmcs.length === 0 ? 'Add a Service Line first' : undefined}
          >
            Add entry
          </Button>
        )
      }
    >
      {side === 'dmc' && money.dmcs.length > 0 ? (
        <ul className="adm-dmc-sum" aria-label="Per DMC">
          {money.dmcs.map((d) => (
            <li key={d.dmcId}>
              <span>{dmcName(d.dmcId)}</span>
              <span className="adm-sub">
                cost {formatINR(d.cost)}, paid {formatINR(d.netPaid)}
              </span>
              <strong className={d.outstanding < 0 ? 'is-refund' : undefined}>
                {d.outstanding < 0 ? `Due back ${formatINR(-d.outstanding)}` : d.outstanding ? `Owe ${formatINR(d.outstanding)}` : 'Settled'}
              </strong>
            </li>
          ))}
        </ul>
      ) : null}
      {side === 'dmc' && lineDmcs.length === 0 && list.length === 0 ? (
        <p className="adm-muted adm-pad">Add a Service Line with its DMC first; DMC payments go against a DMC on this booking.</p>
      ) : list.length === 0 && editing !== 'new' ? (
        <p className="adm-muted adm-pad">No entries yet.</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table adm-table--pay">
            <thead>
              <tr>
                <th scope="col">Date</th>
                {side === 'dmc' ? <th scope="col">DMC</th> : null}
                <th scope="col">Kind</th>
                <th scope="col">Mode</th>
                <th scope="col">Reference</th>
                <th scope="col" className="num">
                  Amount
                </th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) =>
                editing === p.id ? (
                  <Fragment key={p.id}>{form(p)}</Fragment>
                ) : (
                  <tr key={p.id} className={p.kind === 'Refund' ? 'is-refund-row' : undefined}>
                    <th scope="row" data-label="Date">
                      {formatDate(p.date)}
                    </th>
                    {side === 'dmc' ? <td data-label="DMC">{dmcName((p as DmcPayment).dmcId)}</td> : null}
                    <td data-label="Kind">{p.kind}</td>
                    <td data-label="Mode">{p.mode}</td>
                    <td data-label="Reference">
                      {p.ref || <span className="adm-muted">None</span>}
                      {p.note ? <span className="adm-sub">{p.note}</span> : null}
                    </td>
                    <td data-label="Amount" className={p.kind === 'Refund' ? 'num is-refund' : 'num'}>
                      {p.kind === 'Refund' ? formatINR(-p.amount) : formatINR(p.amount)}
                    </td>
                    <td className="adm-row-actions">
                      <IconButton
                        label={`Edit ${p.kind.toLowerCase()} of ${formatINR(p.amount)} on ${formatDate(p.date)}`}
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setEditing(p.id)}
                      >
                        <Pencil aria-hidden />
                      </IconButton>
                      <IconButton
                        label={`Delete ${p.kind.toLowerCase()} of ${formatINR(p.amount)} on ${formatDate(p.date)}`}
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setDeleting(p)}
                      >
                        <Trash2 aria-hidden />
                      </IconButton>
                    </td>
                  </tr>
                ),
              )}
              {editing === 'new' ? form() : null}
            </tbody>
            {list.length ? (
              <tfoot>
                <tr>
                  <th scope="row" colSpan={cols - 2}>
                    Net {side === 'client' ? 'received' : 'paid'}
                  </th>
                  <td className="num">{formatINR(net)}</td>
                  <td />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this entry?"
        confirmLabel="Delete entry"
        danger
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && void remove(deleting)}
      >
        {deleting ? (
          <p>
            {deleting.kind} of {formatINR(deleting.amount)} on {formatDate(deleting.date)}
            {side === 'dmc' ? ` (${dmcName((deleting as DmcPayment).dmcId)})` : ''}.
          </p>
        ) : null}
      </ConfirmDialog>
    </Panel>
  );
}

function PaymentRowForm({
  side,
  initial,
  allowedDmcIds,
  dmcName,
  busy,
  submitLabel,
  onSave,
  onCancel,
}: {
  side: PaymentSide;
  initial: Row;
  allowedDmcIds?: string[];
  dmcName: (id: string) => string;
  busy: boolean;
  submitLabel: string;
  onSave: (row: Row) => void;
  onCancel: () => void;
}) {
  const [row, setRow] = useState<Row>(initial);
  const [tried, setTried] = useState(false);
  const errors = validatePayment(toEntry(row, side), allowedDmcIds);
  const show = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  const submit = () => {
    setTried(true);
    if (!hasErrors(errors)) onSave(row);
  };
  return (
    <div
      className="adm-add-form"
      role="group"
      aria-label={submitLabel === 'Add entry' ? 'New entry' : 'Edit entry'}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
          e.preventDefault();
          submit();
        }
      }}
    >
      <div className="adm-add-grid">
        <Field label="Date" error={show('date')}>
          <input type="date" value={row.date} onChange={(e) => setRow({ ...row, date: e.target.value })} />
        </Field>
        {side === 'dmc' ? (
          <Field label="DMC" error={show('dmcId')}>
            <select value={row.dmcId} onChange={(e) => setRow({ ...row, dmcId: e.target.value })}>
              {(allowedDmcIds ?? []).map((id) => (
                <option key={id} value={id}>
                  {dmcName(id)}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Kind" error={show('kind')}>
          <select value={row.kind} onChange={(e) => setRow({ ...row, kind: e.target.value as PaymentKind })}>
            {PAYMENT_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Mode" error={show('mode')}>
          <select value={row.mode} onChange={(e) => setRow({ ...row, mode: e.target.value as PayMode })}>
            {PAY_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Reference" hint="Optional">
          <input value={row.ref} onChange={(e) => setRow({ ...row, ref: e.target.value })} placeholder="UTR, cheque no." />
        </Field>
        <Field label="Note" hint="Optional">
          <input value={row.note} onChange={(e) => setRow({ ...row, note: e.target.value })} />
        </Field>
        <Field label="Amount" error={show('amount')}>
          <MoneyInput value={row.amount} onChange={(amount) => setRow({ ...row, amount })} />
        </Field>
      </div>
      <div className="adm-actions">
        <Button variant="primary" size="sm" busy={busy} onClick={submit}>
          {submitLabel}
        </Button>
        <Button size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
      {tried && hasErrors(errors) ? <Note tone="danger">Fix the highlighted fields.</Note> : null}
    </div>
  );
}
