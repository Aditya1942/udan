/**
 * Documents card (Booking detail rail). Rows: Invoice, Voucher (not for Immigration), Admin invoice (internal).
 * Each row has a template picker (starts on the Settings → Templates default; not saved on the Booking) and
 * Prepare → Preview / Download / Share (file). Invoice and Voucher also send a *live link* (`/d/<token>`) on WhatsApp or
 * email with the message from Settings (editable before sending); the link page builds the PDF from current data.
 * The Admin invoice is never shared: Preview / Download only. The PDF stack loads lazily on Prepare.
 */
import { Copy, Download, Eye, FileText, Link2Off, Mail, MessageCircle, RefreshCw, Share2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import {
  allocateInvoiceNo,
  disableShare,
  getBusinessProfile,
  publishShare,
  shareUrl,
  useAdminData,
  useAdminDb,
  useDocuments,
  type ShareRecord,
} from '../../data';
import {
  divisionOf,
  emailSubject,
  fillMessage,
  linesMissingConfirmation,
  mailtoUrl,
  messageKey,
  messageTemplate,
  shareMessage,
  todayIST,
  type Booking,
  type BusinessProfile,
  type Client,
  type Dmc,
} from '../../model';
import { defaultTemplate, TEMPLATE_CATALOG, TEMPLATE_DOC_LABEL, templateName, type TemplateDocKind } from '../../pdf/catalog';
import { messageVars, sharePayload, type ShareKind } from '../../pdf/share';
import { displayMobile } from '../../pdf/view';
import { Button, ConfirmDialog, Dialog, errorMessage, Field, LinkButton, Panel, Spinner, useToast } from '../../ui';

type Prepared = { file: File; url: string; tradingName: string; invoiceNo?: string };
type RowState = { status: 'idle' } | { status: 'busy' } | { status: 'error'; message: string } | ({ status: 'ready' } & Prepared);
type Db = ReturnType<typeof useAdminDb>;
type Channel = 'whatsapp' | 'email';

/** The Booking with its invoice number (allocated on first use) for Invoice documents. */
async function withInvoiceNo(db: Db, booking: Booking): Promise<Booking> {
  const { invoiceNo, invoiceSeq, invoiceDate } = await allocateInvoiceNo(db, booking.id);
  return { ...booking, invoiceNo, invoiceSeq, invoiceDate };
}

/** Builds one document's File: loads the PDF chunk, the Business profile and (Invoice) the invoice number. */
async function build(
  kind: TemplateDocKind,
  db: Db,
  booking: Booking,
  { client, family, dmcs }: { client?: Client; family: string; dmcs: Dmc[] },
): Promise<Omit<Prepared, 'url'>> {
  const loadPdf = import('../../pdf');
  const [target, profile] = await Promise.all([kind === 'invoice' ? withInvoiceNo(db, booking) : booking, getBusinessProfile(db)]);
  const pdf = await loadPdf;
  const file = await pdf.prepareDocument(kind, target, { client, profile, family, dmcs });
  return { file, tradingName: profile.tradingName ?? '', invoiceNo: target.invoiceNo };
}

type Published = { link: string; booking: Booking; profile: BusinessProfile; token: string };

/** Creates or refreshes the live link of one document (same URL while active). */
async function publishLink(
  db: Db,
  { kind, booking, client, family, existing }: { kind: ShareKind; booking: Booking; client?: Client; family: string; existing?: ShareRecord },
): Promise<Published> {
  const [target, profile] = await Promise.all([kind === 'invoice' ? withInvoiceNo(db, booking) : booking, getBusinessProfile(db)]);
  const issuedOn = todayIST();
  const payload = sharePayload({ kind, booking: target, client, profile, issuedOn });
  const token = await publishShare(db, { existing, kind, bookingId: booking.id, family, issuedOn, payload });
  return { link: shareUrl(token), booking: target, profile, token };
}

function canShareFile(file: File): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

const SUB: Record<TemplateDocKind, string> = {
  invoice: '',
  admin: 'Internal: DMCs, costs and margin. Never sent.',
  voucher: 'Day-by-day services and confirmation numbers',
};

function DocumentRow({ kind, booking, client }: { kind: TemplateDocKind; booking: Booking; client?: Client }) {
  const db = useAdminDb();
  const toast = useToast();
  const { dmcs } = useAdminData();
  const { settings, shareFor } = useDocuments();
  const [state, setState] = useState<RowState>({ status: 'idle' });
  const [picked, setPicked] = useState<string | null>(null);
  const [send, setSend] = useState<Channel | null>(null);
  const family = picked ?? defaultTemplate(settings.data, kind);
  const cancelled = booking.status === 'Cancelled';
  const disabled = kind === 'voucher' && cancelled;
  const shareKind: ShareKind | null = kind === 'admin' ? null : kind;
  const share = shareKind ? shareFor(booking.id, shareKind) : undefined;

  // Drop the Blob URL when the file is replaced or the page is left.
  const url = state.status === 'ready' ? state.url : undefined;
  useEffect(() => (url ? () => URL.revokeObjectURL(url) : undefined), [url]);

  const prepare = async () => {
    setState({ status: 'busy' });
    try {
      const built = await build(kind, db, booking, { client, family, dmcs: dmcs.data });
      setState({ status: 'ready', ...built, url: URL.createObjectURL(built.file) });
    } catch (error) {
      const code = (error as { code?: string }).code;
      setState({ status: 'error', message: code ? errorMessage(error as Error) : `Couldn't build the ${TEMPLATE_DOC_LABEL[kind]} PDF. Try again.` });
    }
  };

  const pick = (id: string) => {
    setPicked(id);
    if (state.status !== 'idle' && state.status !== 'busy') setState({ status: 'idle' });
  };

  const missing = kind === 'voucher' ? linesMissingConfirmation(booking).length : 0;
  const idleSub =
    kind === 'invoice'
      ? (booking.invoiceNo ?? 'Number assigned when first prepared or sent')
      : missing
        ? `${missing} line${missing === 1 ? '' : 's'} will print "To be confirmed"`
        : SUB[kind];

  const label = TEMPLATE_DOC_LABEL[kind];
  const sendButtons = shareKind ? (
    <>
      <Button size="sm" icon={<MessageCircle aria-hidden />} onClick={() => setSend('whatsapp')} aria-label={`WhatsApp ${label}`}>
        WhatsApp
      </Button>
      <Button size="sm" icon={<Mail aria-hidden />} onClick={() => setSend('email')} aria-label={`Email ${label}`}>
        Email
      </Button>
    </>
  ) : null;

  return (
    <li aria-label={label}>
      <div className="adm-docs__head">
        <div className="adm-docs__name">
          <FileText aria-hidden />
          <span>
            <strong>{label}</strong>
            <span className="adm-sub">{disabled ? 'Booking cancelled' : state.status === 'ready' ? state.file.name : idleSub}</span>
          </span>
        </div>
        {disabled ? null : (
          <label className="adm-docs__tpl">
            <span>Template</span>
            <select value={family} onChange={(e) => pick(e.target.value)} aria-label={`${label} template`}>
              {TEMPLATE_CATALOG.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.id === defaultTemplate(settings.data, kind) ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {disabled ? null : state.status === 'ready' ? (
        <ReadyActions
          kind={kind}
          booking={booking}
          client={client}
          prepared={state}
          onShareError={() => toast("Couldn't share the file. Use Download instead.", { tone: 'danger' })}
        >
          {sendButtons}
          <LinkButton onClick={prepare}>Prepare again</LinkButton>
        </ReadyActions>
      ) : state.status === 'error' ? (
        <div className="adm-docs__error" role="alert">
          <span>{state.message}</span>
          <Button size="sm" onClick={prepare}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="adm-actions">
          <Button size="sm" busy={state.status === 'busy'} onClick={prepare}>
            {state.status === 'busy' ? 'Preparing…' : `Prepare ${label}`}
          </Button>
          {sendButtons}
        </div>
      )}
      {shareKind && share && !disabled ? <LinkStatus kind={shareKind} share={share} booking={booking} client={client} /> : null}
      {shareKind && send ? (
        <SendDialog
          kind={shareKind}
          channel={send}
          booking={booking}
          client={client}
          family={family}
          existing={share}
          onClose={() => setSend(null)}
        />
      ) : null}
    </li>
  );
}

function ReadyActions({
  kind,
  booking,
  client,
  prepared,
  onShareError,
  children,
}: {
  kind: TemplateDocKind;
  booking: Booking;
  client?: Client;
  prepared: Prepared;
  onShareError: () => void;
  children: ReactNode;
}) {
  const { file, url, tradingName, invoiceNo } = prepared;
  const label = TEMPLATE_DOC_LABEL[kind];
  const share = async () => {
    const message =
      kind === 'admin' ? file.name : shareMessage({ kind, clientName: client?.name ?? '', bookingNo: booking.bookingNo, invoiceNo, tradingName });
    try {
      await navigator.share({ files: [file], title: file.name, text: message });
    } catch (error) {
      if ((error as { name?: string }).name !== 'AbortError') onShareError();
    }
  };
  return (
    <div className="adm-actions">
      {canShareFile(file) ? (
        <Button size="sm" variant="primary" icon={<Share2 aria-hidden />} onClick={share} aria-label={`Share ${label}`}>
          Share
        </Button>
      ) : null}
      <a className="adm-btn adm-btn--outline adm-btn--sm" href={url} target="_blank" rel="noopener" aria-label={`Preview ${label}`}>
        <Eye aria-hidden /> Preview
      </a>
      <a className="adm-btn adm-btn--outline adm-btn--sm" href={url} download={file.name} aria-label={`Download ${label}`}>
        <Download aria-hidden /> Download
      </a>
      {children}
    </div>
  );
}

/** "Live link on" + Copy / Disable / New link for an active share. */
function LinkStatus({ kind, share, booking, client }: { kind: ShareKind; share: ShareRecord; booking: Booking; client?: Client }) {
  const db = useAdminDb();
  const toast = useToast();
  const [confirm, setConfirm] = useState<'disable' | 'rotate' | null>(null);
  const [busy, setBusy] = useState(false);
  const label = TEMPLATE_DOC_LABEL[kind];

  const copy = async (link: string, message = 'Link copied') => {
    try {
      await navigator.clipboard.writeText(link);
      toast(message);
    } catch {
      toast(link);
    }
  };

  const act = async () => {
    setBusy(true);
    try {
      await disableShare(db, share.token);
      if (confirm === 'rotate') {
        const { link } = await publishLink(db, { kind, booking, client, family: share.family });
        await copy(link, 'New link copied. The old one no longer works.');
      } else {
        toast('Link disabled');
      }
      setConfirm(null);
    } catch (error) {
      toast(errorMessage(error as Error), { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-docs__link">
      <span>
        <span className="adm-docs__link-dot" aria-hidden />
        Live link on · {templateName(share.family)}
      </span>
      <LinkButton onClick={() => copy(shareUrl(share.token))} aria-label={`Copy ${label} link`}>
        <Copy aria-hidden /> Copy link
      </LinkButton>
      <LinkButton onClick={() => setConfirm('rotate')} aria-label={`New ${label} link`}>
        <RefreshCw aria-hidden /> New link
      </LinkButton>
      <LinkButton onClick={() => setConfirm('disable')} aria-label={`Disable ${label} link`}>
        <Link2Off aria-hidden /> Disable
      </LinkButton>
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'rotate' ? `Replace the ${label.toLowerCase()} link?` : `Disable the ${label.toLowerCase()} link?`}
        confirmLabel={confirm === 'rotate' ? 'Replace link' : 'Disable link'}
        danger={confirm === 'disable'}
        busy={busy}
        onConfirm={act}
        onClose={() => setConfirm(null)}
      >
        <p>
          {confirm === 'rotate'
            ? 'The link you sent before stops working and a new one is copied for you to send.'
            : 'Anyone opening the link will see "This link is no longer active". Sending again creates a new link.'}
        </p>
      </ConfirmDialog>
    </div>
  );
}

const waUrl = (mobile: string | undefined, text: string) =>
  `https://wa.me/${mobile ? mobile.replace(/\D/g, '') : ''}?text=${encodeURIComponent(text)}`;

type SendState = { status: 'busy' } | { status: 'error'; message: string } | { status: 'ready'; link: string };

/** Creates/refreshes the live link, then shows the prefilled (editable) message with Open WhatsApp / Open email. */
function SendDialog({
  kind,
  channel,
  booking,
  client,
  family,
  existing,
  onClose,
}: {
  kind: ShareKind;
  channel: Channel;
  booking: Booking;
  client?: Client;
  family: string;
  existing?: ShareRecord;
  onClose: () => void;
}) {
  const db = useAdminDb();
  const toast = useToast();
  const { settings } = useDocuments();
  const [state, setState] = useState<SendState>({ status: 'busy' });
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [attempt, setAttempt] = useState(0);
  const label = TEMPLATE_DOC_LABEL[kind].toLowerCase();

  useEffect(() => {
    let live = true;
    setState({ status: 'busy' });
    publishLink(db, { kind, booking, client, family, existing }).then(
      ({ link, booking: target, profile }) => {
        if (!live) return;
        const vars = messageVars({ kind, booking: target, client, profile, today: todayIST(), link });
        setText(fillMessage(messageTemplate(settings.data, messageKey(kind, channel)), vars));
        setSubject(
          emailSubject({ kind, clientName: client?.name ?? '', bookingNo: target.bookingNo, invoiceNo: target.invoiceNo, tradingName: profile.tradingName ?? '' }),
        );
        setState({ status: 'ready', link });
      },
      (error: Error) => live && setState({ status: 'error', message: (error as { code?: string }).code ? errorMessage(error) : "Couldn't create the link. Try again." }),
    );
    return () => {
      live = false;
    };
    // Only on open / retry: the link must not be re-published while the message is being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Message copied');
    } catch {
      toast("Couldn't copy. Select the text and copy it.", { tone: 'danger' });
    }
  };

  const ready = state.status === 'ready';
  const to =
    channel === 'whatsapp'
      ? client?.mobile
        ? `To ${client.name} · ${displayMobile(client.mobile)}`
        : 'No mobile on file: WhatsApp will ask you to choose a chat.'
      : client?.email
        ? `To ${client.name} · ${client.email}`
        : 'No email on file: add the address in your email app.';
  const href = channel === 'whatsapp' ? waUrl(client?.mobile, text) : client?.email ? mailtoUrl(client.email, subject, text) : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

  return (
    <Dialog
      open
      onClose={onClose}
      title={channel === 'whatsapp' ? `Send ${label} on WhatsApp` : `Email ${label}`}
      className="adm-send"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          {ready ? (
            <>
              <Button icon={<Copy aria-hidden />} onClick={copy}>
                Copy message
              </Button>
              <a
                className="adm-btn adm-btn--primary"
                href={href}
                target={channel === 'whatsapp' ? '_blank' : undefined}
                rel="noopener noreferrer"
                onClick={() => setTimeout(onClose, 0)}
              >
                {channel === 'whatsapp' ? <MessageCircle aria-hidden /> : <Mail aria-hidden />}
                {channel === 'whatsapp' ? 'Open WhatsApp' : 'Open email'}
              </a>
            </>
          ) : null}
        </>
      }
    >
      {state.status === 'busy' ? (
        <p role="status" className="adm-muted">
          <Spinner /> {existing ? 'Updating the live link…' : 'Creating the live link…'}
        </p>
      ) : state.status === 'error' ? (
        <div className="adm-docs__error" role="alert">
          <span>{state.message}</span>
          <Button size="sm" onClick={() => setAttempt((n) => n + 1)}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="adm-stack">
          <p className="adm-send__to">{to}</p>
          {channel === 'email' ? (
            <Field label="Subject">
              <input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
          ) : null}
          <Field label="Message" hint={`Template: ${templateName(family)}. The link always shows the latest booking details.`}>
            <textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        </div>
      )}
    </Dialog>
  );
}

export function DocumentsCard({ booking, client }: { booking: Booking; client?: Client }) {
  return (
    <Panel title="Documents">
      <ul className="adm-docs">
        <DocumentRow kind="invoice" booking={booking} client={client} />
        {divisionOf(booking.category) === 'Immigration' ? null : <DocumentRow kind="voucher" booking={booking} client={client} />}
        <DocumentRow kind="admin" booking={booking} client={client} />
      </ul>
    </Panel>
  );
}
