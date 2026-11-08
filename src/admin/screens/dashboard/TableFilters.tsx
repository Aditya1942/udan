/** Bookings table: the "Filters" popover body and the active-filter chips (each removable, plus "Clear all"). */
import { X } from 'lucide-react';
import { BOOKING_STATUSES, clearFilters, formatDate, hasDateRange, LINE_TYPES } from '../../model';
import type { Client, ClientPaymentFilter, DateField, Dmc, DmcPaymentFilter, TableQuery } from '../../model';
import { Checkbox, Field, LinkButton } from '../../ui';

export const DATE_FIELD_LABELS: Record<DateField, string> = { travelStart: 'Travel start', travelEnd: 'Travel end', bookedOn: 'Booked on' };
export const CLIENT_PAYMENT_LABELS: Record<ClientPaymentFilter, string> = {
  paid: 'Fully paid',
  outstanding: 'Outstanding',
  overdue: 'Overdue',
  refund: 'Refund owed',
};
export const DMC_PAYMENT_LABELS: Record<DmcPaymentFilter, string> = {
  paid: 'Fully paid',
  outstanding: 'Outstanding',
  due7: 'Due in 7 days',
  overdue: 'Overdue',
};
const INVOICE_LABELS = { generated: 'Generated', none: 'Not generated' } as const;

const toggle = <T,>(list: readonly T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

type Props = {
  query: TableQuery;
  update: (patch: Partial<TableQuery>) => void;
  clients: readonly Client[];
  dmcs: readonly Dmc[];
};

export function FilterFields({ query: q, update, clients, dmcs }: Props) {
  const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));
  const sortedDmcs = [...dmcs].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="adm-filter-grid">
      <fieldset className="adm-fieldset adm-span-all">
        <legend>Status</legend>
        <div className="adm-checks">
          {BOOKING_STATUSES.map((s) => (
            <Checkbox key={s} label={s} checked={q.status.includes(s)} onChange={() => update({ status: toggle(q.status, s) })} />
          ))}
        </div>
      </fieldset>
      <Field label="Date range on" hint="A date range overrides the month.">
        <select value={q.dateField} onChange={(e) => update({ dateField: e.target.value as DateField })}>
          {Object.entries(DATE_FIELD_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <div className="adm-grid-2">
        <Field label="From">
          <input type="date" value={q.from ?? ''} onChange={(e) => update({ from: e.target.value || undefined })} />
        </Field>
        <Field label="To">
          <input type="date" value={q.to ?? ''} onChange={(e) => update({ to: e.target.value || undefined })} />
        </Field>
      </div>
      <Field label="Client">
        <select value={q.clientId ?? ''} onChange={(e) => update({ clientId: e.target.value || undefined })}>
          <option value="">Any client</option>
          {sortedClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Invoice">
        <select value={q.invoice ?? ''} onChange={(e) => update({ invoice: (e.target.value || undefined) as TableQuery['invoice'] })}>
          <option value="">Any</option>
          {Object.entries(INVOICE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Client payment">
        <select value={q.clientPayment ?? ''} onChange={(e) => update({ clientPayment: (e.target.value || undefined) as ClientPaymentFilter | undefined })}>
          <option value="">Any</option>
          {Object.entries(CLIENT_PAYMENT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="DMC payment">
        <select value={q.dmcPayment ?? ''} onChange={(e) => update({ dmcPayment: (e.target.value || undefined) as DmcPaymentFilter | undefined })}>
          <option value="">Any</option>
          {Object.entries(DMC_PAYMENT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="adm-fieldset">
        <legend>DMC</legend>
        <div className="adm-checks adm-checks--scroll">
          {sortedDmcs.length ? (
            sortedDmcs.map((d) => <Checkbox key={d.id} label={d.name} checked={q.dmcIds.includes(d.id)} onChange={() => update({ dmcIds: toggle(q.dmcIds, d.id) })} />)
          ) : (
            <span className="adm-muted">No DMCs yet</span>
          )}
        </div>
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Service line type</legend>
        <div className="adm-checks">
          {LINE_TYPES.map((t) => (
            <Checkbox key={t} label={t} checked={q.lineTypes.includes(t)} onChange={() => update({ lineTypes: toggle(q.lineTypes, t) })} />
          ))}
        </div>
      </fieldset>
      <fieldset className="adm-fieldset adm-span-all">
        <legend>Flag</legend>
        <Checkbox label="Travel ended, not Completed" checked={q.travelEnded} onChange={(e) => update({ travelEnded: e.target.checked })} />
      </fieldset>
    </div>
  );
}

type Chip = { key: string; label: string; remove: Partial<TableQuery> };

export function filterChips(q: TableQuery, clients: readonly Client[], dmcs: readonly Dmc[]): Chip[] {
  const chips: Chip[] = [];
  if (q.status.length) chips.push({ key: 'status', label: `Status: ${q.status.join(', ')}`, remove: { status: [] } });
  if (hasDateRange(q)) {
    const range = q.from && q.to ? `${formatDate(q.from)} – ${formatDate(q.to)}` : q.from ? `from ${formatDate(q.from)}` : `to ${formatDate(q.to!)}`;
    chips.push({ key: 'date', label: `${DATE_FIELD_LABELS[q.dateField]}: ${range}`, remove: { from: undefined, to: undefined } });
  }
  if (q.clientId)
    chips.push({ key: 'client', label: `Client: ${clients.find((c) => c.id === q.clientId)?.name ?? 'Unknown client'}`, remove: { clientId: undefined } });
  if (q.dmcIds.length)
    chips.push({
      key: 'dmc',
      label: `DMC: ${q.dmcIds.map((id) => dmcs.find((d) => d.id === id)?.name ?? 'Unknown DMC').join(', ')}`,
      remove: { dmcIds: [] },
    });
  if (q.lineTypes.length) chips.push({ key: 'type', label: `Service Line type: ${q.lineTypes.join(', ')}`, remove: { lineTypes: [] } });
  if (q.clientPayment) chips.push({ key: 'cpay', label: `Client payment: ${CLIENT_PAYMENT_LABELS[q.clientPayment]}`, remove: { clientPayment: undefined } });
  if (q.dmcPayment) chips.push({ key: 'dpay', label: `DMC payment: ${DMC_PAYMENT_LABELS[q.dmcPayment]}`, remove: { dmcPayment: undefined } });
  if (q.invoice) chips.push({ key: 'inv', label: `Invoice: ${INVOICE_LABELS[q.invoice]}`, remove: { invoice: undefined } });
  if (q.travelEnded) chips.push({ key: 'flag', label: 'Travel ended, not Completed', remove: { travelEnded: false } });
  return chips;
}

export function FilterChips({ query, update, clients, dmcs }: Props & { update: (patch: Partial<TableQuery> | ((q: TableQuery) => TableQuery)) => void }) {
  const chips = filterChips(query, clients, dmcs);
  if (!chips.length) return null;
  return (
    <div className="adm-chips" role="group" aria-label="Active filters">
      {chips.map((c) => (
        <button key={c.key} type="button" className="adm-chip" onClick={() => update(c.remove)} aria-label={`Remove filter ${c.label}`}>
          {c.label} <X aria-hidden />
        </button>
      ))}
      <LinkButton onClick={() => update(clearFilters)}>Clear all</LinkButton>
    </div>
  );
}
