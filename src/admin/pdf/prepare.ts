/**
 * `prepareInvoice` / `prepareVoucher` → a PDF `File` named per the spec. Loaded only when Prepare is pressed
 * (the Documents card imports `src/admin/pdf` lazily). The Invoice number must already be allocated
 * (`allocateInvoiceNo`, first Prepare); re-Prepare renders the current price, payments and balance.
 */
import markUrl from '../../assets/brand/udan-mark.png';
import {
  adminInvoiceFilename,
  invoiceFilename,
  todayIST,
  voucherFilename,
  type Booking,
  type BusinessProfile,
  type Client,
  type Dmc,
  type ISODate,
} from '../model';
import { BROWSER_ASSETS } from './assets';
import { renderInvoicePdf, renderVoucherPdf } from './render';
import { familyById, renderTemplate, type TemplateAssets } from './renderTemplate';
import type { PdfAssets } from './theme';
import type { DocKind } from './variants/types';
import { adminInvoiceView, invoiceView, voucherView } from './view';

export type PrepareData = {
  client?: Client;
  profile: BusinessProfile;
  /** Voucher issue date; default today (IST). */
  today?: ISODate;
  /** Default: the bundled browser assets. */
  assets?: PdfAssets;
};

const PDF = 'application/pdf';

export async function prepareInvoice(booking: Booking, { client, profile, assets = BROWSER_ASSETS }: PrepareData): Promise<File> {
  const view = invoiceView({ booking, client, profile });
  const blob = await renderInvoicePdf(view, assets);
  return new File([blob], invoiceFilename(view.invoiceNo), { type: PDF });
}

export async function prepareVoucher(booking: Booking, { client, profile, today = todayIST(), assets = BROWSER_ASSETS }: PrepareData): Promise<File> {
  const view = voucherView({ booking, client, profile, today });
  const blob = await renderVoucherPdf(view, assets);
  return new File([blob], voucherFilename(booking.bookingNo), { type: PDF });
}

export type DocumentPrepareData = PrepareData & {
  /** Template family id (unknown → fallback). */
  family: string;
  /** Admin invoice: the DMCs on the Booking's lines. */
  dmcs?: Dmc[];
};

const ASSETS_WITH_MARK = (assets: PdfAssets): TemplateAssets => ({ ...assets, mark: markUrl });

/**
 * Any document with any template family → PDF `File`. Invoice needs the invoice number on the Booking; the Admin
 * invoice works without one ("Not invoiced yet"); the Voucher refuses a cancelled Booking.
 */
export async function prepareDocument(
  kind: DocKind,
  booking: Booking,
  { client, profile, today = todayIST(), assets = BROWSER_ASSETS, family, dmcs = [] }: DocumentPrepareData,
): Promise<File> {
  const tpl = familyById(family);
  const a = ASSETS_WITH_MARK(assets);
  if (kind === 'invoice') {
    const view = invoiceView({ booking, client, profile });
    return new File([await renderTemplate(tpl, { kind, view }, a)], invoiceFilename(view.invoiceNo), { type: PDF });
  }
  if (kind === 'admin') {
    const view = adminInvoiceView({ booking, client, profile, dmcs, today });
    return new File([await renderTemplate(tpl, { kind, view }, a)], adminInvoiceFilename(booking.bookingNo), { type: PDF });
  }
  const view = voucherView({ booking, client, profile, today });
  return new File([await renderTemplate(tpl, { kind, view }, a)], voucherFilename(booking.bookingNo), { type: PDF });
}
