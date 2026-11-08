/**
 * Renders every template family × document × scenario in Node (smoke: nothing throws, output is a PDF).
 * Eyeball them (see src/admin/pdf/TEMPLATES.md): `PDF_SAMPLES=1 VARIANT=<id> npx vitest run --project node src/admin/pdf/variants/variants.test.ts`
 * writes `.scratch/doc-variants/<family>/<kind>--<scenario>.pdf` (VARIANT optional: limits to one family).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildScenarios } from '../gallery/scenarios';
import { renderVariant, unavailableReason, type GalleryAssets } from '../gallery/renderVariant';
import { FAMILIES } from './registry';
import { DOC_KINDS } from './types';

const root = resolve(__dirname, '../../../..');
const fonts = resolve(__dirname, '../fonts');
const ASSETS: GalleryAssets = {
  fonts: {
    interRegular: `${fonts}/Inter-Regular.ttf`,
    interSemiBold: `${fonts}/Inter-SemiBold.ttf`,
    manropeSemiBold: `${fonts}/Manrope-SemiBold.ttf`,
    manropeBold: `${fonts}/Manrope-Bold.ttf`,
  },
  wordmark: resolve(root, 'src/assets/brand/udan-wordmark.png'),
  mark: resolve(root, 'src/assets/brand/udan-mark.png'),
};
const SIGNATURE = `data:image/png;base64,${readFileSync(resolve(root, 'src/assets/brand/udan-mark.png')).toString('base64')}`;
const SCENARIOS = buildScenarios({ signature: SIGNATURE });
const OUT = process.env.PDF_SAMPLES ? resolve(root, '.scratch/doc-variants') : undefined;
const only = process.env.VARIANT;

describe.each(FAMILIES.filter((f) => !only || f.id === only).map((f) => [f.id, f] as const))('family %s', (_id, family) => {
  for (const kind of DOC_KINDS) {
    for (const s of SCENARIOS) {
      if (unavailableReason(kind.id, s)) continue;
      it(`${kind.id} — ${s.id}`, { timeout: 60_000 }, async () => {
        const blob = await renderVariant(family, kind.id, s, ASSETS);
        const bytes = Buffer.from(await blob.arrayBuffer());
        expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
        if (OUT) {
          mkdirSync(resolve(OUT, family.id), { recursive: true });
          writeFileSync(resolve(OUT, family.id, `${kind.id}--${s.id}.pdf`), bytes);
        }
      });
    }
  }
});
