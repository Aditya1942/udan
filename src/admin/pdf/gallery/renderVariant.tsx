/** Renders one family × document × scenario to a PDF Blob (browser gallery and the Node harness share this). */
import { pdf } from '@react-pdf/renderer';
import { qrPng } from '../render';
import { registerFonts, type PdfAssets } from '../theme';
import type { DocKind, VariantFamily } from '../variants/types';
import { adminInvoiceView, invoiceView, voucherView } from '../view';
import type { Scenario } from './scenarios';

export type GalleryAssets = PdfAssets & { mark: string };

/** Why a combination can't render (shown instead of a PDF), or undefined. */
export function unavailableReason(kind: DocKind, s: Scenario): string | undefined {
  if (kind === 'voucher' && s.booking.status === 'Cancelled') return 'No voucher for a cancelled booking (by design).';
  return undefined;
}

/** Renders serially: fonts are global, so two documents must never lay out at once. */
let queue: Promise<unknown> = Promise.resolve();

export function renderVariant(family: VariantFamily, kind: DocKind, s: Scenario, assets: GalleryAssets): Promise<Blob> {
  const job = queue.then(() => renderNow(family, kind, s, assets));
  queue = job.catch(() => undefined);
  return job;
}

async function renderNow(family: VariantFamily, kind: DocKind, s: Scenario, assets: GalleryAssets): Promise<Blob> {
  registerFonts(assets.fonts);
  const input = { booking: s.booking, client: s.client, profile: s.profile };
  let doc;
  if (kind === 'invoice') {
    const view = invoiceView(input);
    const qr = view.payment?.qr ? await qrPng(view.payment.qr.uri) : undefined;
    doc = <family.Invoice view={view} assets={{ wordmark: assets.wordmark, mark: assets.mark, qr }} />;
  } else if (kind === 'admin') {
    const view = adminInvoiceView({ ...input, dmcs: s.dmcs, today: s.today });
    const qr = view.payment?.qr ? await qrPng(view.payment.qr.uri) : undefined;
    doc = <family.AdminInvoice view={view} assets={{ wordmark: assets.wordmark, mark: assets.mark, qr }} />;
  } else {
    const view = voucherView({ ...input, today: s.today });
    doc = <family.Voucher view={view} assets={{ wordmark: assets.wordmark, mark: assets.mark }} />;
  }
  return pdf(doc).toBlob();
}
