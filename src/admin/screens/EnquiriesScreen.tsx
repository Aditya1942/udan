import { MessageCircle, Phone, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { business, SERVICE_IDS } from '../../content/business';
import { deleteEnquiry, saveEnquiryNotes, setEnquiryStatus, useAdminData } from '../data';
import {
  ENQUIRY_FILTERS,
  enquiryCounts,
  firstName,
  formatDate,
  matchesEnquiryFilter,
  serviceLabel,
  telUrl,
  toISTDate,
  whatsappUrl,
  type Booking,
  type Enquiry,
  type EnquiryFilter,
  type EnquiryStatus,
  type ManualEnquiryStatus,
} from '../model';
import {
  Button,
  ButtonLink,
  ConfirmDialog,
  DataRegion,
  Dialog,
  EmptyState,
  errorMessage,
  Field,
  PageHeader,
  Segmented,
  useAdminTitle,
  useToast,
} from '../ui';
import { matchesText, SearchBox, useSearchParam } from './directory/shared';

const FILTER_LABELS: Record<EnquiryFilter, string> = {
  open: 'Open',
  new: 'New',
  contacted: 'Contacted',
  converted: 'Converted',
  closed: 'Closed',
  all: 'All',
};
const STATUS_LABELS: Record<EnquiryStatus, string> = { new: 'New', contacted: 'Contacted', converted: 'Converted', closed: 'Closed' };

const isFilter = (v: string): v is EnquiryFilter => (ENQUIRY_FILTERS as readonly string[]).includes(v);
const receivedOn = (e: Enquiry) => (e.createdAt ? toISTDate(e.createdAt) : '');

/**
 * `/admin/enquiries` — website Enquiries, newest first. URL: `?filter=open|new|contacted|converted|closed|all`
 * (default open), `q`, `service`, `from` / `to` (received date, IST).
 */
export function EnquiriesScreen() {
  useAdminTitle('Enquiries');
  const { enquiries, bookings, retry } = useAdminData();
  const [filterParam, setFilter] = useSearchParam('filter');
  const [q] = useSearchParam('q');
  const [service, setService] = useSearchParam('service');
  const [from, setFrom] = useSearchParam('from');
  const [to, setTo] = useSearchParam('to');
  const filter: EnquiryFilter = isFilter(filterParam) ? filterParam : 'open';

  const counts = useMemo(() => enquiryCounts(enquiries.data), [enquiries.data]);
  const list = useMemo(
    () =>
      enquiries.data.filter((e) => {
        if (!matchesEnquiryFilter(e.status, filter)) return false;
        if (service && e.service !== service) return false;
        const day = receivedOn(e);
        if ((from && day < from) || (to && day > to)) return false;
        return matchesText(q, e.name, e.phone, e.destination);
      }),
    [enquiries.data, filter, service, from, to, q],
  );
  const bookingsById = useMemo(() => new Map(bookings.data.map((b) => [b.id, b])), [bookings.data]);
  const narrowed = !!(q || service || from || to);

  return (
    <>
      <PageHeader title="Enquiries" subtitle="From the website enquiry form. Calling or messaging does not change the status." />
      <DataRegion
        status={enquiries.status}
        error={enquiries.error}
        onRetry={() => retry('enquiries')}
        errorTitle="Couldn't load Enquiries"
        isEmpty={enquiries.data.length === 0}
        empty={<EmptyState title="No Enquiries yet">Enquiries sent through the website form appear here as they arrive.</EmptyState>}
      >
        <div className="adm-table-tools">
          <Segmented
            label="Status"
            value={filter}
            onChange={(v) => setFilter(v === 'open' ? '' : v)}
            options={ENQUIRY_FILTERS.map((f) => ({
              value: f,
              label: (
                <>
                  {FILTER_LABELS[f]} <span className="adm-seg__n">{counts[f]}</span>
                </>
              ),
            }))}
          />
          <SearchBox label="Search enquiries" placeholder="Search name, phone, destination" />
        </div>
        <div className="adm-filters">
          <Field label="Service">
            <select value={service} onChange={(e) => setService(e.target.value)}>
              <option value="">All services</option>
              {SERVICE_IDS.map((id) => (
                <option key={id} value={id}>
                  {serviceLabel(id)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Received from">
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Received to">
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        {list.length === 0 ? (
          <EmptyState
            title={`No ${filter === 'all' ? '' : `${FILTER_LABELS[filter].toLowerCase()} `}enquiries${narrowed ? ' match' : ''}`}
            action={
              filter !== 'all' ? (
                <Button onClick={() => setFilter('all')}>Show all</Button>
              ) : undefined
            }
          >
            {narrowed ? 'Try a different search, service or date range.' : null}
          </EmptyState>
        ) : (
          <ul className="adm-enq" aria-label="Enquiries">
            {list.map((e) => (
              <EnquiryRow key={e.id} enquiry={e} booking={e.bookingId ? bookingsById.get(e.bookingId) : undefined} />
            ))}
          </ul>
        )}
      </DataRegion>
    </>
  );
}

function EnquiryRow({ enquiry: e, booking }: { enquiry: Enquiry; booking?: Booking }) {
  const { db } = useAdminData();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const received = receivedOn(e);
  const greeting = `Hi ${firstName(e.name)}, this is ${business.name} about your enquiry.`;

  const act = async (key: string, fn: () => Promise<void>, done?: string) => {
    setBusy(key);
    try {
      await fn();
      if (done) toast(done);
      return true;
    } catch (err) {
      toast(errorMessage(err as Error), { tone: 'danger' });
      return false;
    } finally {
      setBusy(null);
    }
  };
  const setStatus = (status: ManualEnquiryStatus, reason?: string) =>
    act(status, () => setEnquiryStatus(db, e.id, status, { closeReason: reason }));

  const details = [e.phone, serviceLabel(e.service), e.destination, received ? `received ${formatDate(received)}` : null, e.sourcePage ? `from ${e.sourcePage}` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <li className={`adm-enq__row is-${e.status}`} aria-label={e.name}>
      <div className="adm-enq__main">
        <p className="adm-enq__who">
          <strong>{e.name}</strong> <span className={`adm-badge adm-badge--enq-${e.status}`}>{STATUS_LABELS[e.status]}</span>
        </p>
        <p className="adm-sub">{details}</p>
        {e.message ? <p className="adm-enq__msg">{e.message}</p> : null}
        {e.status === 'closed' && e.closeReason ? <p className="adm-sub">Closed: {e.closeReason}</p> : null}
        <details className="adm-enq__notes" open={!!e.adminNotes || undefined}>
          <summary>{e.adminNotes ? 'Admin notes' : 'Add a note'}</summary>
          <textarea
            rows={2}
            defaultValue={e.adminNotes ?? ''}
            aria-label={`Admin notes for ${e.name}`}
            onBlur={(ev) => {
              const value = ev.target.value;
              if (value.trim() === (e.adminNotes ?? '').trim()) return;
              void act('notes', () => saveEnquiryNotes(db, e.id, value), 'Note saved.');
            }}
          />
        </details>
      </div>
      <div className="adm-enq__actions">
        <a className="adm-icon-btn" href={telUrl(e.phone)} aria-label={`Call ${e.name}`} title={`Call ${e.name}`}>
          <Phone aria-hidden />
        </a>
        <a
          className="adm-icon-btn"
          href={whatsappUrl(e.phone, greeting)}
          target="_blank"
          rel="noreferrer"
          aria-label={`WhatsApp ${e.name}`}
          title={`WhatsApp ${e.name}`}
        >
          <MessageCircle aria-hidden />
        </a>
        {e.status === 'converted' ? (
          booking ? (
            <ButtonLink size="sm" to={`/admin/bookings/${booking.bookingNo}`}>
              View {booking.bookingNo}
            </ButtonLink>
          ) : null
        ) : (
          <>
            {e.status === 'new' ? (
              <Button size="sm" busy={busy === 'contacted'} disabled={!!busy} onClick={() => void setStatus('contacted')}>
                Mark contacted
              </Button>
            ) : null}
            {e.status === 'closed' ? (
              <Button size="sm" busy={busy === 'contacted'} disabled={!!busy} onClick={() => void setStatus('contacted')}>
                Reopen
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!!busy}
                onClick={() => {
                  setCloseReason('');
                  setClosing(true);
                }}
              >
                Close
              </Button>
            )}
            <ButtonLink size="sm" variant="primary" to={`/admin/bookings/new?enquiry=${e.id}`}>
              Convert
            </ButtonLink>
            <button
              type="button"
              className="adm-icon-btn adm-icon-btn--ghost"
              aria-label={`Delete enquiry from ${e.name} as spam`}
              title="Delete as spam"
              disabled={!!busy}
              onClick={() => setDeleting(true)}
            >
              <Trash2 aria-hidden />
            </button>
          </>
        )}
      </div>
      <Dialog
        open={closing}
        onClose={() => setClosing(false)}
        title={`Close enquiry from ${e.name}?`}
        onSubmit={() => {
          void setStatus('closed', closeReason).then((ok) => ok && setClosing(false));
        }}
        footer={
          <>
            <Button onClick={() => setClosing(false)} disabled={busy === 'closed'}>
              Keep open
            </Button>
            <Button type="submit" variant="primary" busy={busy === 'closed'}>
              Close enquiry
            </Button>
          </>
        }
      >
        <Field label="Reason" hint="Optional, e.g. not interested, booked elsewhere.">
          <input value={closeReason} onChange={(ev) => setCloseReason(ev.target.value)} autoComplete="off" />
        </Field>
      </Dialog>
      <ConfirmDialog
        open={deleting}
        title="Delete this enquiry?"
        confirmLabel="Delete enquiry"
        danger
        busy={busy === 'delete'}
        onConfirm={() => {
          void act('delete', () => deleteEnquiry(db, e.id), 'Enquiry deleted.').then((ok) => !ok && setDeleting(false));
        }}
        onClose={() => setDeleting(false)}
      >
        <p>Use this for spam only. The enquiry from {e.name} is removed for good.</p>
      </ConfirmDialog>
    </li>
  );
}
