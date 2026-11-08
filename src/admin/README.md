# UDAN admin — module surface

Spec: `docs/specs/udan-admin.md`. Vocabulary: `GLOSSARY.md`. Nothing outside `src/admin/` imports from here.

| Module | Status | Import from |
|---|---|---|
| `model/` | done (A1) | `src/admin/model` |
| `data/` | done (A1) | `src/admin/data` |
| `auth/` | done (A2) | `src/admin/auth` |
| `ui/` (primitives + `admin.css`) | done (A2) | `src/admin/ui` |
| routes, `shell/`, `screens/` | A2: shell; B: Booking detail + New booking; C: Clients, DMCs, Enquiries, Settings; D: Dashboard Overview + Insights; E: Documents card | `routes.tsx` (lazy entry), `AdminApp.tsx` |
| `export/` | done (C) | `src/admin/export` |
| `pdf/` | done (E) | lazy only: `import('../../pdf')` (`view.ts` is pure and may be imported directly) |

## `model/` — pure TypeScript (no Firestore, no React)

Types (`types.ts`): `ISODate`, `ISOMonth`, `FY`, `INR`, `PayMode`/`PAY_MODES`, `BookingStatus`/`BOOKING_STATUSES` (lifecycle order),
`LineType`/`LINE_TYPES`, `ServiceLine`, `ClientPayment`, `DmcPayment`, `Client`, `Dmc`, `Booking`, `BookingEditableFields`,
`BookingDraft`, `Enquiry`, `EnquiryStatus`, `ManualEnquiryStatus`, `BusinessProfile`. Records carry `id` and
`createdAt`/`updatedAt` as JS `Date` (the data layer converts Timestamps).

- **Money** (`money.ts`): `bookingMoney(b) → { sellingPrice, netCost, commission, clientNetReceived, clientOutstanding, dmcs[{dmcId,cost,netPaid,outstanding}], dmcOutstanding, cancelled }`
  (Cancelled → Cancellation Charges; negative = refund owed / due back). Accepts unsaved form values (`MoneyInput`).
  `linesMissingConfirmation`, `lineDmcIds`, `formatINR` (`₹1,48,500`, `−₹X`), `isRupees`.
  `lineMoney(b) → LineMoney[]` (per-line received / paid / owed from tagged entries), `untagStalePayments(…)` (drops tags on deleted lines or changed DMCs; entries stay, untagged).
- **Category** (`category.ts`): `divisionOf(category)`, `isSingleService(category)`, `bookingDate(b)`, `bookingEndDate(b)`, `serviceDates(b)` (Month basis, entered dates only), `categoryForService(serviceId)`.
- **Counting rules** (`counting.ts`): `totals(bookings) → Totals` (Pending → `pending` pipeline only; Cancelled via charges,
  excluded from `bookings` count, feeds `cancellationRate`; negatives in `clientRefundsOwed` / `dmcDueBack`, never netted).
- **Flags** (`flags.ts`): `bookingFlags(b, today)` → `travelEnded`, `clientOverdue`, `dmcDue[]`, `dmcOverdue`, `dmcDueSoon`, `clientRefundOwed`, `dmcDueBack`.
- **Dates** (`dates.ts`, IST): `todayIST()`, `toISTDate(Date)`, `fyOf`, `fyRange`, `addFy`, `monthOf`, `addMonths`, `monthStart/End`,
  `monthsBetween`, `addDays`, `daysBetween`, `isoWeekday`, `formatDate` (`1 Nov 2026`), `formatMonth`, `isISODate`.
- **Numbering**: `formatBookingNo(seq)`, `parseBookingNo`, `formatInvoiceNo(fy, seq)`, `invoiceSeries(date)`.
- **Documents**: `invoiceFilename`, `voucherFilename`, `shareMessage`, `emailSubject`, `whatsappUrl`, `telUrl`, `mailtoUrl`.
- **Validation** (form guards; rules don't look inside arrays): `validateBookingFields`, `validateLine`, `validatePayment(p, allowedDmcIds?, lines?)`,
  `validateClient`, `validateDmc`, `hasErrors`.
- **Enquiry**: `serviceLabel`, `matchClientByMobile`, `enquiryConversion(enquiry, clients)` (Convert prefill), `ENQUIRY_FILTERS`,
  `matchesEnquiryFilter`, `enquiryCounts`.
- **Business profile**: `defaultBusinessProfile()` (seed), `normaliseBusinessProfile`, `isValidSignature`.
- **Dashboard** (`dashboard/`):
  - `buildBookingRows(bookings, clients, dmcs, today) → BookingRow[]` (Booking + Client + DMCs + money + flags) — the input to everything below.
  - Table: `TableQuery`, `defaultTableQuery`, `parseTableQuery(URLSearchParams, today)` / `tableQueryToParams`, `applyTableQuery`
    (= `filterBookingRows` + `sortBookingRows`), `matchesSearch`, `tableFooter` (counting rules), `activeFilterCount`, `clearFilters`, `ALL_TIME_PAGE_SIZE`.
  - Overview: `monthStats(rows, month)`, `needsAttention({ rows, enquiries, lastBackup, today }) → AttentionCategory[]`, `isBackupOverdue`.
  - Insights: `insightsPeriod(preset, today, custom?)`, `previousPeriod`, `kpis`, `delta`, `insights({ rows, enquiries, period, today }) → InsightsData`
    (byMonth, byStatus, commissionByDestination, netCostByDmc, sellingPriceByLineType, clientAgeing, dmcPayables, enquiryFunnel, topClients, topDmcs, destinations).
  - Directory strips: `clientSummary(rows, clientId)`, `dmcSummary(rows, dmcId)` (incl. `usedIn` for delete gating).
- `newId()` — `crypto.randomUUID()` for lines and payment entries.

## `data/` — Firestore access

Every function takes a `Firestore` first and rejects with `AdminDataError` (`code: 'permission-denied' | 'network' | 'conflict' | 'unknown'`).
`setPermissionDeniedHandler(fn)` registers the global handler (auth phase: sign out → login); it fires for calls and listeners.

- `createBooking(db, draft, { newClient?, enquiryId? }) → { id, bookingNo, bookingSeq, clientId }` — one transaction: counter, Client, Booking (Pending), Enquiry → converted.
- `allocateInvoiceNo(db, bookingId, { today? }) → { invoiceNo, invoiceSeq, invoiceDate, allocated }` — idempotent; per-FY counter.
- `saveBookingSection(db, bookingId, patch, { newClient? })` — `patch` key with `undefined` removes the field; `BOOKING_SECTIONS` lists keys per section
  (`clientBalanceDueBy` belongs to `price` only).
- `saveServiceSection(db, bookingId, { category, tripScope, lines })` — one transaction for the Service panel; also clears payment tags on deleted lines or lines whose DMC changed.
- `setStatus(db, id, status)` (not `'Cancelled'`; leaving Cancelled un-cancels), `cancelBooking(db, id, { reason, clientCancellationCharge?, lineCharges?, today? })`, `uncancelBooking(db, id, status?)`.
- Payments: `addClientPayment / updateClientPayment / deleteClientPayment`, `addDmcPayment / updateDmcPayment / deleteDmcPayment`
  (generic `addPayment / updatePayment / deletePayment(db, id, side, …)`). Each writes the whole list in a transaction; DMC entries must use a line DMC.
- `createClient / updateClient / deleteClient`, `createDmc / updateDmc / deleteDmc` (blank optional fields are removed; "in use" check is the UI's).
- `setEnquiryStatus(db, id, 'new'|'contacted'|'closed', { closeReason? })`, `saveEnquiryNotes`, `deleteEnquiry`.
- `getBusinessProfile(db, { seed = true })`, `saveBusinessProfile(db, profile)`.
- `readBackupCollections(db) → RawCollections` (getDocs of clients/dmcs/bookings/counters/inquiries + getDoc `settings/business`; raw data, Timestamps intact), `projectIdOf(db)`.
- `subscribeCollection(db, name, onChange)` — raw listener (`CollectionState<T> = { status, data, error? }`).
- React: `<AdminDataProvider db>`; hooks `useAdminData()` (states + `retry(name)` + `clientsById`/`dmcsById` + `db`), `useAdminDb`,
  `useClients`, `useDmcs`, `useBookings`, `useEnquiries`, `useBookingRows(today?)`, `useBookingByNo(bookingNo)`, `useNewEnquiryCount`.

## `auth/` — Google sign-in + `config/admins` allow-list (only importer of `firebase/auth`)

- `<AdminSessionProvider auth db signIn?>` (signIn defaults to `signInWithGoogle` popup, `prompt: select_account`).
- `useAdminSession() → { status: 'loading'|'signedOut'|'checking'|'admin'|'denied', user: { uid, email, displayName, photoURL } | null, message, signingIn, signIn(), signOut() }`.
  Not on the list → `deleteUser` (best effort) + `signOut` → `denied` + `DENIED_MESSAGE`.
- Registers the data layer's `setPermissionDeniedHandler`: re-reads `config/admins`; only if that is denied too (email removed) → sign out
  to login with `DENIED_MESSAGE`. A schema rejection while still listed keeps the session (the call's own error is shown).
- `getAdminAuth(app)` (connects the Auth emulator when `VITE_USE_EMULATOR=true`, host `VITE_AUTH_EMULATOR_HOST`), `safeNext(next)`, `loginPathFor(path)`.

## Routing

`src/App.tsx`: `{ path: '/admin/*', lazy: () => import('./admin/routes') }` (sibling of SiteLayout). `routes.tsx` builds Auth + Firestore
(or shows "not configured") and renders `<AdminApp auth db signIn?>`: `login` outside the guard; `shell/AdminLayout` (guard: spinner →
login?next= → `AdminDataProvider` + `ToastProvider` + `AdminShell`) wraps index (Overview), `insights` (React.lazy chunk), `bookings/new`,
`bookings/:bookingNo`, `clients`, `clients/:id`, `dmcs`, `dmcs/:id`, `enquiries`, `settings`, `*` (admin 404). Screens live in `screens/`.
`vite.config.ts` `bundleGuard` fails the build if the public entry's static chunk graph contains `src/admin/`, Firebase Auth, `@react-pdf`, `qrcode` or `recharts`,
and if the admin routes chunk (the one holding `src/admin/routes.tsx`) statically pulls `recharts` (only the lazy Insights screen may) or the PDF stack
(`@react-pdf`, `qrcode`, `src/admin/pdf/`: only the Documents card's `import('../../pdf')` on Prepare).

## `ui/` — primitives (import `admin.css` nowhere else; `routes.tsx` does)

- `Button({ variant: 'primary'|'outline'(default)|'ghost'|'danger', size: 'md'|'sm', block, icon, busy, ...button })`, `ButtonLink` (router Link, same styling),
  `IconButton({ label, variant: 'default'|'ghost' })`, `LinkButton`.
- `PageHeader({ title, titleExtra, subtitle, back: { to, label }, actions, children })`; `Tabs({ label, items: [{ to, label, end? }] })`;
  `Segmented({ label, options: [{ value, label }], value, onChange })`.
- `Panel({ title, level, actions, padded = true, id })` (section labelled by its title), `KeyValues({ items })`, `StatStrip({ items, columns, label })`.
- `Field({ label, hint, error, children: <input|select|textarea> })` wires id/aria-describedby/aria-invalid; `Checkbox({ label })`.
- `Dialog({ open, onClose, title, footer, onSubmit, wide })` (native centred `<dialog>`), `ConfirmDialog({ open, title, confirmLabel, danger, busy, onConfirm, onClose })`.
- States: `DataRegion({ status, error, onRetry, errorTitle, isEmpty, empty, loading })`, `LoadingState`, `EmptyState({ title, action })`,
  `ErrorState({ title, error, onRetry })`, `errorMessage(AdminDataError)`, `Spinner`, `FullScreenSpinner`.
- `StatStrip({ items, columns, label, className })` — `className="adm-stats--kpis"` (6 → 3 → 2 columns) needs `columns` unset.
- `ToastProvider` (in the shell) + `useToast()(message, { tone: 'info'|'danger' })`. `StatusBadge({ status })`, `Note({ tone })`.
- Inputs (forward id/aria from `Field`): `MoneyInput({ value, onChange })` (₹, en-IN grouping, whole rupees, empty = 0),
  `ChipInput({ values, onChange, placeholder })` (Enter/comma adds, chip click / Backspace removes).
- `useAdminTitle(page)` → `"<page> · UDAN admin"`; `useNoIndex()` (robots meta while mounted).
- CSS classes for later screens (ported from the prototypes): `adm-table`, `adm-grid-2/3`, `adm-stack`, `adm-actions`, `is-overdue`, `is-refund`.
  Derived tokens (`--adm-*`, `--color-danger/warn`) are in `src/styles/tokens.css`.

## Screens — Booking detail and New booking (phase B)

`screens/booking/` (Variant B, edit in place; `BookingDetailScreen` / `NewBookingScreen` pick the data-region state and render these):

- `BookingPage.tsx`: `BookingDetail({ booking })` (head + Status select, sections with Edit/Save/Cancel, payments, rail) and
  `NewBooking({ initial, conversion? })` (all sections open, payments hidden, rail = Money + Create booking → `/admin/bookings/<no>`
  with `state.created`). `BOOKINGS_BACK` = breadcrumb to the dashboard table, All time.
- `form.ts` (pure): `BookingForm` (editable fields + `clientMode` + `newClient`), `formFromBooking`, `blankForm({ start, conversion })`,
  `resetSection`, `sectionErrors(section, form, clients)` (incl. new-Client mobile uniqueness), `sectionPatch`, `liveMoneyInput`
  (saved Booking + open sections' unsaved values), `toCreateArgs`, `toE164` (Indian formats → `+91…`).
- `fields.tsx`: `ClientPicker` (combobox type-ahead on name/mobile), `ClientFields`, `TravelFields` (travel Categories only), `TravellersFields` (every Category, optional), `PriceFields`, `LinesFields`, `NotesFields`.
- `views.tsx`: read states + `paxText`, `dateRange`. `MoneyRail.tsx`: `MoneyPanel({ input })`. `StatusControl.tsx`: select + Cancel dialog.
  `PaymentsSection.tsx`: inline add / edit / delete for either side.
- `DocumentsCard.tsx` (rail, under Money; phase E): see "Documents" below.
- `screens/shared/DmcDialog.tsx`: `DmcDialog({ open, onClose, onCreated(dmcId) })` — "New DMC" dialog (reuse in the DMCs directory).
- Enquiry Convert = `/admin/bookings/new?enquiry=<id>` (`enquiryConversion` prefill, mobile match note; a converted Enquiry shows "View UDN-xxx").
  `?start=YYYY-MM-DD` prefills Travel start.

## `export/` — CSV, ledger, directory rows, Backup (pure except `download.ts`, `lastBackup.ts`)

- `toCsv(header, rows)` / `csvFrom(columns, items)` / `csvCell`: UTF-8 BOM, RFC 4180 quoting, CRLF after every record. Text cells starting
  `= + - @` tab CR get a `'` prefix (so mobiles read `'+91…`); **numbers are written raw** (negative Signed amounts stay numeric).
- Payments Ledger: `ledgerRows(bookings, clientsById, dmcsById, { from, to, side: 'both'|'client'|'dmc' })` (incl. Cancelled; date asc, then
  Booking ID), `signedAmount` (Client payment +, Client refund −, DMC payment −, DMC refund +), `ledgerCsv`, `ledgerFilename`,
  `ledgerPeriod(preset: 'thisFy'|'lastFy'|'thisMonth'|'custom', today, custom?)`.
- Directory: `clientCsvRows / dmcCsvRows(records, bookingRows)` (Bookings = counted, as in the lists) → `clientsCsv / dmcsCsv`, `clientsFilename / dmcsFilename`.
- **Bookings table CSV (for the dashboard phase)**: `bookingsCsv(rows: BookingRow[])` — pass the filtered + sorted rows; `BOOKING_COLUMNS`, `bookingsFilename(today)`.
- Backup: `serialiseBackup({ projectId, exportedAt, collections })` → `{ format: 'udan-admin-backup', version: 1, exportedAt, projectId, collections }`
  (all 6 collections, Timestamps/Dates → ISO anywhere), `backupJson` (pretty), `backupFilename(today)`, `BACKUP_COLLECTIONS`.
- `downloadText(filename, text, CSV_MIME|JSON_MIME)`.
- Last backup (localStorage `udan-admin:last-backup`, IST date): `readLastBackup()`, `recordBackup(date)`, `useLastBackup()` (live).
  **Overview phase: pass `useLastBackup()` as `needsAttention({ lastBackup })`.**

## Screens — Clients, DMCs, Enquiries, Settings (phase C)

- `screens/directory/shared.tsx`: `useSearchParam(key)` (URL state, replace), `SearchBox` (`?q=`), `matchesText`, `Outstanding` (negative →
  "Refund"/"Due back" in warn), `ContactButtons`, Client/DMC form fields + converters, `clientErrors` (mobile uniqueness), `useRetryRows`.
  `directory/ClientDialog.tsx` = New client. New DMC reuses `shared/DmcDialog`.
- Clients `/admin/clients` (`?q=`), Client page (strip via `clientSummary`, Bookings, Details inline Edit/Save, delete disabled "Used in N
  bookings"). New booking from a Client = `/admin/bookings/new?client=<id>` (`blankForm({ clientId })`).
- DMCs `/admin/dmcs` (`?q=`, `?owing=1`), DMC page (strip + Bookings via `dmcSummary`, head Edit opens the Details form, delete gated by `usedIn`).
- Enquiries `/admin/enquiries`: `?filter=open|new|contacted|converted|closed|all` (default open; Booking detail links `?filter=converted`),
  `?q=`, `?service=`, `?from=`/`?to=` (received date IST). Rows: Call, WhatsApp (greeting), Mark contacted (new), Close (dialog, optional
  reason) / Reopen, notes save on blur, Convert → `/admin/bookings/new?enquiry=<id>`, delete-as-spam (confirm); converted → "View UDN-xxx" only.
  Nav badge (`useNewEnquiryCount`) was already live.
- Settings: anchor nav; Account; `settings/BusinessProfileForm.tsx` (seeds on open, one Save with dirty state + Discard;
  `settings/signature.ts` resizes a PNG on a canvas until ≤ 100 KB); `settings/DataCard.tsx` (Backup + last-backup + overdue note, Payments
  ledger CSV with period/side and entry count, Clients/DMCs CSV).

## Screens — Dashboard Overview and Insights (phase D)

- `OverviewScreen.tsx` (`/admin`): `DashboardHeader` (tabs keep the query string) → `dashboard/MonthBar` (prev / month+year popover / next,
  "This month"; `?month=`) → month `StatStrip` (`monthStats`) → `dashboard/NeedsAttention` (`needsAttention({ …, lastBackup: useLastBackup() })`,
  `<details>` rows; Booking links + pre-filtered table links via `tableHref`; New Enquiries → `/admin/enquiries?filter=new`; Backup overdue →
  `/admin/settings#data`) → Bookings block with `Segmented` Calendar | Table (`?view=`, default Calendar, Table on phones). Each region uses `DataRegion`.
- `dashboard/hooks.ts`: `useTableQuery(today)` → `{ query, update(patch | fn) }` (URL via `parseTableQuery` / `tableQueryToParams`, replace;
  non-table params such as `view` are kept), `tableHref(patch, today)`, `useBookingsView()`, `useMediaQuery`, `PHONE_QUERY` (< 640px).
- `dashboard/Popover.tsx`: `<details>` popover (Escape / outside click close; `children(close)`). Used by the month picker, Filters, Columns, "+N more".
- `dashboard/BookingsCalendar.tsx`: `layoutMonth(rows, month)` (weeks, lanes, per-day lists) + grid (bars = Booking ID + Client, status colours,
  square ends at week edges, 3 lanes then "+N more" day popover, day click → `/admin/bookings/new?start=`), "Show cancelled" (local state),
  legend; phones get an agenda grouped by day (JS media query, so only one is in the DOM).
- `dashboard/BookingsTable.tsx`: debounced search (`?q=`), scope `Segmented`, Filters popover (`TableFilters.tsx`: `FilterFields`, `FilterChips`,
  `filterChips`), Columns menu (hidden columns in localStorage `udan-admin:table-hidden-columns`), CSV (`bookingsCsv` of all filtered + sorted
  rows), header sort buttons with `aria-sort`, footer = `tableFooter` (refunds owed shown separately), "Search all time" link, All time / date range
  → 50 rows + "Show more". Rows become cards below 640px (`adm-table--bookings`).
- `InsightsScreen.tsx` (lazy chunk; the only importer of `insights/`): period `Segmented` (`?period=thisMonth|lastMonth|lastFy|custom`, default
  This FY; custom `?pfrom=&pto=`), `insights()` data, KPI strip with deltas (% for amounts/counts, points for Commission % and Cancellation rate)
  + Pending pipeline line, eight charts, Top Clients / Top DMCs / Destinations panels.
- `insights/charts.tsx` (Recharts): `MonthlyChart`, `StatusChart`, `AmountChart({ kind: 'destination'|'dmc'|'lineType' })`, `AgeingChart`
  (one stacked bar), `PayablesChart` (stacked by DMC, top 4 + Other), `FunnelChart`; `compactINR` ticks. Colours are `var(--token)`; defaults
  kept for `accessibilityLayer` and `isAnimationActive`. `insights/ChartFigure.tsx`: `<figure>` labelled by its caption, plot group with an
  `aria-label`, "View as table" toggle (`aria-pressed`) → `<table>` with `<caption>`; `preferTable` charts start as tables on phones.

## `pdf/` + Documents card — Invoice and Voucher PDFs (phase E)

> Template variants, the Admin invoice and the open `/templates` gallery: see **`src/admin/pdf/TEMPLATES.md`**.

- `view.ts` (pure, no react-pdf): `invoiceView({ booking, client, profile }) → InvoiceView` and `voucherView({ booking, client, profile, today }) → VoucherView`
  decide every printed line, label, total and visibility (profile fields only if filled; `normaliseBusinessProfile`). Invoice: header lines, Billed to /
  From, one priced row ("Holiday package — …" / "Cancellation charge — …"), Included services (type, description, dates or "—"; never price/DMC),
  `servicesStruck` + struck `originalPrice` when Cancelled, totals (price, "Received <date> · <mode>" −, "Refunded …" +) → `result` Balance due (danger,
  "by <due>") / Paid in full (action) / Refund due to you (warn), `payment` only when balance > 0 and bank or UPI filled (`qr.uri` = `upiPayUri`, incl.
  `cu=INR`), terms, signature ("For <trading name>"), footer incl. "This is not a tax invoice.". Throws without `invoiceNo`. Voucher: never gets DMCs and
  copies only customer fields; `days` (dated lines grouped by start, sorted), `throughout` (undated), confirmation or pending "To be confirmed",
  emergency = profile emergency contacts else phones (empty → column hidden), itinerary lines, Good to know bullets, footer. Throws when Cancelled.
  Helpers: `displayMobile` (`+91 98111 11111`), `paxLine`, `dateRangeText`, `upiPayUri`.
- `InvoiceDocument.tsx` / `VoucherDocument.tsx`: react-pdf layouts of those views (ported from prototype Invoice A + C services / Voucher D + Timeline).
  `theme.ts`: palette, base styles, `registerFonts(FontFiles)` (Inter 400/600, Manrope 600/700 static TTFs in `fonts/`; hyphenation off), `PdfAssets`.
- `render.tsx`: `qrPng(uri)` (qrcode → PNG data URL, local), `renderInvoicePdf(view, assets)` / `renderVoucherPdf` → Blob. `assets.ts`: browser URLs
  (`?url` TTFs + wordmark PNG).
- `prepare.ts` (re-exported by `index.ts`, the lazy entry): `prepareInvoice(booking, { client, profile, assets? })` / `prepareVoucher(booking, { client,
  profile, today?, assets? })` → `File` (`invoiceFilename` / `voucherFilename`, `application/pdf`). The Invoice number must already be on the Booking.
- **Superseded by templates + live links (see `pdf/TEMPLATES.md`)**: rows Invoice / Voucher / Admin invoice with a template picker,
  `prepareDocument`, WhatsApp / Email open a dialog with the Settings message + live `/d/<token>` link (`shares`, ShareSync in `DocumentsProvider`).
  The original behaviour below still applies to Prepare / Preview / Download / Share (file).
- `screens/booking/DocumentsCard.tsx`: rows Invoice and Voucher. Prepare → (Invoice: `allocateInvoiceNo` in parallel with `getBusinessProfile`)
  → lazy `import('../../pdf')` → File + Blob URL (memory only; revoked on replace/unmount). Ready: filename + Share (only if
  `navigator.canShare({ files })`; `AbortError` silent, else toast "Sharing failed — use Download"), Preview (`<a target=_blank>`), Download
  (`<a download>`), WhatsApp (`whatsappUrl`, hidden without mobile), Email (`mailtoUrl` + `emailSubject`, only with email), "Prepare again".
  Message = `shareMessage` with the profile's trading name. Voucher row disabled "Booking cancelled" while Cancelled; idle Voucher notes how many
  lines print "To be confirmed". Failure → inline `role=alert` + Retry. No sent tracking.
- `sampleData.ts`: UDN-001 Kerala Booking, full profile, `cancelledSample` (tests + samples only).

## Tests

- Seam 1: `model/**/*.test.ts` (pure).
- Seam 2: `src/test/rules/admin.test.ts` (helpers in `src/test/adminAuth.ts`: `seedAdmins`, `googleDb`, `seed`).
- Seam 3: `data/data.test.ts`, `data/AdminDataProvider.test.tsx` (emulator, real rules).
- Seam 4: `export/export.test.ts` (toCsv, ledger signs/filters/sort, directory + bookings CSV, Backup serialiser); `data/data.test.ts` covers `readBackupCollections`.
- Seam 5: `screens/LoginScreen.test.tsx` (Auth + Firestore emulators, real rules; `signIn` = Google credential sign-in instead of the popup).
  `screens/BookingScreens.test.tsx` (same harness, signed in before render): New booking → detail, section Edit/Save/Cancel, lines + inline DMC,
  payments → Money rail, Cancel dialog preview/write/un-cancel, Voucher Received warning, Enquiry Convert (match / no match / already converted).
- `screens/DirectoryScreens.test.tsx`: Clients (list, search, New client uniqueness, edit, delete gating/delete, `?client=` prefill), DMCs (owing
  filter, detail, edit, delete), Enquiries (filter + counts, converted row, status changes, notes, delete, Convert link), Settings (profile
  save/discard, Backup download, ledger + Clients CSV), 4 data-region states. Screen tests call RTL `cleanup()` before `deleteApp` and use
  `clearFirestore(env)` (retrying) from `src/test/firestoreEmulator.ts`.
- `screens/DashboardScreens.test.tsx`: Overview month figures + Needs attention (incl. Backup overdue and its absence after a recent backup),
  calendar bars / day links / month bar, table search + filters + sort in the URL, footer totals, URL-loaded filters, CSV content, pre-filtered
  links, 4 data-region states; Insights smoke (lazy route, period in the URL, KPIs, View as table, Top Clients). Stubs `ResizeObserver` for Recharts.
- `pdf/view.test.ts` (pure): Invoice partial / paid / cancelled-refund / cancelled-due / empty / seeded profile, no DMC or line cost; Voucher
  timeline grouping, To be confirmed, empty profile, phone fallback, no DMC name / money / payment (JSON scan). `pdf/render.test.ts` renders real
  PDFs in Node (smoke); `PDF_SAMPLES=1 npx vitest run src/admin/pdf/render.test.ts` writes them to `.scratch/admin-bms/samples/`.
- `screens/DocumentsCard.test.tsx` (emulators; `vi.mock('../pdf')`): Invoice Prepare allocates + stores the number once (re-Prepare keeps it),
  file name, Preview/Download/WhatsApp/Email links, Share only with `canShare` (abort silent, failure toast), Voucher missing-confirmation note,
  Cancelled → Voucher disabled + Invoice still prepares, render failure → Retry.
- `auth/next.test.ts` (redirect safety); `src/App.test.tsx` (`/admin` lazy, no site chrome, noindex).

Run all with `npm test` (starts the Firestore + Auth emulators).
