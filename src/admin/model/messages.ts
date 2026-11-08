/**
 * Document settings (`settings/documents`): default template per document and the WhatsApp / email message texts
 * sent with a live document link. Messages use `{placeholder}`s filled per Booking (`fillMessage`).
 */

/** Documents with a selectable template. */
export type DocumentTemplateKind = 'invoice' | 'admin' | 'voucher';

export const MESSAGE_KEYS = ['invoiceWhatsapp', 'invoiceEmail', 'voucherWhatsapp', 'voucherEmail'] as const;
export type MessageKey = (typeof MESSAGE_KEYS)[number];

export type DocumentSettings = {
  /** Template family id per document; missing/unknown = the fallback template. */
  defaults: Partial<Record<DocumentTemplateKind, string>>;
  /** Custom texts; missing/blank = `DEFAULT_MESSAGES`. */
  messages: Partial<Record<MessageKey, string>>;
  updatedAt?: Date;
};

export const EMPTY_DOCUMENT_SETTINGS: DocumentSettings = { defaults: {}, messages: {} };

/** Max length of one message text (rules cap). */
export const MESSAGE_MAX_CHARS = 2000;

export const MESSAGE_PLACEHOLDERS = [
  { key: 'name', label: 'Customer first name' },
  { key: 'fullName', label: 'Customer full name' },
  { key: 'bookingNo', label: 'Booking ID' },
  { key: 'invoiceNo', label: 'Invoice number' },
  { key: 'trip', label: 'Destination and dates (else the service)' },
  { key: 'total', label: 'Invoice total' },
  { key: 'balance', label: 'Balance due' },
  { key: 'paymentLine', label: 'Balance / paid / refund sentence' },
  { key: 'pendingLine', label: 'Services still being confirmed (voucher)' },
  { key: 'link', label: 'Document link' },
  { key: 'tradingName', label: 'Your trading name' },
  { key: 'phone', label: 'Your phone' },
] as const;
export type MessagePlaceholder = (typeof MESSAGE_PLACEHOLDERS)[number]['key'];
export type MessageVars = Partial<Record<MessagePlaceholder, string>>;

export const MESSAGE_LABEL: Record<MessageKey, string> = {
  invoiceWhatsapp: 'Invoice · WhatsApp',
  invoiceEmail: 'Invoice · Email',
  voucherWhatsapp: 'Voucher · WhatsApp',
  voucherEmail: 'Voucher · Email',
};

export const DEFAULT_MESSAGES: Record<MessageKey, string> = {
  invoiceWhatsapp: `Hi {name},

Thank you for booking with {tradingName}! Your invoice *{invoiceNo}* for {trip} is ready:
{link}

{paymentLine}

Any questions? Just reply here or call {phone}.`,
  invoiceEmail: `Dear {name},

Thank you for booking with {tradingName}. Your invoice {invoiceNo} for {trip} is ready. You can view or download it here:
{link}

{paymentLine}

The link always shows your latest payments and balance.

If you have any questions, reply to this email or call us on {phone}.

Warm regards,
{tradingName}`,
  voucherWhatsapp: `Hi {name},

Your travel voucher for {trip} is ready ✈️
{link}

It lists every service day by day with confirmation numbers. Please keep it handy while you travel.
{pendingLine}

Have a wonderful trip!
{tradingName} · {phone}`,
  voucherEmail: `Dear {name},

Your travel voucher for {trip} is ready. You can view or download it here:
{link}

It lists every service day by day with confirmation numbers. Please keep it handy (on your phone or printed) while you travel.
{pendingLine}

Need help during your trip? Call us on {phone}.

Have a wonderful trip!
{tradingName}`,
};

export function messageKey(kind: 'invoice' | 'voucher', channel: 'whatsapp' | 'email'): MessageKey {
  return `${kind}${channel === 'whatsapp' ? 'Whatsapp' : 'Email'}` as MessageKey;
}

/** The saved text, else the default. */
export function messageTemplate(settings: DocumentSettings, key: MessageKey): string {
  return settings.messages[key]?.trim() ? settings.messages[key]! : DEFAULT_MESSAGES[key];
}

/**
 * Replaces `{placeholder}`s (unknown or empty → nothing), then tidies what empty values leave behind: spaces before
 * punctuation, trailing spaces, runs of blank lines.
 */
export function fillMessage(template: string, vars: MessageVars): string {
  const filled = template.replace(/\{(\w+)\}/g, (_, key: string) => (vars as Record<string, string | undefined>)[key]?.trim() ?? '');
  return filled
    .split('\n')
    .map((line) => line.replace(/[ \t]+([,.!?])/g, '$1').replace(/\*\*/g, '').replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
