/**
 * Documents card (Booking detail rail; spec "Documents card", ticket 12). One row per document:
 * Prepare (Invoice: first Prepare allocates the invoice number) → filename + Share (only if
 * `navigator.canShare({ files })`) / Preview / Download / WhatsApp / Email, with the prefilled message.
 * The PDF stack loads lazily on Prepare. The File lives in memory only; sending writes nothing.
 */
import { Download, Eye, FileText, Mail, MessageCircle, Share2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { allocateInvoiceNo, getBusinessProfile, useAdminDb } from '../../data';
import {
  divisionOf,
  emailSubject,
  linesMissingConfirmation,
  mailtoUrl,
  shareMessage,
  whatsappUrl,
  type Booking,
  type BusinessProfile,
  type Client,
  type DocumentKind,
} from '../../model';
import { Button, errorMessage, LinkButton, Panel, useToast } from '../../ui';

type Prepared = { file: File; url: string; tradingName: string; invoiceNo?: string };
type RowState = { status: 'idle' } | { status: 'busy' } | { status: 'error'; message: string } | ({ status: 'ready' } & Prepared);

const LABEL: Record<DocumentKind, string> = { invoice: 'Invoice', voucher: 'Voucher' };

/** Builds one document's File: loads the PDF chunk, the Business profile and (Invoice) the invoice number. */
async function build(kind: DocumentKind, db: ReturnType<typeof useAdminDb>, booking: Booking, client?: Client): Promise<Omit<Prepared, 'url'>> {
  const loadPdf = import('../../pdf');
  let profile: BusinessProfile;
  let target = booking;
  if (kind === 'invoice') {
    const [invoice, p] = await Promise.all([allocateInvoiceNo(db, booking.id), getBusinessProfile(db)]);
    profile = p;
    target = { ...booking, invoiceNo: invoice.invoiceNo, invoiceSeq: invoice.invoiceSeq, invoiceDate: invoice.invoiceDate };
  } else {
    profile = await getBusinessProfile(db);
  }
  const pdf = await loadPdf;
  const file = kind === 'invoice' ? await pdf.prepareInvoice(target, { client, profile }) : await pdf.prepareVoucher(target, { client, profile });
  return { file, tradingName: profile.tradingName ?? '', invoiceNo: target.invoiceNo };
}

function canShareFile(file: File): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function DocumentRow({ kind, booking, client }: { kind: DocumentKind; booking: Booking; client?: Client }) {
  const db = useAdminDb();
  const toast = useToast();
  const [state, setState] = useState<RowState>({ status: 'idle' });
  const cancelled = booking.status === 'Cancelled';
  const disabled = kind === 'voucher' && cancelled;

  // Drop the Blob URL when the file is replaced or the page is left.
  const url = state.status === 'ready' ? state.url : undefined;
  useEffect(() => (url ? () => URL.revokeObjectURL(url) : undefined), [url]);

  const prepare = async () => {
    setState({ status: 'busy' });
    try {
      const built = await build(kind, db, booking, client);
      setState({ status: 'ready', ...built, url: URL.createObjectURL(built.file) });
    } catch (error) {
      const code = (error as { code?: string }).code;
      setState({ status: 'error', message: code ? errorMessage(error as Error) : `Couldn't build the ${LABEL[kind]} PDF. Try again.` });
    }
  };

  const missing = kind === 'voucher' ? linesMissingConfirmation(booking).length : 0;
  const idleSub =
    kind === 'invoice'
      ? (booking.invoiceNo ?? 'Number assigned when first prepared')
      : missing
        ? `${missing} line${missing === 1 ? '' : 's'} will print "To be confirmed"`
        : 'Day-by-day services and confirmation numbers';

  const label = LABEL[kind];
  return (
    <li aria-label={label}>
      <div className="adm-docs__name">
        <FileText aria-hidden />
        <span>
          <strong>{label}</strong>
          <span className="adm-sub">{disabled ? 'Booking cancelled' : state.status === 'ready' ? state.file.name : idleSub}</span>
        </span>
      </div>
      {disabled ? null : state.status === 'ready' ? (
        <ReadyActions kind={kind} booking={booking} client={client} prepared={state} onShareError={() => toast("Couldn't share the file. Use Download instead.", { tone: 'danger' })}>
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
        </div>
      )}
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
  kind: DocumentKind;
  booking: Booking;
  client?: Client;
  prepared: Prepared;
  onShareError: () => void;
  children: ReactNode;
}) {
  const { file, url, tradingName, invoiceNo } = prepared;
  const input = { kind, clientName: client?.name ?? '', bookingNo: booking.bookingNo, invoiceNo, tradingName };
  const message = shareMessage(input);
  const share = async () => {
    try {
      await navigator.share({ files: [file], title: file.name, text: message });
    } catch (error) {
      if ((error as { name?: string }).name !== 'AbortError') onShareError();
    }
  };
  const label = LABEL[kind];
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
      {client?.mobile ? (
        <a
          className="adm-btn adm-btn--outline adm-btn--sm"
          href={whatsappUrl(client.mobile, message)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${label}`}
        >
          <MessageCircle aria-hidden /> WhatsApp
        </a>
      ) : null}
      {client?.email ? (
        <a className="adm-btn adm-btn--outline adm-btn--sm" href={mailtoUrl(client.email, emailSubject(input), message)} aria-label={`Email ${label}`}>
          <Mail aria-hidden /> Email
        </a>
      ) : null}
      {children}
    </div>
  );
}

export function DocumentsCard({ booking, client }: { booking: Booking; client?: Client }) {
  return (
    <Panel title="Documents">
      <ul className="adm-docs">
        <DocumentRow kind="invoice" booking={booking} client={client} />
        {divisionOf(booking.category) === 'Immigration' ? null : <DocumentRow kind="voucher" booking={booking} client={client} />}
      </ul>
    </Panel>
  );
}
