/** Edit states of the Booking sections. Each takes the whole form + `set(patch)` and shows errors once a save was tried. */
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import {
  BOOKING_CATEGORIES,
  divisionOf,
  formatINR,
  isSingleService,
  LINE_TYPES,
  TRIP_SCOPES,
  VISA_TYPES,
  type BookingCategory,
  type Client,
  type ClientPayment,
  type Dmc,
  type DmcPayment,
  type Errors,
  type LineType,
  type ServiceLine,
  type TripScope,
  type VisaType,
} from '../../model';
import { Button, ChipInput, ConfirmDialog, Field, IconButton, MoneyInput, Note, Segmented } from '../../ui';
import { DmcDialog } from '../shared/DmcDialog';
import { addService, blankLine, canSetCategory, setCategory, setTravel, type BookingForm, type ClientMode, type LineErrors } from './form';

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
  const noMatch = matches.length === 0;
  const showList = open && (!noMatch || query.trim() !== '');
  useEffect(() => {
    if (showList && !noMatch) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, showList, noMatch, listId]);

  return (
    <div className="adm-combo">
      <input
        {...aria}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && !noMatch ? `${listId}-${active}` : undefined}
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
        <ul id={listId} role="listbox" className="adm-combo__list" aria-label="Customers">
          {noMatch ? (
            <li className="adm-combo__empty" role="option" aria-selected={false} aria-disabled="true">
              No match. Try another name or mobile.
            </li>
          ) : null}
          {matches.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(c)}
            >
              <strong className="adm-combo__name">{c.name}</strong>
              <span className="adm-combo__meta">{c.mobile}</span>
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
            ? `Matched existing Customer ${conversion.matchedClient.name} by mobile ${conversion.mobile}. Confirm or pick another.`
            : `No Customer with mobile ${conversion.mobile}. A new Customer will be created.`}
        </Note>
      ) : null}
      <Segmented<ClientMode>
        label="Customer"
        value={form.clientMode}
        onChange={(clientMode) => set({ clientMode })}
        options={[
          { value: 'existing', label: 'Existing customer' },
          { value: 'new', label: 'New customer' },
        ]}
      />
      {form.clientMode === 'existing' ? (
        <Field label="Customer" hint="Search by name or mobile" error={errors.clientId}>
          <ClientPicker clients={clients} value={form.clientId} onChange={(clientId) => set({ clientId })} />
        </Field>
      ) : (
        <div className="adm-grid-2">
          <Field label="Name" error={errors.name}>
            <input value={nc.name} onChange={setNc('name')} autoComplete="off" />
          </Field>
          <Field label="Mobile" error={errors.mobile}>
            <input type="tel" value={nc.mobile} onChange={setNc('mobile')} placeholder="+91 98765 43210" autoComplete="off" />
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

/* ---------------- Travel / Travellers / Price / Notes ---------------- */

const count = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

/** Adults / children / infants + traveller names: in Travel for the Travel Division, in Travellers for Immigration. */
function PaxFields({ form, set, errors }: { form: BookingForm; set: SetForm; errors: Errors }) {
  return (
    <>
      <div className="adm-grid-3">
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
      <Field label="Traveller names" hint="Printed on the Voucher. Press Enter after each name." error={errors.travellerNames}>
        <ChipInput values={form.travellerNames} onChange={(travellerNames) => set({ travellerNames })} placeholder="Type a name, press Enter" />
      </Field>
    </>
  );
}

export function TravelFields({ form, set, errors }: { form: BookingForm; set: SetForm; errors: Errors }) {
  if (!form.hasTravel) {
    return (
      <div className="adm-stack">
        <p className="adm-muted">No travel details.</p>
        <div>
          <Button icon={<Plus aria-hidden />} onClick={() => set(setTravel(form, true))}>
            Add travel details
          </Button>
        </div>
      </div>
    );
  }
  const immigration = !!form.category && divisionOf(form.category) === 'Immigration';
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
      </div>
      {immigration ? null : <PaxFields form={form} set={set} errors={errors} />}
      <Field label="Itinerary" hint="Printed as typed on the Voucher">
        <textarea rows={4} value={form.itinerary} onChange={(e) => set({ itinerary: e.target.value })} />
      </Field>
      <div>
        <Button variant="ghost" icon={<Trash2 aria-hidden />} onClick={() => set(setTravel(form, false))}>
          Remove travel details
        </Button>
      </div>
    </div>
  );
}

/** Immigration only. */
export function TravellersFields({ form, set, errors }: { form: BookingForm; set: SetForm; errors: Errors }) {
  return (
    <div className="adm-stack">
      <PaxFields form={form} set={set} errors={errors} />
    </div>
  );
}

export function PriceFields({ form, set, errors }: { form: BookingForm; set: SetForm; errors: Errors }) {
  return (
    <div className="adm-grid-3">
      <Field label="Selling price" hint="The one total on the Invoice" error={errors.sellingPrice}>
        <MoneyInput value={form.sellingPrice} onChange={(sellingPrice) => set({ sellingPrice })} />
      </Field>
      <Field label="Customer balance due by" hint="Optional" error={errors.clientBalanceDueBy}>
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

/* ---------------- Service ---------------- */

const NEW_DMC = '__new__';

type LinePatch = (patch: Partial<ServiceLine>) => void;

/** One line's fields. `showType` is off for a single-service Booking (the Category is the type). */
function LineFields({
  line: l,
  errors: e,
  dmcs,
  showType,
  onChange,
  onNewDmc,
}: {
  line: ServiceLine;
  errors: Errors<keyof ServiceLine>;
  dmcs: readonly Dmc[];
  showType: boolean;
  onChange: LinePatch;
  onNewDmc: () => void;
}) {
  const opt = (v: string) => v || undefined;
  return (
    <div className="adm-line__grid">
      {showType ? (
        <Field label="Type" error={e.type}>
          <select value={l.type} onChange={(ev) => onChange({ type: ev.target.value as LineType })}>
            {LINE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label="DMC" error={e.dmcId}>
        <select value={l.dmcId ?? ''} onChange={(ev) => (ev.target.value === NEW_DMC ? onNewDmc() : onChange({ dmcId: opt(ev.target.value) }))}>
          <option value="">In-house</option>
          {dmcs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
          <option value={NEW_DMC}>+ New DMC…</option>
        </select>
      </Field>
      {l.type === 'Visa' ? (
        <>
          <Field label="Visa type" error={e.visaType}>
            <select value={l.visaType ?? ''} onChange={(ev) => onChange({ visaType: opt(ev.target.value) as VisaType | undefined })}>
              <option value="" disabled>
                Choose visa type
              </option>
              {VISA_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Country" error={e.visaCountry}>
            <input value={l.visaCountry ?? ''} onChange={(ev) => onChange({ visaCountry: ev.target.value })} />
          </Field>
        </>
      ) : null}
      <Field label="Description" hint="Printed on the Voucher" error={e.description} className="adm-span-2">
        <input value={l.description} onChange={(ev) => onChange({ description: ev.target.value })} />
      </Field>
      <Field label="Start" hint="Optional" error={e.start}>
        <input type="date" value={l.start ?? ''} onChange={(ev) => onChange({ start: opt(ev.target.value) })} />
      </Field>
      <Field label="End" hint="Optional" error={e.end}>
        <input type="date" value={l.end ?? ''} min={l.start || undefined} onChange={(ev) => onChange({ end: opt(ev.target.value) })} />
      </Field>
      <Field label="Net cost" error={e.netCost}>
        <MoneyInput value={l.netCost} onChange={(netCost) => onChange({ netCost })} />
      </Field>
      <Field label="Pay DMC by" hint="Optional" error={e.dmcPayBy}>
        <input type="date" value={l.dmcPayBy ?? ''} onChange={(ev) => onChange({ dmcPayBy: opt(ev.target.value) })} />
      </Field>
      <Field label="Confirmation no." hint="Optional">
        <input value={l.confirmationNo ?? ''} onChange={(ev) => onChange({ confirmationNo: ev.target.value })} />
      </Field>
      <Field label="Voucher notes" hint="Optional" className="adm-span-all">
        <input
          value={l.voucherNotes ?? ''}
          onChange={(ev) => onChange({ voucherNotes: ev.target.value })}
          placeholder="Check-in 2 pm, driver meets at gate 3"
        />
      </Field>
      {l.dmcCancellationCharge !== undefined ? (
        <p className="adm-muted adm-span-all">DMC cancellation charge {formatINR(l.dmcCancellationCharge)} (set in the Cancel dialog).</p>
      ) : null}
    </div>
  );
}

/**
 * Service section: Category, Trip scope (Package), Division, then the lines — one inline for a single-service
 * Booking (with "Add more service"), or the line cards for a Package.
 */
export function ServiceFields({
  form,
  set,
  errors,
  lineErrors,
  dmcs,
  dmcPayments,
  clientPayments,
}: {
  form: BookingForm;
  set: SetForm;
  errors: Errors;
  lineErrors: LineErrors;
  dmcs: readonly Dmc[];
  /** Saved payments (delete warning). */
  dmcPayments: readonly DmcPayment[];
  clientPayments: readonly ClientPayment[];
}) {
  const [dmcFor, setDmcFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ServiceLine | null>(null);
  const upd = (id: string, p: Partial<ServiceLine>) => set({ lines: form.lines.map((l) => (l.id === id ? { ...l, ...p } : l)) });
  const dmcName = (id: string) => dmcs.find((d) => d.id === id)?.name ?? 'This DMC';
  const sortedDmcs = useMemo(() => [...dmcs].sort((a, b) => a.name.localeCompare(b.name)), [dmcs]);
  const taggedToDeleting = deleting ? [...clientPayments, ...dmcPayments].filter((p) => p.lineId === deleting.id).length : 0;
  const deletingDmcHasPayments = deleting?.dmcId ? dmcPayments.some((p) => p.dmcId === deleting.dmcId) : false;

  const category = form.category;
  const single = !!category && isSingleService(category);
  const package_ = category === 'Package';
  const lineSummary = Object.keys(lineErrors).length === 0 ? errors.lines : undefined;

  return (
    <div className="adm-stack">
      <div className="adm-grid-3">
        <Field label="Category" error={errors.category}>
          <select value={category} onChange={(e) => set(setCategory(form, e.target.value as BookingCategory))}>
            <option value="" disabled>
              Choose category
            </option>
            {BOOKING_CATEGORIES.map((c) => (
              <option key={c} disabled={!canSetCategory(form, c)}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        {category ? (
          <div className="adm-field">
            <span className="adm-field__label">Division</span>
            <span>{divisionOf(category)}</span>
          </div>
        ) : null}
      </div>
      {package_ ? (
        <div className="adm-field">
          <Segmented<TripScope>
            label="Trip scope"
            value={form.tripScope ?? ('' as TripScope)}
            onChange={(tripScope) => set({ tripScope })}
            options={TRIP_SCOPES.map((t) => ({ value: t, label: t }))}
          />
          {errors.tripScope ? <span className="adm-field__error">{errors.tripScope}</span> : null}
        </div>
      ) : null}
      {category && !form.lines.length && package_ ? (
        <p className="adm-muted">Add one line per thing a DMC supplies. The lines' Net cost adds up to the booking's Net cost.</p>
      ) : null}
      {lineSummary ? <p className="adm-field__error">{lineSummary}</p> : null}

      {single && form.lines[0] ? (
        <>
          <LineFields
            line={form.lines[0]}
            errors={lineErrors[form.lines[0].id] ?? {}}
            dmcs={sortedDmcs}
            showType={false}
            onChange={(p) => upd(form.lines[0]!.id, p)}
            onNewDmc={() => setDmcFor(form.lines[0]!.id)}
          />
          <div>
            <Button icon={<Plus aria-hidden />} onClick={() => set(addService(form))}>
              Add more service
            </Button>
          </div>
        </>
      ) : null}

      {package_ ? (
        <>
          {form.lines.length ? (
            <ol className="adm-lines">
              {form.lines.map((l, i) => (
                <li key={l.id} className="adm-line" aria-label={`Line ${i + 1}`}>
                  <div className="adm-line__head">
                    <strong>Line {i + 1}</strong>
                    <IconButton label={`Delete line ${i + 1}`} variant="ghost" onClick={() => setDeleting(l)}>
                      <Trash2 aria-hidden />
                    </IconButton>
                  </div>
                  <LineFields
                    line={l}
                    errors={lineErrors[l.id] ?? {}}
                    dmcs={sortedDmcs}
                    showType
                    onChange={(p) => upd(l.id, p)}
                    onNewDmc={() => setDmcFor(l.id)}
                  />
                </li>
              ))}
            </ol>
          ) : null}
          <div>
            <Button icon={<Plus aria-hidden />} onClick={() => set({ lines: [...form.lines, blankLine()] })}>
              Add service line
            </Button>
          </div>
        </>
      ) : null}

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
        {deleting && (taggedToDeleting > 0 || deletingDmcHasPayments) ? (
          <Note tone="warn">
            {taggedToDeleting > 0
              ? `${taggedToDeleting} payment${taggedToDeleting === 1 ? ' is' : 's are'} tagged to this line. They stay on the booking, untagged. `
              : ''}
            {deletingDmcHasPayments && deleting.dmcId
              ? `${dmcName(deleting.dmcId)} has payments on this booking. Its outstanding may show “Due back” once the line is gone.`
              : ''}
          </Note>
        ) : (
          <p className="adm-muted">The line is removed when you save the section.</p>
        )}
      </ConfirmDialog>
    </div>
  );
}
