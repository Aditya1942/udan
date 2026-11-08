import { CircleCheck, CircleAlert, MessageSquareText } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { Firestore } from 'firebase/firestore';
import { Link } from 'react-router';
import { business, getService, isServiceId, services, type ServiceGroup, type ServiceId } from '../content/business';
import { routes } from '../content/navigation';
import { validateEnquiry, type EnquiryField, type FieldErrors } from '../lib/enquiry';
import { buildEnquiryMessage } from '../lib/contactActions';
import { ContactActions } from './ContactActions';
import './EnquiryForm.css';

export type GetDb = () => Promise<Firestore | null>;

export type EnquiryFormProps = {
  /** Service to preselect (from ?service=). */
  defaultService?: ServiceId;
  /** Destination being enquired about (from ?destination=). Stored with the Enquiry. */
  destination?: string;
  /** Route path the Enquiry comes from, e.g. "/" or "/contact". */
  sourcePage: string;
  /** Anchor id. Default "enquiry" so /contact#enquiry lands here. */
  id?: string;
  /** Firestore to write to. Default: the app's (lazy-loaded) instance; tests pass the emulator. */
  getDb?: GetDb;
};

type Values = { name: string; phone: string; service: string; message: string };
type Status = 'idle' | 'submitting' | 'success' | 'error';
type ErrorKind = 'network' | 'rejected' | 'unavailable';

/** Loads Firebase + the Enquiry writer on demand, so the SDK isn't in the main bundle. */
const defaultGetDb: GetDb = () => import('../lib/firebase').then((m) => m.getDb());
const loadSubmit = () => import('../lib/enquiry/submitInquiry').then((m) => m.submitInquiry);

const GROUPS: { group: ServiceGroup; label: string }[] = [
  { group: 'travel', label: 'Travel' },
  { group: 'visa', label: 'Visa & passport' },
  { group: 'other', label: 'Other' },
];

const FIELD_ORDER: EnquiryField[] = ['name', 'phone', 'service', 'message'];

const ERROR_TEXT: Record<ErrorKind, string> = {
  network: "We couldn't send your enquiry. Check your connection and try again, or call or WhatsApp us.",
  rejected: "We couldn't send your enquiry. Try again, or call or WhatsApp us instead.",
  unavailable: "Online enquiries aren't available right now. Call or WhatsApp us instead.",
};

/**
 * The Enquiry form (Home contact section and Contact page).
 * idle → submitting → success | error. Input is kept on error, with Call/WhatsApp fallbacks.
 * A hidden honeypot field: if a bot fills it, we show success and write nothing.
 */
export function EnquiryForm({
  defaultService,
  destination,
  sourcePage,
  id = 'enquiry',
  getDb = defaultGetDb,
}: EnquiryFormProps) {
  const uid = useId();
  const fieldId = (field: string) => `${uid}-${field}`;
  const headingId = `${id}-heading`;

  const initialValues = (): Values => ({ name: '', phone: '', service: defaultService ?? '', message: '' });
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [errorKind, setErrorKind] = useState<ErrorKind>('network');
  const [announcement, setAnnouncement] = useState('');
  const honeypotRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const warmed = useRef(false);
  const focusNameAfterReset = useRef(false);

  // Move focus to the result after the form is swapped out (and back to the form after a reset).
  useEffect(() => {
    if (status === 'success') successRef.current?.focus();
    else if (status === 'idle' && focusNameAfterReset.current) {
      focusNameAfterReset.current = false;
      document.getElementById(fieldId('name'))?.focus();
    }
  }, [status]);

  const dest = destination?.trim() || undefined;
  const contextLabel = [defaultService && defaultService !== 'other' ? getService(defaultService).label : undefined, dest]
    .filter(Boolean)
    .join(' · ');

  /** Start fetching the Firebase chunks as soon as someone starts filling the form. */
  const warmUp = () => {
    if (warmed.current) return;
    warmed.current = true;
    void Promise.all([getDb(), loadSubmit()]).catch(() => {});
  };

  const update = (field: keyof Values) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field as EnquiryField]) setErrors(({ [field as EnquiryField]: _removed, ...rest }) => rest);
  };

  const focusField = (field: EnquiryField) => {
    document.getElementById(fieldId(field))?.focus();
  };

  const succeed = () => {
    setStatus('success');
    setAnnouncement('Thank you. Your enquiry has been sent.');
  };

  const fail = (kind: ErrorKind) => {
    setErrorKind(kind);
    setStatus('error');
    setAnnouncement(ERROR_TEXT[kind]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;

    const input = { ...values, sourcePage, destination: dest ?? null };
    const checked = validateEnquiry(input);
    if (!checked.ok) {
      setErrors(checked.fieldErrors);
      const count = Object.keys(checked.fieldErrors).length;
      setAnnouncement(`Fix ${count === 1 ? 'the highlighted field' : `the ${count} highlighted fields`}.`);
      const first = FIELD_ORDER.find((f) => checked.fieldErrors[f]);
      if (first) focusField(first);
      return;
    }
    setErrors({});

    // Honeypot: real people never see this field.
    if (honeypotRef.current?.value) {
      succeed();
      return;
    }

    setStatus('submitting');
    setAnnouncement('Sending your enquiry…');
    try {
      const [db, submitInquiry] = await Promise.all([getDb(), loadSubmit()]);
      if (!db) return fail('unavailable');
      const result = await submitInquiry(db, input);
      if (result.ok) return succeed();
      if (result.reason === 'validation') {
        setStatus('idle');
        setErrors(result.fieldErrors ?? {});
        setAnnouncement('Fix the highlighted fields.');
        return;
      }
      fail(result.reason);
    } catch {
      fail('network');
    }
  };

  const reset = () => {
    setValues(initialValues());
    setErrors({});
    setStatus('idle');
    setAnnouncement('');
    if (honeypotRef.current) honeypotRef.current.value = '';
    focusNameAfterReset.current = true;
  };

  const describedBy = (field: EnquiryField, hint?: boolean) =>
    [hint && fieldId(`${field}-hint`), errors[field] && fieldId(`${field}-error`)].filter(Boolean).join(' ') || undefined;

  const fieldError = (field: EnquiryField) =>
    errors[field] ? (
      <p id={fieldId(`${field}-error`)} className="enquiry-form__error">
        <CircleAlert aria-hidden="true" />
        {errors[field]}
      </p>
    ) : null;

  const submitting = status === 'submitting';

  return (
    <div id={id} className="enquiry-form" data-source-page={sourcePage} role="region" aria-labelledby={headingId}>
      <span className="enquiry-form__icon" aria-hidden="true">
        <MessageSquareText strokeWidth={1.75} />
      </span>
      <h2 id={headingId} className="enquiry-form__title">
        Send us an enquiry
      </h2>

      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {status === 'success' ? (
        <div className="enquiry-form__success">
          <h3 ref={successRef} tabIndex={-1} className="enquiry-form__success-title">
            <CircleCheck aria-hidden="true" />
            Thank you. Your enquiry has been sent.
          </h3>
          <p>
            {business.contactPerson} will get back to you soon. If it's urgent, call us on{' '}
            <a href={`tel:${business.phone.e164}`}>{business.phone.display}</a>.
          </p>
          <button type="button" className="btn btn--outline" onClick={reset}>
            Send another enquiry
          </button>
        </div>
      ) : (
        <>
          <p className="enquiry-form__intro">
            Tell us a little about your plans and we'll call or WhatsApp you back.
          </p>
          {contextLabel && (
            <p className="enquiry-form__context">
              <span className="enquiry-form__context-label">Enquiring about:</span> {contextLabel}
            </p>
          )}

          <form
            className="enquiry-form__form"
            noValidate
            onSubmit={handleSubmit}
            onFocus={warmUp}
            aria-describedby={`${id}-privacy`}
          >
            <div className="enquiry-form__field">
              <label htmlFor={fieldId('name')}>Your name</label>
              <input
                id={fieldId('name')}
                name="name"
                type="text"
                autoComplete="name"
                required
                value={values.name}
                onChange={(e) => update('name')(e.target.value)}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={describedBy('name')}
              />
              {fieldError('name')}
            </div>

            <div className="enquiry-form__field">
              <label htmlFor={fieldId('phone')}>Phone number</label>
              <input
                id={fieldId('phone')}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={values.phone}
                onChange={(e) => update('phone')(e.target.value)}
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={describedBy('phone', true)}
              />
              <p id={fieldId('phone-hint')} className="enquiry-form__hint">
                Indian mobile number, with or without +91.
              </p>
              {fieldError('phone')}
            </div>

            <div className="enquiry-form__field">
              <label htmlFor={fieldId('service')}>Service of interest</label>
              <select
                id={fieldId('service')}
                name="service"
                required
                value={values.service}
                onChange={(e) => update('service')(e.target.value)}
                aria-invalid={errors.service ? true : undefined}
                aria-describedby={describedBy('service')}
              >
                <option value="" disabled>
                  Choose a service
                </option>
                {GROUPS.map(({ group, label }) => (
                  <optgroup key={group} label={label}>
                    {services
                      .filter((s) => s.group === group)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              {fieldError('service')}
            </div>

            <div className="enquiry-form__field">
              <label htmlFor={fieldId('message')}>
                Message <span className="enquiry-form__optional">(optional)</span>
              </label>
              <textarea
                id={fieldId('message')}
                name="message"
                rows={4}
                value={values.message}
                onChange={(e) => update('message')(e.target.value)}
                aria-invalid={errors.message ? true : undefined}
                aria-describedby={describedBy('message', true)}
              />
              <p id={fieldId('message-hint')} className="enquiry-form__hint">
                Travel dates, number of travellers, destination or anything else that helps.
              </p>
              {fieldError('message')}
            </div>

            {/* Honeypot: hidden from people and assistive tech; bots tend to fill every field. */}
            <div className="enquiry-form__hp" inert>
              <label htmlFor={fieldId('website')}>Leave this field empty</label>
              <input ref={honeypotRef} id={fieldId('website')} name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            {status === 'error' && (
              <div className="enquiry-form__failure">
                <p className="enquiry-form__failure-text">
                  <CircleAlert aria-hidden="true" />
                  {ERROR_TEXT[errorKind]}
                </p>
                <ContactActions
                  layout="row"
                  size="sm"
                  actions={['call', 'whatsapp']}
                  whatsappText={buildEnquiryMessage({
                    service: isServiceId(values.service) ? values.service : undefined,
                    destination: dest,
                  })}
                />
              </div>
            )}

            <button type="submit" className="btn btn--primary enquiry-form__submit" disabled={submitting} aria-busy={submitting || undefined}>
              {submitting ? 'Sending…' : status === 'error' ? 'Try again' : 'Send enquiry'}
            </button>

            <p id={`${id}-privacy`} className="enquiry-form__privacy">
              We use your details only to reply to your enquiry. See our <Link to={routes.privacy}>Privacy</Link> page.
            </p>
          </form>
        </>
      )}
    </div>
  );
}
