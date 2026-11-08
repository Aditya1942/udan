/**
 * Renders a view-model with a template family to a PDF Blob. One serial queue for the whole app: react-pdf fonts are
 * global, so two documents must never lay out at once (Documents card, Settings previews, `/templates`, `/d/<token>`).
 */
import { pdf, type DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { FALLBACK_TEMPLATE } from './catalog';
import { qrPng } from './render';
import { registerFonts, type PdfAssets } from './theme';
import { FAMILIES } from './variants/registry';
import type { DocKind, VariantFamily } from './variants/types';
import type { AdminInvoiceView, InvoiceView, VoucherView } from './view';

/** Wordmark + square mark + fonts. */
export type TemplateAssets = PdfAssets & { mark: string };

export type TemplateJob =
  | { kind: 'invoice'; view: InvoiceView }
  | { kind: 'admin'; view: AdminInvoiceView }
  | { kind: 'voucher'; view: VoucherView };

export function familyById(id: string): VariantFamily {
  return FAMILIES.find((f) => f.id === id) ?? FAMILIES.find((f) => f.id === FALLBACK_TEMPLATE) ?? FAMILIES[0];
}

let queue: Promise<unknown> = Promise.resolve();

/** Queues one render; resolves with the PDF Blob. */
export function renderTemplate(family: VariantFamily, job: TemplateJob, assets: TemplateAssets): Promise<Blob> {
  const run = queue.then(() => renderNow(family, job, assets));
  queue = run.catch(() => undefined);
  return run;
}

async function renderNow(family: VariantFamily, job: TemplateJob, assets: TemplateAssets): Promise<Blob> {
  registerFonts(assets.fonts);
  const base = { wordmark: assets.wordmark, mark: assets.mark };
  let doc: ReactElement<DocumentProps>;
  if (job.kind === 'voucher') {
    doc = <family.Voucher view={job.view} assets={base} /> as ReactElement<DocumentProps>;
  } else {
    const qr = job.view.payment?.qr ? await qrPng(job.view.payment.qr.uri) : undefined;
    doc = (job.kind === 'invoice' ? (
        <family.Invoice view={job.view} assets={{ ...base, qr }} />
      ) : (
        <family.AdminInvoice view={job.view} assets={{ ...base, qr }} />
      )) as ReactElement<DocumentProps>;
  }
  return pdf(doc).toBlob();
}

export type { DocKind };
