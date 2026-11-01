/**
 * `prepareInvoice` / `prepareVoucher` → a PDF `File` named per the spec. Loaded only when Prepare is pressed
 * (the Documents card imports `src/admin/pdf` lazily). The Invoice number must already be allocated
 * (`allocateInvoiceNo`, first Prepare); re-Prepare renders the current price, payments and balance.
 */
import { invoiceFilename, todayIST, voucherFilename, type Booking, type BusinessProfile, type Client, type ISODate } from '../model';
import { BROWSER_ASSETS } from './assets';
import { renderInvoicePdf, renderVoucherPdf } from './render';
import type { PdfAssets } from './theme';
import { invoiceView, voucherView } from './view';

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
