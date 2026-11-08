/**
 * Business profile — one form, one Save (sticky save bar) across three panels: Business profile (+ signature),
 * Payment details, Invoice and voucher text. Seeds `settings/business` on first open.
 */
import { Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getBusinessProfile, saveBusinessProfile, useAdminDb } from '../../data';
import { BUSINESS_PROFILE_FIELDS, type BusinessProfile, type BusinessProfileField } from '../../model';
import { Button, errorMessage, ErrorState, Field, LinkButton, LoadingState, Note, Panel, useToast } from '../../ui';
import { SignatureError, signatureFromFile } from './signature';

type Values = Record<BusinessProfileField, string>;

const valuesOf = (p: BusinessProfile): Values =>
  Object.fromEntries(BUSINESS_PROFILE_FIELDS.map((k) => [k, p[k] ?? ''])) as Values;
const sameValues = (a: Values, b: Values) => BUSINESS_PROFILE_FIELDS.every((k) => a[k].trim() === b[k].trim());

type LoadState = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; saved: Values };

export function BusinessProfileForm() {
  const db = useAdminDb();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  const fetchProfile = useCallback(() => {
    setLoad({ status: 'loading' });
    getBusinessProfile(db).then(
      (p) => setLoad({ status: 'ready', saved: valuesOf(p) }),
      (error: Error) => setLoad({ status: 'error', error }),
    );
  }, [db]);
  useEffect(fetchProfile, [fetchProfile]);

  if (load.status === 'loading') {
    return (
      <Panel id="business" title="Business profile">
        <LoadingState lines={6} label="Loading Business profile" />
      </Panel>
    );
  }
  if (load.status === 'error') {
    return (
      <Panel id="business" title="Business profile">
        <ErrorState title="Couldn't load the Business profile" error={load.error} onRetry={fetchProfile} />
      </Panel>
    );
  }
  return <ProfileForm saved={load.saved} onSaved={(saved) => setLoad({ status: 'ready', saved })} />;
}

function ProfileForm({ saved, onSaved }: { saved: Values; onSaved: (v: Values) => void }) {
  const db = useAdminDb();
  const toast = useToast();
  const [v, setV] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [sigError, setSigError] = useState('');
  const [sigBusy, setSigBusy] = useState(false);
  const dirty = !sameValues(v, saved);
  const text = (k: BusinessProfileField) => ({ value: v[k], onChange: (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value }) });

  const pickSignature = async (file: File | undefined) => {
    if (!file) return;
    setSigError('');
    setSigBusy(true);
    try {
      const signature = await signatureFromFile(file);
      setV((cur) => ({ ...cur, signature }));
    } catch (err) {
      setSigError(err instanceof SignatureError ? err.message : "That image couldn't be used. Choose another PNG.");
    } finally {
      setSigBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setFailure('');
    try {
      await saveBusinessProfile(db, v);
      const next = Object.fromEntries(BUSINESS_PROFILE_FIELDS.map((k) => [k, v[k].trim()])) as Values;
      setV(next);
      onSaved(next);
      toast('Business profile saved');
    } catch (err) {
      setFailure(`Couldn't save the Business profile. ${errorMessage(err as Error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="adm-stack"
      aria-label="Business profile"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Panel id="business" title="Business profile">
        <p className="adm-muted">Printed on Invoices and Vouchers. Empty fields are left off.</p>
        <div className="adm-grid-2">
          <Field label="Trading name" className="adm-span-all">
            <input {...text('tradingName')} />
          </Field>
          <Field label="Address" className="adm-span-all">
            <textarea rows={4} {...text('address')} />
          </Field>
          <Field label="Phone numbers">
            <input {...text('phones')} />
          </Field>
          <Field label="Email">
            <input type="email" {...text('email')} />
          </Field>
          <Field label="Website">
            <input type="url" placeholder="https://" {...text('website')} />
          </Field>
          <div className="adm-field">
            <span className="adm-field__label" id="sig-label">
              Signature or stamp
            </span>
            <div className="adm-sig" role="group" aria-labelledby="sig-label">
              {v.signature ? <img src={v.signature} alt="Signature preview" /> : <span className="adm-muted">None</span>}
              <input
                id="sig-file"
                type="file"
                accept="image/png"
                className="adm-file-input"
                aria-label={v.signature ? 'Replace signature' : 'Upload signature'}
                aria-describedby={sigError ? 'sig-hint sig-error' : 'sig-hint'}
                aria-invalid={sigError ? true : undefined}
                onChange={(e) => {
                  void pickSignature(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <label htmlFor="sig-file" className="adm-btn adm-btn--outline adm-btn--sm">
                <Upload aria-hidden /> {sigBusy ? 'Resizing…' : v.signature ? 'Replace' : 'Upload'}
              </label>
              {v.signature ? <LinkButton onClick={() => setV({ ...v, signature: '' })}>Remove</LinkButton> : null}
            </div>
            <span id="sig-hint" className="adm-field__hint">Optional PNG, resized to under 100 KB.</span>
            {sigError ? <span id="sig-error" className="adm-field__error">{sigError}</span> : null}
          </div>
        </div>
      </Panel>
      <Panel id="payment" title="Payment details">
        <p className="adm-muted">Shown on the Invoice under Payment details.</p>
        <div className="adm-grid-2">
          <Field label="Account name">
            <input {...text('accountName')} />
          </Field>
          <Field label="Account number">
            <input inputMode="numeric" {...text('accountNumber')} />
          </Field>
          <Field label="IFSC">
            <input {...text('ifsc')} />
          </Field>
          <Field label="Bank and branch">
            <input {...text('bankBranch')} />
          </Field>
          <Field label="UPI ID" hint="The Invoice adds a scan-to-pay QR for the balance due." className="adm-span-all">
            <input placeholder="name@bank" {...text('upiId')} />
          </Field>
        </div>
      </Panel>
      <Panel id="documents" title="Invoice and voucher text">
        <div className="adm-stack">
          <Field label="Invoice terms" hint="Include the cancellation policy.">
            <textarea rows={5} {...text('invoiceTerms')} />
          </Field>
          <Field label="Voucher emergency contacts">
            <input {...text('emergencyContacts')} />
          </Field>
          <Field label="Voucher standard notes">
            <textarea rows={3} {...text('voucherNotes')} />
          </Field>
        </div>
      </Panel>
      {failure ? <Note tone="danger">{failure}</Note> : null}
      <div className="adm-savebar">
        <span className="adm-muted" role="status">
          {dirty ? 'Unsaved changes.' : 'One save for the whole profile.'}
        </span>
        {dirty ? (
          <Button onClick={() => setV(saved)} disabled={busy}>
            Discard
          </Button>
        ) : null}
        <Button type="submit" variant="primary" busy={busy} disabled={!dirty || sigBusy}>
          Save profile
        </Button>
      </div>
    </form>
  );
}
