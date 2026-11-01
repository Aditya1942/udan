/** Edit states of the Booking sections. Each takes the whole form + `set(patch)` and shows errors once a save was tried. */
import { Plus, Trash2 } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { formatINR, LINE_TYPES, type Client, type Dmc, type DmcPayment, type Errors, type LineType, type ServiceLine } from '../../model';
import { Button, ChipInput, ConfirmDialog, Field, IconButton, MoneyInput, Note, Segmented } from '../../ui';
import { DmcDialog } from '../shared/DmcDialog';
import { blankLine, type BookingForm, type ClientMode, type LineErrors } from './form';

type SetForm = (patch: Partial<BookingForm>) => void;

/* ---------------- Client ---------------- */

const clientLabel = (c: Client) => `${c.name}, ${c.mobile}`;

/** Type-ahead on name / mobile over the Client list (combobox + listbox). Forwards id/aria to the input. */
export function ClientPicker({
  clients,
  value,
  onChange,
  ...aria
}: {
  clients: readonly Client[];
  value: string;
  onChange: (clientId: string) => void;
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
}) {
  const selected = clients.find((c) => c.id === value);
  const [query, setQuery] = useState(selected ? clientLabel(selected) : '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    if (!q) return clients.slice(0, 8);
    return clients
      .filter((c) => c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.mobile.includes(digits)) || clientLabel(c).toLowerCase() === q)
      .slice(0, 8);
  }, [clients, query]);

  const choose = (c: Client) => {
    onChange(c.id);
    setQuery(clientLabel(c));
    setOpen(false);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && matches[active]) choose(matches[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };
  const showList = open && matches.length > 0;

  return (
    <div className="adm-combo">
      <input
        {...aria}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Type a name or mobile"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
          if (value) onChange('');
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {showList ? (
        <ul id={listId} role="listbox" className="adm-combo__list" aria-label="Clients">
          {matches.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(c)}
            >
              <strong>{c.name}</strong> <span className="adm-muted">{c.mobile}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ClientFields({
  form,
  set,
  errors,
  clients,
  conversion,
}: {
  form: BookingForm;
  set: SetForm;
  errors: Errors;
  clients: readonly Client[];
  /** From an Enquiry: the mobile and the matched Client (if any). */
  conversion?: { mobile: string; matchedClient?: Client };
}) {
  const nc = form.newClient;
  const setNc = (k: keyof typeof nc) => (e: { target: { value: string } }) => set({ newClient: { ...nc, [k]: e.target.value } });
  return (
    <div className="adm-stack">
      {conversion ? (
        <Note>
          {conversion.matchedClient
            ? `Matched existing Client ${conversion.matchedClient.name} by mobile ${conversion.mobile}. Confirm or pick another.`
            : `No Client with mobile ${conversion.mobile}. A new Client will be created.`}
        </Note>
      ) : null}
      <Segmented<ClientMode>
        label="Client"
        value={form.clientMode}
        onChange={(clientMode) => set({ clientMode })}
        options={[
          { value: 'existing', label: 'Existing client' },
          { value: 'new', label: 'New client' },
        ]}
      />
      {form.clientMode === 'existing' ? (
        <Field label="Client" hint="Search by name or mobile" error={errors.clientId}>
          <ClientPicker clients={clients} value={form.clientId} onChange={(clientId) => set({ clientId })} />
        </Field>
      ) : (
        <div className="adm-grid-2">
          <Field label="Name" error={errors.name}>
            <input value={nc.name} onChange={setNc('name')} autoComplete="off" />
          </Field>
          <Field label="Mobile" error={errors.mobile}>
            <input type="tel" value={nc.mobile} onChange={setNc('mobile')} placeholder="+91" autoComplete="off" />
          </Field>
          <Field label="Email" hint="Optional" error={errors.email}>
            <input type="email" value={nc.email} onChange={setNc('email')} autoComplete="off" />
          </Field>
          <Field label="City" hint="Optional">
            <input value={nc.city} onChange={setNc('city')} autoComplete="off" />
          </Field>
        </div>
      )}
    </div>
  );
}

/* ---------------- Travel / Price / Notes ---------------- */

const count = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

export function TravelFields({ form, set, errors }: { form: BookingForm; set: SetForm; errors: Errors }) {
  return (
    <div className="adm-stack">
      <div className="adm-grid-3">
        <Field label="Destination" error={errors.destination} className="adm-span-all">
          <input value={form.destination} onChange={(e) => set({ destination: e.target.value })} />
        </Field>
        <Field label="Travel start" error={errors.travelStart}>
          <input type="date" value={form.travelStart} onChange={(e) => set({ travelStart: e.target.value })} />
        </Field>
        <Field label="Travel end" error={errors.travelEnd}>
          <input type="date" value={form.travelEnd} min={form.travelStart || undefined} onChange={(e) => set({ travelEnd: e.target.value })} />
        </Field>
        <span aria-hidden className="adm-hide-sm" />
        <Field label="Adults" error={errors.pax}>
          <input type="number" min={0} value={form.pax.adults} onChange={(e) => set({ pax: { ...form.pax, adults: count(e.target.value) } })} />
        </Field>
        <Field label="Children">
          <input type="number" min={0} value={form.pax.children} onChange={(e) => set({ pax: { ...form.pax, children: count(e.target.value) } })} />
        </Field>
        <Field label="Infants">
          <input type="number" min={0} value={form.pax.infants} onChange={(e) => set({ pax: { ...form.pax, infants: count(e.target.value) } })} />
        </Field>
      </div>
      <Field label="Traveller names" hint="Optional, printed on the Voucher. Press Enter after each name.">
        <ChipInput values={form.travellerNames} onChange={(travellerNames) => set({ travellerNames })} placeholder="Type a name, press Enter" />
      </Field>
      <Field label="Itinerary" hint="Printed as typed on the Voucher">
        <textarea rows={4} value={form.itinerary} onChange={(e) => set({ itinerary: e.target.value })} />
      </Field>
    </div>
  );
}

export function PriceFields({ form, set, errors }: { form: BookingForm; set: SetForm; errors: Errors }) {
  return (
    <div className="adm-grid-3">
      <Field label="Selling price" hint="The one total on the Invoice" error={errors.sellingPrice}>
        <MoneyInput value={form.sellingPrice} onChange={(sellingPrice) => set({ sellingPrice })} />
      </Field>
      <Field label="Client balance due by" hint="Optional" error={errors.clientBalanceDueBy}>
        <input type="date" value={form.clientBalanceDueBy ?? ''} onChange={(e) => set({ clientBalanceDueBy: e.target.value || undefined })} />
      </Field>
    </div>
  );
}

export function NotesFields({ form, set }: { form: BookingForm; set: SetForm }) {
  return (
    <Field label="Internal notes" hint="Admin only, never printed">
      <textarea rows={3} value={form.internalNotes} onChange={(e) => set({ internalNotes: e.target.value })} />
    </Field>
  );
}

/* ---------------- Service lines ---------------- */

const NEW_DMC = '__new__';

export function LinesFields({
  form,
  set,
  errors,
  dmcs,
  dmcPayments,
}: {
  form: BookingForm;
  set: SetForm;
  errors: LineErrors;
  dmcs: readonly Dmc[];
  /** Saved DMC Payments (delete warning). */
  dmcPayments: readonly DmcPayment[];
}) {
  const [dmcFor, setDmcFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ServiceLine | null>(null);
  const upd = (id: string, p: Partial<ServiceLine>) => set({ lines: form.lines.map((l) => (l.id === id ? { ...l, ...p } : l)) });
  const opt = (v: string) => v || undefined;
  const dmcName = (id: string) => dmcs.find((d) => d.id === id)?.name ?? 'This DMC';
  const sortedDmcs = useMemo(() => [...dmcs].sort((a, b) => a.name.localeCompare(b.name)), [dmcs]);
  const deletingHasPayments = deleting ? dmcPayments.some((p) => p.dmcId === deleting.dmcId) : false;

  return (
    <div className="adm-stack">
      {form.lines.length === 0 ? (
        <p className="adm-muted">Add one line per thing a DMC supplies. The lines' Net cost adds up to the booking's Net cost.</p>
      ) : (
        <ol className="adm-lines">
          {form.lines.map((l, i) => {
            const e = errors[l.id] ?? {};
            return (
              <li key={l.id} className="adm-line" aria-label={`Line ${i + 1}`}>
                <div className="adm-line__head">
                  <strong>Line {i + 1}</strong>
                  <IconButton label={`Delete line ${i + 1}`} variant="ghost" onClick={() => setDeleting(l)}>
                    <Trash2 aria-hidden />
                  </IconButton>
                </div>
                <div className="adm-line__grid">
                  <Field label="Type" error={e.type}>
                    <select value={l.type} onChange={(ev) => upd(l.id, { type: ev.target.value as LineType })}>
                      {LINE_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="DMC" error={e.dmcId}>
                    <select
                      value={l.dmcId}
                      onChange={(ev) => (ev.target.value === NEW_DMC ? setDmcFor(l.id) : upd(l.id, { dmcId: ev.target.value }))}
                    >
                      <option value="" disabled>
                        Choose DMC
                      </option>
                      {sortedDmcs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                      <option value={NEW_DMC}>+ New DMC…</option>
                    </select>
                  </Field>
                  <Field label="Description" hint="Printed on the Voucher" error={e.description} className="adm-span-2">
                    <input value={l.description} onChange={(ev) => upd(l.id, { description: ev.target.value })} />
                  </Field>
                  <Field label="Start" hint="Optional" error={e.start}>
                    <input type="date" value={l.start ?? ''} onChange={(ev) => upd(l.id, { start: opt(ev.target.value) })} />
                  </Field>
                  <Field label="End" hint="Optional" error={e.end}>
                    <input type="date" value={l.end ?? ''} min={l.start || undefined} onChange={(ev) => upd(l.id, { end: opt(ev.target.value) })} />
                  </Field>
                  <Field label="Net cost" error={e.netCost}>
                    <MoneyInput value={l.netCost} onChange={(netCost) => upd(l.id, { netCost })} />
                  </Field>
                  <Field label="Pay DMC by" hint="Optional" error={e.dmcPayBy}>
                    <input type="date" value={l.dmcPayBy ?? ''} onChange={(ev) => upd(l.id, { dmcPayBy: opt(ev.target.value) })} />
                  </Field>
                  <Field label="Confirmation no." hint="Optional">
                    <input value={l.confirmationNo ?? ''} onChange={(ev) => upd(l.id, { confirmationNo: ev.target.value })} />
                  </Field>
                  <Field label="Voucher notes" hint="Optional" className="adm-span-all">
                    <input
                      value={l.voucherNotes ?? ''}
                      onChange={(ev) => upd(l.id, { voucherNotes: ev.target.value })}
                      placeholder="Check-in 2 pm, driver meets at gate 3"
                    />
                  </Field>
                  {l.dmcCancellationCharge !== undefined ? (
                    <p className="adm-muted adm-span-all">DMC cancellation charge {formatINR(l.dmcCancellationCharge)} (set in the Cancel dialog).</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <Button icon={<Plus aria-hidden />} onClick={() => set({ lines: [...form.lines, blankLine()] })}>
        Add service line
      </Button>

      <DmcDialog
        open={dmcFor !== null}
        onClose={() => setDmcFor(null)}
        onCreated={(dmcId) => {
          if (dmcFor) upd(dmcFor, { dmcId });
          setDmcFor(null);
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this Service Line?"
        confirmLabel="Delete line"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) set({ lines: form.lines.filter((x) => x.id !== deleting.id) });
          setDeleting(null);
        }}
      >
        {deleting && deletingHasPayments ? (
          <Note tone="warn">
            {dmcName(deleting.dmcId)} has payments on this booking. Its outstanding may show “Due back” once the line is gone.
          </Note>
        ) : (
          <p className="adm-muted">The line is removed when you save the section.</p>
        )}
      </ConfirmDialog>
    </div>
  );
}
