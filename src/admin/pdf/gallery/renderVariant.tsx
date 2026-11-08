/** Renders one family × document × scenario to a PDF Blob (browser gallery, Settings previews and the Node harness share this). */
import { renderTemplate, type TemplateAssets } from '../renderTemplate';
import type { DocKind, VariantFamily } from '../variants/types';
import { adminInvoiceView, invoiceView, voucherView } from '../view';
import type { Scenario } from './scenarios';

export type GalleryAssets = TemplateAssets;

/** Why a combination can't render (shown instead of a PDF), or undefined. */
export function unavailableReason(kind: DocKind, s: Scenario): string | undefined {
  if (kind === 'voucher' && s.booking.status === 'Cancelled') return 'No voucher for a cancelled booking (by design).';
  return undefined;
}

/** Renders serially (shared queue in `renderTemplate`). */
export function renderVariant(family: VariantFamily, kind: DocKind, s: Scenario, assets: GalleryAssets): Promise<Blob> {
  const input = { booking: s.booking, client: s.client, profile: s.profile };
  try {
    if (kind === 'invoice') return renderTemplate(family, { kind, view: invoiceView(input) }, assets);
    if (kind === 'admin') return renderTemplate(family, { kind, view: adminInvoiceView({ ...input, dmcs: s.dmcs, today: s.today }) }, assets);
    return renderTemplate(family, { kind, view: voucherView({ ...input, today: s.today }) }, assets);
  } catch (error) {
    return Promise.reject(error);
  }
}
