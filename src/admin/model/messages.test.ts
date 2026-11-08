import { describe, expect, it } from 'vitest';
import { DEFAULT_MESSAGES, EMPTY_DOCUMENT_SETTINGS, fillMessage, messageKey, messageTemplate } from './messages';

describe('fillMessage', () => {
  it('fills placeholders and drops unknown or empty ones with what they leave behind', () => {
    expect(fillMessage('Hi {name}, invoice {invoiceNo}: {link}', { name: 'Asha', invoiceNo: 'UDAN/2026-27/001', link: 'https://x/d/t' })).toBe(
      'Hi Asha, invoice UDAN/2026-27/001: https://x/d/t',
    );
    expect(fillMessage('Hi {name},\n\n{pendingLine}\n\n\nBye {unknown}!', {})).toBe('Hi,\n\nBye!');
    expect(fillMessage('Invoice *{invoiceNo}* ready', {})).toBe('Invoice  ready');
  });

  it('default messages read cleanly with every value filled', () => {
    const text = fillMessage(DEFAULT_MESSAGES.invoiceWhatsapp, {
      name: 'Asha',
      tradingName: 'UDAN',
      invoiceNo: 'UDAN/2026-27/001',
      trip: 'Dubai (1 Dec 2026 – 5 Dec 2026)',
      link: 'https://udantours.in/d/abc',
      paymentLine: 'Balance due: ₹50,000 by 20 Nov 2026.',
      phone: '+91 96872 32015',
    });
    expect(text).toBe(`Hi Asha,

Thank you for booking with UDAN! Your invoice *UDAN/2026-27/001* for Dubai (1 Dec 2026 – 5 Dec 2026) is ready:
https://udantours.in/d/abc

Balance due: ₹50,000 by 20 Nov 2026.

Any questions? Just reply here or call +91 96872 32015.`);
  });
});

describe('messageTemplate', () => {
  it('uses the saved text, else the default (blank = default)', () => {
    expect(messageKey('voucher', 'email')).toBe('voucherEmail');
    expect(messageTemplate(EMPTY_DOCUMENT_SETTINGS, 'invoiceEmail')).toBe(DEFAULT_MESSAGES.invoiceEmail);
    expect(messageTemplate({ defaults: {}, messages: { invoiceEmail: '  ' } }, 'invoiceEmail')).toBe(DEFAULT_MESSAGES.invoiceEmail);
    expect(messageTemplate({ defaults: {}, messages: { invoiceEmail: 'Hi {name}' } }, 'invoiceEmail')).toBe('Hi {name}');
  });
});
