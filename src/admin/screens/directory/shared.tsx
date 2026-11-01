/** Shared pieces of the Clients, DMCs and Enquiries screens: URL-kept search, money cells, contact buttons, record forms. */
import { MessageCircle, Phone, Search } from 'lucide-react';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useAdminData } from '../../data';
import { formatINR, telUrl, validateClient, whatsappUrl, type ClientFields, type DmcFields } from '../../model';
import { Field } from '../../ui';
import { toE164 } from '../booking/form';

/** One query param as state (replace, so typing doesn't stack history). Empty → removed. */
export function useSearchParam(key: string): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? '';
  const set = useCallback(
    (next: string) =>
      setParams(
        (p) => {
          const out = new URLSearchParams(p);
          if (next) out.set(key, next);
          else out.delete(key);
          return out;
        },
        { replace: true },
      ),
    [key, setParams],
  );
  return [value, set];
}

/** Search box kept in `?q=`. */
export function SearchBox({ label, placeholder }: { label: string; placeholder: string }) {
  const [q, setQ] = useSearchParam('q');
  return (
    <label className="adm-search">
      <Search aria-hidden />
      <span className="visually-hidden">{label}</span>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoComplete="off" />
    </label>
  );
}

/** Case-insensitive substring match across fields. */
export function matchesText(q: string, ...fields: (string | undefined | null)[]): boolean {
  const needle = q.trim().toLowerCase();
  return !needle || fields.some((f) => f?.toLowerCase().includes(needle));
}

/** Signed outstanding: negative reads "<negLabel> ₹X" in warn. */
export function Outstanding({ value, negative = 'Refund' }: { value: number; negative?: string }) {
  if (value < 0) return <span className="is-refund">{`${negative} ${formatINR(-value)}`}</span>;
  return <>{formatINR(value)}</>;
}

export function ContactButtons({ phone, size }: { phone?: string; size?: 'sm' }) {
  if (!phone) return null;
  const cls = `adm-btn adm-btn--outline${size === 'sm' ? ' adm-btn--sm' : ''}`;
  return (
    <>
      <a className={cls} href={telUrl(phone)}>
        <Phone aria-hidden /> {phone}
      </a>
      <a className={cls} href={whatsappUrl(phone)} target="_blank" rel="noreferrer">
        <MessageCircle aria-hidden /> WhatsApp
      </a>
    </>
  );
}

export const NONE = <span className="adm-muted">None</span>;

// ---------- Client form ----------

export type ClientInput = { name: string; mobile: string; email: string; city: string; notes: string };
export const blankClientInput = (): ClientInput => ({ name: '', mobile: '', email: '', city: '', notes: '' });
export const clientInputOf = (c: ClientFields): ClientInput => ({
  name: c.name,
  mobile: c.mobile,
  email: c.email ?? '',
  city: c.city ?? '',
  notes: c.notes ?? '',
});
export const clientFieldsOf = (v: ClientInput): ClientFields => ({
  name: v.name.trim(),
  mobile: toE164(v.mobile),
  email: v.email.trim(),
  city: v.city.trim(),
  notes: v.notes.trim(),
});

type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function ClientFormFields({
  value,
  onChange,
  errors,
}: {
  value: ClientInput;
  onChange: (v: ClientInput) => void;
  errors: FieldErrors<keyof ClientInput>;
}) {
  const set = (k: keyof ClientInput) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="adm-grid-2">
      <Field label="Name" error={errors.name} className="adm-span-all">
        <input value={value.name} onChange={set('name')} autoComplete="off" />
      </Field>
      <Field label="Mobile" hint="Used to match website Enquiries. Must be unique." error={errors.mobile}>
        <input type="tel" value={value.mobile} onChange={set('mobile')} placeholder="+91" autoComplete="off" />
      </Field>
      <Field label="Email" hint="Optional" error={errors.email}>
        <input type="email" value={value.email} onChange={set('email')} autoComplete="off" />
      </Field>
      <Field label="City" hint="Optional">
        <input value={value.city} onChange={set('city')} autoComplete="off" />
      </Field>
      <Field label="Notes" hint="Optional" className="adm-span-all">
        <textarea rows={3} value={value.notes} onChange={set('notes')} />
      </Field>
    </div>
  );
}

// ---------- DMC form ----------

export type DmcInput = Required<{ [K in keyof DmcFields]: string }>;
export const dmcInputOf = (d: DmcFields): DmcInput => ({
  name: d.name,
  contactPerson: d.contactPerson ?? '',
  phone: d.phone ?? '',
  email: d.email ?? '',
  region: d.region ?? '',
  notes: d.notes ?? '',
});
export const dmcFieldsOf = (v: DmcInput): DmcFields => ({
  name: v.name.trim(),
  contactPerson: v.contactPerson.trim(),
  phone: v.phone.trim() ? toE164(v.phone) : '',
  email: v.email.trim(),
  region: v.region.trim(),
  notes: v.notes.trim(),
});

export function DmcFormFields({ value, onChange, errors }: { value: DmcInput; onChange: (v: DmcInput) => void; errors: FieldErrors<keyof DmcInput> }) {
  const set = (k: keyof DmcInput) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="adm-grid-2">
      <Field label="Name" error={errors.name} className="adm-span-all">
        <input value={value.name} onChange={set('name')} autoComplete="off" />
      </Field>
      <Field label="Contact person" hint="Optional">
        <input value={value.contactPerson} onChange={set('contactPerson')} autoComplete="off" />
      </Field>
      <Field label="Phone" hint="Optional">
        <input type="tel" value={value.phone} onChange={set('phone')} placeholder="+91" />
      </Field>
      <Field label="Email" hint="Optional" error={errors.email}>
        <input type="email" value={value.email} onChange={set('email')} />
      </Field>
      <Field label="Region" hint="Optional">
        <input value={value.region} onChange={set('region')} placeholder="Bali, Kerala…" />
      </Field>
      <Field label="Notes" hint="Optional" className="adm-span-all">
        <textarea rows={3} value={value.notes} onChange={set('notes')} />
      </Field>
    </div>
  );
}

/** Client form validation incl. mobile uniqueness (`selfId` = the Client being edited). */
export function clientErrors(fields: ClientFields, clients: readonly { id: string; name: string; mobile: string }[], selfId?: string) {
  const errors: FieldErrors<keyof ClientInput> = validateClient(fields);
  const taken = !errors.mobile && clients.find((c) => c.mobile === fields.mobile && c.id !== selfId);
  if (taken) errors.mobile = `${taken.name} already has this mobile.`;
  return errors;
}

/** Retry for `useBookingRows` regions: re-subscribes whichever of Clients / Bookings / DMCs failed. */
export function useRetryRows(): () => void {
  const data = useAdminData();
  return () => {
    for (const name of ['clients', 'bookings', 'dmcs'] as const) if (data[name].status === 'error') data.retry(name);
  };
}
