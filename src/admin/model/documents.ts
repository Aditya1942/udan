/** Document filenames, share message, email subject and contact links (spec: "Documents card"). */

export type DocumentKind = 'invoice' | 'voucher';

/** `UDAN/2026-27/001` → `UDAN-Invoice-UDAN_2026-27_001.pdf`. */
export function invoiceFilename(invoiceNo: string): string {
  return `UDAN-Invoice-${invoiceNo.replaceAll('/', '_')}.pdf`;
}

/** `UDN-001` → `UDAN-Voucher-UDN-001.pdf`. */
export function voucherFilename(bookingNo: string): string {
  return `UDAN-Voucher-${bookingNo}.pdf`;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

export type ShareInput = {
  kind: DocumentKind;
  clientName: string;
  bookingNo: string;
  /** Needed for the email subject of an Invoice. */
  invoiceNo?: string;
  tradingName: string;
};

/** `Hi Asha, please find your invoice for booking UDN-001 attached. — UDAN Immigration & Tours` */
export function shareMessage({ kind, clientName, bookingNo, tradingName }: ShareInput): string {
  const doc = kind === 'invoice' ? 'invoice' : 'travel voucher';
  const hi = firstName(clientName);
  const sign = tradingName.trim() ? ` — ${tradingName.trim()}` : '';
  return `Hi${hi ? ` ${hi}` : ''}, please find your ${doc} for booking ${bookingNo} attached.${sign}`;
}

/** `Invoice UDAN/2026-27/001 — <trading name>` / `Travel voucher UDN-001 — <trading name>`. */
export function emailSubject({ kind, bookingNo, invoiceNo, tradingName }: ShareInput): string {
  const head = kind === 'invoice' ? `Invoice ${invoiceNo ?? bookingNo}` : `Travel voucher ${bookingNo}`;
  return tradingName.trim() ? `${head} — ${tradingName.trim()}` : head;
}

/** `https://wa.me/919876543210?text=…` from an E.164 number. */
export function whatsappUrl(e164: string, text?: string): string {
  const digits = e164.replace(/\D/g, '');
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}

export function telUrl(e164: string): string {
  return `tel:${e164.replace(/[^\d+]/g, '')}`;
}

export function mailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
