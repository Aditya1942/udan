# Document templates — agent pointer

Start here before touching any Invoice / Admin invoice / Voucher template. Production docs are described in
`src/admin/README.md` (section "`pdf/` + Documents card"); this file covers the **template variants** and the
open **`/templates`** gallery.

Status: **live**. Every family is selectable in production:

- **Settings → Templates** (`/admin/settings/templates`, `screens/TemplatesSettingsScreen.tsx`): default family per document
  (Invoice / Admin invoice / Voucher) + WhatsApp / email message texts, saved in `settings/documents`. Preview = lazy
  `pdf/settingsPreview.tsx` (sample scenarios + the real Business profile). No default saved → `current` (`FALLBACK_TEMPLATE`).
- **Documents card** (`screens/booking/DocumentsCard.tsx`): rows Invoice, Voucher, Admin invoice; per-row template `<select>`
  (starts on the default, not saved on the Booking) → `prepareDocument(kind, booking, { family, … })`. Admin invoice:
  Preview / Download only, never shared.
- **Live links** `/d/<token>`: WhatsApp / Email on Invoice and Voucher create or refresh `shares/<token>` and open a prefilled,
  editable message (placeholders: `model/messages.ts`). See "Live links" below.

## Route

| Route | Auth | Entry | What |
|---|---|---|---|
| `/templates` | open (noindex) | `src/App.tsx` → lazy `src/admin/pdf/gallery/route.tsx` | Pick document × scenario × family; "Compare all" grid; Open / Download each PDF |
| `/admin/settings/templates` | admin | `AdminApp.tsx` → `screens/TemplatesSettingsScreen.tsx` | Defaults per document, preview, message texts |
| `/d/:token` | open (noindex, no-referrer) | `src/App.tsx` → lazy `src/admin/pdf/share/route.tsx` | Customer's live document: Download / Open + inline preview (if `navigator.pdfViewerEnabled`) |

URL state: `/templates?doc=invoice|admin|voucher&s=<scenario id>&v=<family id>&view=single|compare`.
Lazy chunk (pulls react-pdf), so `bundleGuard` in `vite.config.ts` stays happy. Sample data only — never real customer data.

## Map

```
src/admin/pdf/
├── view.ts                 ← ALL data decisions. invoiceView / adminInvoiceView / voucherView (pure, tested)
├── theme.ts                ← fonts (Inter 400/600, Manrope 600/700), colours, base styles, registerFonts
├── render.tsx              ← qrPng (UPI QR), legacy prepareInvoice/prepareVoucher render
├── renderTemplate.tsx      ← renderTemplate(family, {kind, view}, assets) → Blob; ONE serial queue app-wide; familyById
├── prepare.ts              ← prepareDocument(kind, booking, { family, client, profile, dmcs }) → File (Documents card)
├── catalog.ts              ← PURE: TEMPLATE_CATALOG (id/name/tagline), defaultTemplate, FALLBACK_TEMPLATE (catalog.test keeps it = registry)
├── share.ts                ← PURE: sharePayload (customer-safe view JSON), samePayload, messageVars (paymentLine, pendingLine)
├── settingsPreview.tsx     ← lazy Settings → Templates preview
├── share/route.tsx         ← /d/:token page (+ share.css)
├── InvoiceDocument.tsx     ← production invoice  (family `current`)
├── VoucherDocument.tsx     ← production voucher  (family `current`)
├── sampleData.ts           ← Kerala sample booking/profile used by tests + scenarios
├── variants/
│   ├── types.ts            ← contract: VariantFamily, VariantAssets, DocKind, DOC_KINDS
│   ├── registry.ts         ← FAMILIES[] (display order) — add new families here
│   ├── variants.test.ts    ← renders every family × doc × scenario (smoke + sample output)
│   └── <family>/           ← index.tsx (exports the family) + Invoice / AdminInvoice / Voucher (+ parts/styles)
└── gallery/
    ├── route.tsx           ← /templates page (Component)
    ├── gallery.css         ← page styles (site tokens only)
    ├── renderVariant.tsx   ← family × doc × scenario → Blob (serial queue); unavailableReason()
    └── scenarios.ts        ← buildScenarios(): the 6 data scenarios
```

## Families (`variants/<id>/`)

| id | Name | Idea | Files |
|---|---|---|---|
| `reference` | Your reference — Navy & indigo | Owner's own hotel voucher + invoice #402 rebuilt: navy letterhead box, label tables, NO/DESCRIPTION/QTY/TOTAL grid, bank table, GST note | `Invoice`, `AdminInvoice`, `Voucher`, `styles.ts` |
| `current` | Current — Minimal letter | Production templates wrapped + matching admin "Booking sheet" | `index.tsx` (wraps prod docs), `AdminInvoice` |
| `ledger` | Classic ledger | Ruled boxes, one framed page, amount in words, signatory box; B&W friendly | `Invoice`, `AdminInvoice`, `Voucher`, `styles.tsx` (shared parts) |
| `band` | Brand band | Full-bleed teal band, rounded cards, hero balance card, KPI tiles | `Invoice`, `AdminInvoice`, `Voucher`, `parts.tsx` |
| `ticket` | E-ticket | Boarding-pass stubs, big conf. codes (Courier), tear-off payment slip, ops manifest | `Invoice`, `AdminInvoice`, `Voucher`, `styles.tsx` |
| `mobile` | Phone-first | 360×720pt pages for WhatsApp, hero fact + stacked cards | `Invoice`, `AdminInvoice`, `Voucher`, `parts.tsx` |
| `premium` | Premium — Travel stationery | Serif titles (Times), gold hairlines, editorial voucher | `Invoice`, `AdminInvoice`, `Voucher`, `styles.ts`, `parts.tsx` |

## Documents and their view-models (`view.ts`)

| DocKind | Builder | View type | Audience / rule |
|---|---|---|---|
| `invoice` | `invoiceView({ booking, client, profile })` | `InvoiceView` | Customer. Never DMC, net cost, commission. Throws without `invoiceNo`. |
| `admin` | `adminInvoiceView({ booking, client, profile, dmcs, today })` | `AdminInvoiceView` | Internal only (`internalBanner`). Customer fields + `costLines`, `profit` (+ `*Tone`), `dmcs`, `ledger`, `internalNotes`, `cancelReason`. Works un-invoiced ("Not invoiced yet"). |
| `voucher` | `voucherView({ booking, client, profile, today })` | `VoucherView` | Customer. Never price, DMC or payment. Throws when Cancelled. |

Rich fields added for variants (all pre-formatted): invoice `letterhead`, `billedToDetails` (Pair[]), `trip`, `lineItems`,
`summary` (+ `inWords` via `inrInWords`), `bankRows`, `categoryLabel`, `status`; voucher `services` (flat, date-ordered),
`stays` (hotel check-in/out/nights), `guestRows`, `paxCounts`, `travellers`, `letterhead`, `signature`, `pendingCount`.
Helpers: `nightsBetween`, `inrInWords`, `Pair`, `Letterhead`.

## Scenarios (`gallery/scenarios.ts`) — every family must render all of them

| id | Stresses |
|---|---|
| `package-partial` | Kerala, 5 lines, 2 DMCs, balance due + UPI QR, one unconfirmed line |
| `hotel-stay` | Shape of owner's hotel voucher: 2 rooms, 4A+1C, 2 nights, paid in full |
| `visa-due` | Shape of owner's invoice #402: no travel dates, client address + PAN, bank table, GST note |
| `cancelled-refund` | Cancelled, refund due, DMC cancellation charges; **no voucher** (`unavailableReason`) |
| `flight-minimal` | Profile = name + phone only; client = name + mobile; no DMCs |
| `intl-large` | Long names, 6 travellers, 9 lines / 3 DMCs, refund entry → multi-page |

## Rules for template code

- Templates only lay out a view; never compute money, dates or visibility. Need a field → add it to `view.ts` (+ test), not the template.
- Each component returns a react-pdf `<Document>`. Print only filled fields; no placeholder text, no empty boxes.
- Money text must use Inter or Manrope: built-in Helvetica / Times / Courier lack `₹` (and `→`).
- Multi-page: `wrap={false}` per row/card; keep section title + header + first row together.
- Tones: danger `#b42318`, warn `#8a5300`, action `#4a7f19`. Pending confirmation = amber.

## Verify

```sh
npx tsc -b
PDF_SAMPLES=1 VARIANT=<id> npx vitest run --project node src/admin/pdf/variants/variants.test.ts   # → .scratch/doc-variants/<id>/<doc>--<scenario>.pdf
swift scripts/pdf2png.swift .scratch/doc-variants/<id>        # PNG per page → look at them with the Read tool
npx vite build                                                # bundleGuard
```
Omit `VARIANT` to render all families. Don't use `npm test` for this (it boots the Firestore emulator).

## Live links (`shares/{token}`)

- Doc = `{ kind: invoice|voucher, bookingId, family, active, issuedOn, v, title, filename, tradingName, phone, view, unavailable, createdAt, updatedAt }`.
  `view` = JSON of `invoiceView` / `voucherView` (never the Booking → no DMC, cost, commission, notes). `unavailable` = `''|cancelled|not-invoiced`.
- Token = 128 random bits (base64url). Rules: `get` public, `list` + writes Admin only, key allow-list, disabling is final.
- **ShareSync** (`data/DocumentsProvider.tsx`, mounted in `AdminLayout`): subscribes to active shares + `settings/business`; whenever a Booking,
  its Client or the profile changes, rewrites every stale active link (`samePayload` guard). Client-side, no Cloud Functions.
- Sending again updates the same token (template + issue date). "New link" = disable + new token. Voucher issue date = `issuedOn`.
- `SHARE_VERSION` (share.ts): bump when the stored view shape changes incompatibly; the page refuses newer versions.
- Pure modules `pdf/view.ts`, `pdf/share.ts`, `pdf/catalog.ts` are allowed in the admin routes chunk (`bundleGuard` exempts them).

## Known react-pdf 4.9 issues

- **Page numbers vanish** (`<Text fixed render>`) when `lineHeight` is set on the `Page` or an ancestor View, or when the fixed element is
  positioned with `bottom`. Set lineHeight on text, position from `top`. `theme.ts` `base.page` sets lineHeight → `current` has no page numbers.
- **Glyphs dropped across documents**: rendering many PDFs in one session can drop characters in later ones (seen: `7.3%` → `.3%`, mangled
  Inter SemiBold after `→`). Affects the gallery and possibly production (invoice then voucher). `Font.clear()` / `Font.reset()` break rendering;
  unsolved.

## Open gaps (view-model / data model)

No per-line price, tax, room type, meal plan, rooms count, check-in time fields. `payBy` is a sentence (`Pay by …`); no `payByDate`.
Voucher has no contact person and no per-service `detail` (visa type · country). Admin result label is customer wording ("Refund due to you").
Fixed: price label by Category (`totals.lines[0].label` / `summary.totalLabel`), `costLines[].dmcOwedTone`, cancelled footer wording.
Templates audited (Nov 2026): fake/hard-coded text removed (reference tagline, tax 0.00, QTY), cancelled labels, empty boxes.

## Next steps

1. Decide whether `/templates` stays public or moves behind admin auth (Settings → Templates now covers the owner's preview).
2. Deploy: `firebase deploy --only firestore:rules,hosting` (new `shares` + `settings/documents` rules, `/d/**` headers).
