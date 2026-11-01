/** Renders a view-model to a PDF Blob (environment-neutral: assets are passed in). */
import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { InvoiceDocument } from './InvoiceDocument';
import { registerFonts, type PdfAssets } from './theme';
import type { InvoiceView, VoucherView } from './view';
import { VoucherDocument } from './VoucherDocument';

/** UPI QR as a PNG data URL, generated locally (no network). */
export function qrPng(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { margin: 0, width: 300, errorCorrectionLevel: 'M', color: { dark: '#253238', light: '#ffffff' } });
}

export async function renderInvoicePdf(view: InvoiceView, assets: PdfAssets): Promise<Blob> {
  registerFonts(assets.fonts);
  const qr = view.payment?.qr ? await qrPng(view.payment.qr.uri) : undefined;
  return pdf(<InvoiceDocument view={view} wordmark={assets.wordmark} qr={qr} />).toBlob();
}

export async function renderVoucherPdf(view: VoucherView, assets: PdfAssets): Promise<Blob> {
  registerFonts(assets.fonts);
  return pdf(<VoucherDocument view={view} wordmark={assets.wordmark} />).toBlob();
}
