/** Shared pieces of the Clients, DMCs and Enquiries screens: URL-kept search, money cells, contact buttons, record forms. */
import { MessageCircle, Phone, Search } from 'lucide-react';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useAdminData } from '../../data';
import { formatINR, telUrl, validateClient, whatsappUrl, type ClientFields, type DmcFields } from '../../model';
import { Checkbox, Field } from '../../ui';
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

/** Call + WhatsApp buttons. `whatsapp` overrides the WhatsApp number (null = no WhatsApp button). */
export function ContactButtons({ phone, whatsapp, size }: { phone?: string; whatsapp?: string | null; size?: 'sm' }) {
  if (!phone) return null;
  const wa = whatsapp === undefined ? phone : whatsapp;
  const cls = `adm-btn adm-btn--outline${size === 'sm' ? ' adm-btn--sm' : ''}`;
  return (
    <>
      <a className={cls} href={telUrl(phone)}>
        <Phone aria-hidden /> {phone}
      </a>
      {wa ? (
        <a className={cls} href={whatsappUrl(wa)} target="_blank" rel="noreferrer">
          <MessageCircle aria-hidden /> WhatsApp
        </a>
      ) : null}
    </>
  );
}

export const NONE = <span className="adm-muted">None</span>;

// ---------- Client form ----------

export type ClientInput = {
  name: string;
  mobile: string;
  whatsappSameAsMobile: boolean;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  emergencyName: string;
  emergencyPhone: string;
  gstin: string;
  pan: string;
  notes: string;
};
type ClientTextKey = Exclude<keyof ClientInput, 'whatsappSameAsMobile'>;
export const blankClientInput = (): ClientInput => ({
  name: '',
  mobile: '',
  whatsappSameAsMobile: true,
  whatsapp: '',
  email: '',
  address: '',
  city: '',
  state: '',
  country: '',
  emergencyName: '',
  emergencyPhone: '',
  gstin: '',
  pan: '',
  notes: '',
});
export const clientInputOf = (c: ClientFields): ClientInput => ({
  name: c.name,
  mobile: c.mobile,
  whatsappSameAsMobile: Boolean(c.whatsappSameAsMobile),
  whatsapp: c.whatsapp ?? '',
  email: c.email ?? '',
  address: c.address ?? '',
  city: c.city ?? '',
  state: c.state ?? '',
  country: c.country ?? '',
  emergencyName: c.emergencyName ?? '',
  emergencyPhone: c.emergencyPhone ?? '',
  gstin: c.gstin ?? '',
  pan: c.pan ?? '',
  notes: c.notes ?? '',
});
const optPhone = (raw: string) => (raw.trim() ? toE164(raw) : '');
const upper = (raw: string) => raw.replace(/\s/g, '').toUpperCase();
/** Blank optional strings are removed on save; `whatsappSameAsMobile` is stored only when true. */
export const clientFieldsOf = (v: ClientInput): ClientFields => ({
  name: v.name.trim(),
  mobile: toE164(v.mobile),
  whatsappSameAsMobile: v.whatsappSameAsMobile || undefined,
  whatsapp: v.whatsappSameAsMobile ? '' : optPhone(v.whatsapp),
  email: v.email.trim(),
  address: v.address.trim(),
  city: v.city.trim(),
  state: v.state.trim(),
  country: v.country.trim(),
  emergencyName: v.emergencyName.trim(),
  emergencyPhone: optPhone(v.emergencyPhone),
  gstin: upper(v.gstin),
  pan: upper(v.pan),
  notes: v.notes.trim(),
});

type FieldErrors<K extends string> = Partial<Record<K, string>>;

/**
 * Customer form. `stack` (detail page): one 2-column grid. `sections` (New customer dialog): Contact and
 * Address & tax side by side, each a 2-column grid, so the dialog fits without scrolling on laptop screens.
 */
export function ClientFormFields({
  value,
  onChange,
  errors,
  layout = 'stack',
}: {
  value: ClientInput;
  onChange: (v: ClientInput) => void;
  errors: FieldErrors<keyof ClientFields>;
  layout?: 'stack' | 'sections';
}) {
  const set = (k: ClientTextKey) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  const compact = layout === 'sections';
  const opt = compact ? undefined : 'Optional';

  const name = (
    <Field label="Name" error={errors.name} className={compact ? undefined : 'adm-span-all'}>
      <input value={value.name} onChange={set('name')} autoComplete="off" />
    </Field>
  );
  const mobile = (
    <Field label="Mobile" hint={compact ? 'Must be unique.' : 'Used to match website Enquiries. Must be unique.'} error={errors.mobile}>
      <input type="tel" value={value.mobile} onChange={set('mobile')} placeholder="+91 98765 43210" autoComplete="off" />
    </Field>
  );
  const whatsapp = (
    <div className="adm-stack adm-stack--tight">
      <Field label="WhatsApp" hint={opt} error={errors.whatsapp}>
        <input
          type="tel"
          value={value.whatsappSameAsMobile ? value.mobile : value.whatsapp}
          onChange={set('whatsapp')}
          disabled={value.whatsappSameAsMobile}
          placeholder="+91 98765 43210"
          autoComplete="off"
        />
      </Field>
      <Checkbox
        label="Same as mobile"
        checked={value.whatsappSameAsMobile}
        onChange={(e) => onChange({ ...value, whatsappSameAsMobile: e.target.checked })}
      />
    </div>
  );
  const email = (
    <Field label="Email" hint={opt} error={errors.email} className={compact ? undefined : 'adm-span-all'}>
      <input type="email" value={value.email} onChange={set('email')} autoComplete="off" />
    </Field>
  );
  const emergencyName = (
    <Field label="Emergency contact name" hint={opt}>
      <input value={value.emergencyName} onChange={set('emergencyName')} autoComplete="off" />
    </Field>
  );
  const emergencyPhone = (
    <Field label="Emergency contact phone" hint={opt} error={errors.emergencyPhone}>
      <input type="tel" value={value.emergencyPhone} onChange={set('emergencyPhone')} placeholder="+91 98765 43210" autoComplete="off" />
    </Field>
  );
  const address = (
    <Field label="Address" hint={opt} className="adm-span-all">
      <textarea rows={2} value={value.address} onChange={set('address')} placeholder="House / flat, street, area, PIN" />
    </Field>
  );
  const city = (
    <Field label="City" hint={opt}>
      <input value={value.city} onChange={set('city')} autoComplete="off" />
    </Field>
  );
  const state = (
    <Field label="State" hint={opt}>
      <input value={value.state} onChange={set('state')} autoComplete="off" />
    </Field>
  );
  const country = (
    <Field label="Country" hint={opt}>
      <input value={value.country} onChange={set('country')} placeholder="India" autoComplete="off" />
    </Field>
  );
  const gstin = (
    <Field label="GST number" hint={opt} error={errors.gstin}>
      <input value={value.gstin} onChange={set('gstin')} placeholder="24ABCDE1234F1Z5" maxLength={15} autoCapitalize="characters" autoComplete="off" />
    </Field>
  );
  const pan = (
    <Field label="PAN number" hint={opt} error={errors.pan}>
      <input value={value.pan} onChange={set('pan')} placeholder="ABCDE1234F" maxLength={10} autoCapitalize="characters" autoComplete="off" />
    </Field>
  );
  const notes = (
    <Field label="Notes" hint={opt} className="adm-span-all">
      <textarea rows={compact ? 2 : 3} value={value.notes} onChange={set('notes')} />
    </Field>
  );

  if (compact) {
    return (
      <div className="adm-stack">
        <p className="adm-form-intro">Only name and mobile are required.</p>
        <div className="adm-form-sections">
          <fieldset className="adm-fieldset adm-form-section">
            <legend className="adm-h3">Contact</legend>
            <div className="adm-grid-2">
              {name}
              {mobile}
              {email}
              {whatsapp}
              {emergencyName}
              {emergencyPhone}
              {notes}
            </div>
          </fieldset>
          <fieldset className="adm-fieldset adm-form-section">
            <legend className="adm-h3">Address and tax</legend>
            <div className="adm-grid-2">
              {address}
              {city}
              {state}
              {country}
              <span aria-hidden="true" className="adm-grid-gap" />
              {gstin}
              {pan}
            </div>
          </fieldset>
        </div>
      </div>
    );
  }
  return (
    <div className="adm-grid-2">
      {name}
      {mobile}
      {whatsapp}
      {email}
      {address}
      {city}
      {state}
      {country}
      <span aria-hidden="true" className="adm-grid-gap" />
      {emergencyName}
      {emergencyPhone}
      {gstin}
      {pan}
      {notes}
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
        <input type="tel" value={value.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
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
  const errors: FieldErrors<keyof ClientFields> = validateClient(fields);
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
