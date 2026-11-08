/**
 * Template catalog: ids, names and taglines of every template family, without react-pdf (overview: TEMPLATES.md).
 * Pure — the admin routes chunk may import it statically (Settings → Templates, Documents card pickers); the
 * renderable families live in `variants/registry.ts` (lazy). `catalog.test.ts` keeps the two in sync.
 */

export type TemplateDocKind = 'invoice' | 'admin' | 'voucher';

export type TemplateMeta = { id: string; name: string; tagline: string };

/** Same order as `FAMILIES` in `variants/registry.ts`. */
export const TEMPLATE_CATALOG: readonly TemplateMeta[] = [
  {
    id: 'reference',
    name: 'Your reference — Navy & indigo',
    tagline: 'Your own hotel voucher and invoice #402, rebuilt: navy letterhead box, label tables, numbered item grid.',
  },
  { id: 'current', name: 'Current — Minimal letter', tagline: 'Quiet letter layout, day timeline voucher.' },
  {
    id: 'ledger',
    name: 'Classic ledger',
    tagline: 'The ruled-box bill CAs expect: one framed page, Sr/Particulars/Amount table, amount in words, signatory box.',
  },
  { id: 'band', name: 'Brand band', tagline: 'Full-bleed teal band, rounded cards and a big hero balance: the brand, loud and modern.' },
  {
    id: 'ticket',
    name: 'E-ticket',
    tagline: 'Boarding-pass stubs: perforated tickets with confirmation codes, a tear-off payment slip and an ops manifest.',
  },
  {
    id: 'mobile',
    name: 'Phone-first',
    tagline: 'Phone-screen pages for WhatsApp: the one fact that matters as a hero card, then stacked tap-sized cards.',
  },
  {
    id: 'premium',
    name: 'Premium — Travel stationery',
    tagline: 'Editorial luxury: centred mark, serif titles, gold hairlines and a day-by-day voucher for high-value trips.',
  },
];

/** What production rendered before templates were selectable. */
export const FALLBACK_TEMPLATE = 'current';

export function isTemplateId(id: unknown): id is string {
  return typeof id === 'string' && TEMPLATE_CATALOG.some((t) => t.id === id);
}

/** A known template id, else the fallback (unknown ids come from old data or a removed family). */
export function templateIdOr(id: unknown, fallback: string = FALLBACK_TEMPLATE): string {
  return isTemplateId(id) ? id : fallback;
}

export function templateName(id: string): string {
  return TEMPLATE_CATALOG.find((t) => t.id === id)?.name ?? id;
}

export const TEMPLATE_DOC_LABEL: Record<TemplateDocKind, string> = {
  invoice: 'Invoice',
  admin: 'Admin invoice',
  voucher: 'Voucher',
};

/** The template a document uses unless a different one is picked: Settings default, else the fallback. */
export function defaultTemplate(settings: { defaults: Partial<Record<TemplateDocKind, string>> }, kind: TemplateDocKind): string {
  return templateIdOr(settings.defaults[kind]);
}
