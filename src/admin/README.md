# UDAN admin — module surface

Spec: `docs/specs/udan-admin.md`. Vocabulary: `GLOSSARY.md`. Nothing outside `src/admin/` imports from here.

| Module | Status | Import from |
|---|---|---|
| `model/` | done (A1) | `src/admin/model` |
| `data/` | done (A1) | `src/admin/data` |
| `auth/` | done (A2) | `src/admin/auth` |
| `ui/` (primitives + `admin.css`) | done (A2) | `src/admin/ui` |
| routes, `shell/`, `screens/` | A2: shell + placeholders; B: Booking detail + New booking; C: Clients, DMCs, Enquiries, Settings | `routes.tsx` (lazy entry), `AdminApp.tsx` |
| `export/` | done (C) | `src/admin/export` |
| `pdf/` | later phase | — |

## `model/` — pure TypeScript (no Firestore, no React)

Types (`types.ts`): `ISODate`, `ISOMonth`, `FY`, `INR`, `PayMode`/`PAY_MODES`, `BookingStatus`/`BOOKING_STATUSES` (lifecycle order),
`LineType`/`LINE_TYPES`, `ServiceLine`, `ClientPayment`, `DmcPayment`, `Client`, `Dmc`, `Booking`, `BookingEditableFields`,
`BookingDraft`, `Enquiry`, `EnquiryStatus`, `ManualEnquiryStatus`, `BusinessProfile`. Records carry `id` and
`createdAt`/`updatedAt` as JS `Date` (the data layer converts Timestamps).

- **Money** (`money.ts`): `bookingMoney(b) → { sellingPrice, netCost, commission, clientNetReceived, clientOutstanding, dmcs[{dmcId,cost,netPaid,outstanding}], dmcOutstanding, cancelled }`
  (Cancelled → Cancellation Charges; negative = refund owed / due back). Accepts unsaved form values (`MoneyInput`).
  `linesMissingConfirmation`, `lineDmcIds`, `formatINR` (`₹1,48,500`, `−₹X`), `isRupees`.
- **Counting rules** (`counting.ts`): `totals(bookings) → Totals` (Pending → `pending` pipeline only; Cancelled via charges,
  excluded from `bookings` count, feeds `cancellationRate`; negatives in `clientRefundsOwed` / `dmcDueBack`, never netted).
- **Flags** (`flags.ts`): `bookingFlags(b, today)` → `travelEnded`, `clientOverdue`, `dmcDue[]`, `dmcOverdue`, `dmcDueSoon`, `clientRefundOwed`, `dmcDueBack`.
- **Dates** (`dates.ts`, IST): `todayIST()`, `toISTDate(Date)`, `fyOf`, `fyRange`, `addFy`, `monthOf`, `addMonths`, `monthStart/End`,
  `monthsBetween`, `addDays`, `daysBetween`, `isoWeekday`, `formatDate` (`1 Nov 2026`), `formatMonth`, `isISODate`.
- **Numbering**: `formatBookingNo(seq)`, `parseBookingNo`, `formatInvoiceNo(fy, seq)`, `invoiceSeries(date)`.
- **Documents**: `invoiceFilename`, `voucherFilename`, `shareMessage`, `emailSubject`, `whatsappUrl`, `telUrl`, `mailtoUrl`.
- **Validation** (form guards; rules don't look inside arrays): `validateBookingFields`, `validateLine`, `validatePayment(p, allowedDmcIds?)`,
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
`bookings/:bookingNo`, `clients`, `clients/:id`, `dmcs`, `dmcs/:id`, `enquiries`, `settings`, `*` (admin 404). Screens live in `screens/`
(placeholders: Overview, Insights). Replace a placeholder file's body; keep its export name.
`vite.config.ts` `bundleGuard` fails the build if the public entry's static chunk graph contains `src/admin/`, Firebase Auth, `@react-pdf` or `recharts`.

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
- `fields.tsx`: `ClientPicker` (combobox type-ahead on name/mobile), `ClientFields`, `TravelFields`, `PriceFields`, `LinesFields`, `NotesFields`.
- `views.tsx`: read states + `paxText`, `dateRange`. `MoneyRail.tsx`: `MoneyPanel({ input })`. `StatusControl.tsx`: select + Cancel dialog.
  `PaymentsSection.tsx`: inline add / edit / delete for either side.
- **`DocumentsSlot.tsx` — placeholder for the Documents card.** The Documents phase replaces its body (it already gets `booking` + `client`
  and sits in the rail under Money).
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
- `auth/next.test.ts` (redirect safety); `src/App.test.tsx` (`/admin` lazy, no site chrome, noindex).

Run all with `npm test` (starts the Firestore + Auth emulators).
