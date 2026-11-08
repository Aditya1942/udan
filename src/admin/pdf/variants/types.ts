/**
 * Template-variant contract (overview: src/admin/pdf/TEMPLATES.md). A variant *family* is one design language applied to all three documents:
 * the customer Invoice, the internal Admin invoice and the Voucher. Templates only lay out a view-model
 * (`view.ts` decides every value); they never compute money, dates or visibility themselves.
 */
import type { ReactElement } from 'react';
import type { AdminInvoiceView, InvoiceView, VoucherView } from '../view';

/** Images every template may use. `qr` = UPI QR PNG data URL for the balance (only when `view.payment.qr`). */
export type VariantAssets = {
  /** Horizontal UDAN wordmark (416×131 PNG). */
  wordmark: string;
  /** Square-ish UDAN mark / logo only (241×284 PNG). */
  mark: string;
  qr?: string;
};

export type InvoiceTemplate = (props: { view: InvoiceView; assets: VariantAssets }) => ReactElement;
export type AdminInvoiceTemplate = (props: { view: AdminInvoiceView; assets: VariantAssets }) => ReactElement;
export type VoucherTemplate = (props: { view: VoucherView; assets: VariantAssets }) => ReactElement;

export type VariantFamily = {
  /** URL-safe id (`reference`, `ledger`…). */
  id: string;
  /** Short display name. */
  name: string;
  /** One line: the idea behind the design. */
  tagline: string;
  /** Each returns a react-pdf `<Document>`. */
  Invoice: InvoiceTemplate;
  AdminInvoice: AdminInvoiceTemplate;
  Voucher: VoucherTemplate;
};

export type DocKind = 'invoice' | 'admin' | 'voucher';
export const DOC_KINDS: { id: DocKind; label: string }[] = [
  { id: 'invoice', label: 'Customer invoice' },
  { id: 'admin', label: 'Admin invoice' },
  { id: 'voucher', label: 'Voucher' },
];
