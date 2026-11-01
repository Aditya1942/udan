# UDAN admin — module surface

Spec: `docs/specs/udan-admin.md`. Vocabulary: `GLOSSARY.md`. Nothing outside `src/admin/` imports from here.

| Module | Status | Import from |
|---|---|---|
| `model/` | done (A1) | `src/admin/model` |
| `data/` | done (A1) | `src/admin/data` |
| `auth/` | done (A2) | `src/admin/auth` |
| `ui/` (primitives + `admin.css`) | done (A2) | `src/admin/ui` |
| routes, `shell/`, `screens/` | A2: shell + placeholder screens | `routes.tsx` (lazy entry), `AdminApp.tsx` |
| `pdf/`, `export/` | later phases | — |

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
- `saveBookingSection(db, bookingId, patch, { newClient? })` — `patch` key with `undefined` removes the field; `BOOKING_SECTIONS` lists keys per section.
- `setStatus(db, id, status)` (not `'Cancelled'`; leaving Cancelled un-cancels), `cancelBooking(db, id, { reason, clientCancellationCharge?, lineCharges?, today? })`, `uncancelBooking(db, id, status?)`.
- Payments: `addClientPayment / updateClientPayment / deleteClientPayment`, `addDmcPayment / updateDmcPayment / deleteDmcPayment`
  (generic `addPayment / updatePayment / deletePayment(db, id, side, …)`). Each writes the whole list in a transaction; DMC entries must use a line DMC.
- `createClient / updateClient / deleteClient`, `createDmc / updateDmc / deleteDmc` (blank optional fields are removed; "in use" check is the UI's).
- `setEnquiryStatus(db, id, 'new'|'contacted'|'closed', { closeReason? })`, `saveEnquiryNotes`, `deleteEnquiry`.
- `getBusinessProfile(db, { seed = true })`, `saveBusinessProfile(db, profile)`.
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
(placeholders except Login and Settings → Account). Replace a placeholder file's body; keep its export name.
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
- `useAdminTitle(page)` → `"<page> · UDAN admin"`; `useNoIndex()` (robots meta while mounted).
- CSS classes for later screens (ported from the prototypes): `adm-table`, `adm-grid-2/3`, `adm-stack`, `adm-actions`, `is-overdue`, `is-refund`.
  Derived tokens (`--adm-*`, `--color-danger/warn`) are in `src/styles/tokens.css`.

## Tests

- Seam 1: `model/**/*.test.ts` (pure).
- Seam 2: `src/test/rules/admin.test.ts` (helpers in `src/test/adminAuth.ts`: `seedAdmins`, `googleDb`, `seed`).
- Seam 3: `data/data.test.ts`, `data/AdminDataProvider.test.tsx` (emulator, real rules).
- Seam 5: `screens/LoginScreen.test.tsx` (Auth + Firestore emulators, real rules; `signIn` = Google credential sign-in instead of the popup).
- `auth/next.test.ts` (redirect safety); `src/App.test.tsx` (`/admin` lazy, no site chrome, noindex).

Run all with `npm test` (starts the Firestore + Auth emulators).
