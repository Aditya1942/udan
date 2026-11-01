/**
 * Renders real PDFs in Node (smoke: the templates lay out every case without throwing).
 * `PDF_SAMPLES=1 npx vitest run src/admin/pdf/render.test.ts` also writes them to `.scratch/admin-bms/samples/` to eyeball.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { invoiceFilename, voucherFilename } from '../model';
import { prepareInvoice, prepareVoucher } from './prepare';
import { cancelledSample, FULL_PROFILE, SAMPLE_CLIENT, sampleBooking } from './sampleData';
import type { PdfAssets } from './theme';

const root = resolve(__dirname, '../../..');
const fonts = resolve(__dirname, 'fonts');
const ASSETS: PdfAssets = {
  fonts: {
    interRegular: `${fonts}/Inter-Regular.ttf`,
    interSemiBold: `${fonts}/Inter-SemiBold.ttf`,
    manropeSemiBold: `${fonts}/Manrope-SemiBold.ttf`,
    manropeBold: `${fonts}/Manrope-Bold.ttf`,
  },
  wordmark: resolve(root, 'src/assets/brand/udan-wordmark.png'),
};
// Stand-in signature: any small PNG data URL.
const SIGNATURE = `data:image/png;base64,${readFileSync(resolve(root, 'src/assets/brand/udan-mark.png')).toString('base64')}`;
const PROFILE = { ...FULL_PROFILE, signature: SIGNATURE };
const OUT = process.env.PDF_SAMPLES ? resolve(root, '.scratch/admin-bms/samples') : undefined;

async function check(file: File, name: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  expect(file.type).toBe('application/pdf');
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(5_000);
  if (OUT) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(resolve(OUT, name), bytes);
  }
}

describe('PDF rendering (Node)', { timeout: 60_000 }, () => {
  it('Invoice: partial payment with UPI QR and signature', async () => {
    const file = await prepareInvoice(sampleBooking(), { client: SAMPLE_CLIENT, profile: PROFILE, assets: ASSETS });
    expect(file.name).toBe(invoiceFilename('UDAN/2026-27/001'));
    await check(file, file.name);
  });

  it('Invoice: cancelled with a refund due, empty profile', async () => {
    const file = await prepareInvoice(cancelledSample(), { client: SAMPLE_CLIENT, profile: {}, assets: ASSETS });
    await check(file, 'UDAN-Invoice-cancelled-refund.pdf');
  });

  it('Voucher: timeline, Throughout your trip, To be confirmed', async () => {
    const file = await prepareVoucher(sampleBooking(), { client: SAMPLE_CLIENT, profile: PROFILE, today: '2026-11-20', assets: ASSETS });
    expect(file.name).toBe(voucherFilename('UDN-001'));
    await check(file, file.name);
  });
});
