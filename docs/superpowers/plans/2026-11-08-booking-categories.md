# Booking Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Booking Category (Visa, Passport, Package, Hotel, Flight, Train, Bus) to the admin booking flow: one-service Bookings that turn into a Package when a service is added, optional Travel, optional DMC per Service Line, Visa Type/Country, Trip Scope, and payments tagged to a Service Line.

**Architecture:** Every Booking keeps its services in `lines`. A non-Package Booking has exactly one line, which the form shows inline (ADR 0001), so money, payments, cancellation and PDFs keep one code path. New pure helpers go in `src/admin/model/category.ts`. They work out the Booking date and end date (fallback chain) and every month view, flag and calendar uses them. The data layer gets one transactional save for the Service section. That save clears payment tags that point at a deleted line, or at a line whose DMC changed.

**Tech Stack:** React 19, TypeScript, Vite, Firebase (Firestore + rules), Vitest + Testing Library, Firebase emulators.

**Spec:** `docs/specs/udan-admin.md` (updated 2026-11-08), `GLOSSARY.md`, `docs/adr/0001-single-service-booking-holds-one-service-line.md`.

## Global Constraints

- Category list, in this order: `Visa, Passport, Package, Hotel, Flight, Train, Bus`.
- Line types, in this order: `Hotel, Transfer, Flight, Train, Bus, Sightseeing, Visa, Passport, Package, Other`.
- Division: `Visa`/`Passport` → `Immigration`; every other Category → `Travel`. Never stored.
- Trip Scope `Domestic | International`: Package only, required when a Package is saved.
- Visa Type `Visitor | Business`. Visa lines need Visa Type and Country.
- DMC is optional on every line. UI label for "no DMC" is **In-house**.
- Booking date = `travelStart`, else earliest line `start`, else IST date of `createdAt`. End date = `travelEnd`, else latest line `end`, else none.
- Model keeps `travelStart` / `travelEnd` as strings, with `''` meaning "not entered". Firestore never stores `''` for them; the key is left out.
- Legacy docs (no `category`) read as `category: 'Package'`, `hasTravel: true`, no `tripScope`.
- UI uses "Customer" (code still says `client`). Copy style follows the existing error strings: sentence case, ends with a period.
- Run pure tests: `npx vitest run <path>`. Run emulator tests: `node scripts/with-java.mjs firebase emulators:exec --only firestore,auth --project demo-udan "vitest run <path>"` (written `EMU "<path>"` below). Full suite: `npm test`. Types: `npm run typecheck`.

## Review Focus

1. **A legacy Booking opened and edited**: it shows as Package with Travel. Saving the Service section asks for Trip Scope. Other sections save without touching `category`. (Task 4 data test, Task 6 screen test.)
2. **A Booking with no dates anywhere**: it appears in the month of `createdAt` in the table and calendar (a 1-day bar). No sort or `localeCompare` crashes on `''`. (Task 3 test.)
3. **A Package with 2+ lines switched to a single Category**: the option is disabled and `setCategory` leaves the form unchanged. (Task 5 test.)
4. **A line deleted while a payment is tagged to it**: the tag is cleared in the same transaction as the line save. The payment amount still counts. (Task 4 test.)
5. **An in-house line**:
   - never appears in DMC pickers, DMC filters, DMC money or Insights by DMC
   - never shows "Unknown DMC"
   - DMC "Add entry" stays disabled when every line is in-house
   (Task 2 and Task 3 tests; Task 7 screen assertion.)

---

### Task 1: Model types and Category helpers

**Files:**
- Modify: `src/admin/model/types.ts`
- Create: `src/admin/model/category.ts`, `src/admin/model/category.test.ts`
- Modify: `src/admin/model/index.ts` (re-export), `src/admin/model/testFixtures.ts`

**Interfaces:**
- Produces (types.ts):
  - `BOOKING_CATEGORIES`, `type BookingCategory`; `DIVISIONS`, `type Division`; `TRIP_SCOPES`, `type TripScope`; `VISA_TYPES`, `type VisaType` (all `as const` arrays, same style as `LINE_TYPES`).
  - `LINE_TYPES` gets the new order.
  - `ServiceLine`: `dmcId?: string; visaType?: VisaType; visaCountry?: string`.
  - `ClientPayment`: `lineId?: string` (so `DmcPayment` gets it too).
  - `BookingEditableFields` adds `category: BookingCategory; tripScope?: TripScope; hasTravel: boolean`. JSDoc on `travelStart`/`travelEnd`: `'' = not entered`.
- Produces (category.ts):
  - `divisionOf(c: BookingCategory): Division`
  - `isSingleService(c: BookingCategory): boolean` (true unless `'Package'`)
  - `bookingDate(b: Pick<Booking, 'travelStart' | 'lines' | 'createdAt'>): ISODate | undefined` (undefined only when there is no `createdAt`)
  - `bookingEndDate(b: Pick<Booking, 'travelEnd' | 'lines'>): ISODate | undefined`
  - `categoryForService(serviceId: string): BookingCategory | undefined`
- Fixtures: `booking()` defaults to `category: 'Package', hasTravel: true`.

- [ ] **Step 1: Write failing tests** in `category.test.ts`:

```ts
it('derives Division', () => {
  expect(divisionOf('Visa')).toBe('Immigration');
  expect(divisionOf('Passport')).toBe('Immigration');
  for (const c of ['Package', 'Hotel', 'Flight', 'Train', 'Bus'] as const) expect(divisionOf(c)).toBe('Travel');
});
it('Booking date falls back travelStart → earliest line start → createdAt (IST)', () => {
  expect(bookingDate(booking({ travelStart: '2026-12-01' }))).toBe('2026-12-01');
  expect(bookingDate(booking({ travelStart: '', lines: [line({ start: '2026-12-09' }), line({ start: '2026-12-03' }), line()] }))).toBe('2026-12-03');
  expect(bookingDate(booking({ travelStart: '', lines: [line()], createdAt: new Date('2026-10-31T20:00:00Z') }))).toBe('2026-11-01');
});
it('end date falls back travelEnd → latest line end → none', () => {
  expect(bookingEndDate(booking({ travelEnd: '2026-12-05' }))).toBe('2026-12-05');
  expect(bookingEndDate(booking({ travelEnd: '', lines: [line({ end: '2026-12-04' }), line({ end: '2026-12-08' })] }))).toBe('2026-12-08');
  expect(bookingEndDate(booking({ travelEnd: '', lines: [line()] }))).toBeUndefined();
});
it('maps enquiry services to Categories', () => {
  expect(categoryForService('international-domestic-tours')).toBe('Package');
  expect(categoryForService('hotel-booking')).toBe('Hotel');
  expect(categoryForService('flight-train-tickets')).toBe('Flight');
  expect(categoryForService('visa-services')).toBe('Visa');
  expect(categoryForService('visitor-business-visa')).toBe('Visa');
  expect(categoryForService('passport-services')).toBe('Passport');
  expect(categoryForService('currency-exchange')).toBeUndefined();
});
```

- [ ] **Step 2: Run** `npx vitest run src/admin/model/category.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the types and `category.ts` (use `toISTDate` from `dates.ts`). Update the fixtures and re-export from `index.ts`.
- [ ] **Step 4: Run** the test file. Expected: PASS. Run `npm run typecheck`. Expected: errors only where `dmcId` is now optional, or where the new required fields are missing (fixtures, sample data, `blankForm`, `bookingFromDoc`, `toCreateArgs`). Fix the fixture and `src/admin/pdf/sampleData.ts` now; later tasks fix the rest.
- [ ] **Step 5: Commit** `feat(model): Booking Category, Division, Trip Scope, Visa Type types and date helpers`.

---

### Task 2: Validation, money and flags

**Files:**
- Modify: `src/admin/model/validate.ts`, `src/admin/model/money.ts`, `src/admin/model/flags.ts`
- Test: `src/admin/model/rules.test.ts` (validation, flags), `src/admin/model/money.test.ts`

**Interfaces:**
- Consumes: Task 1 types and helpers.
- Produces:
  - `validateBookingFields(b, opts)`: unchanged signature, new rules below.
  - `validateLine(l)`: DMC no longer required; Visa rules.
  - `validatePayment(p, allowedDmcIds?, lines?: readonly ServiceLine[])`: new third param.
  - `type LineMoney = { lineId: string; dmcId?: string; cost: INR; clientReceived: INR; dmcPaid: INR; dmcOwed?: INR }` (`dmcOwed` undefined for in-house lines), and `lineMoney(b: MoneyInput): LineMoney[]` in line order.
  - `untagStalePayments(prev: Pick<Booking, 'clientPayments' | 'dmcPayments'>, nextLines: readonly ServiceLine[]): { clientPayments: ClientPayment[]; dmcPayments: DmcPayment[]; untagged: { client: number; dmc: number } }`
  - `lineDmcIds` skips lines with no DMC.
  - `travelEndedNotCompleted(b: Pick<Booking, 'status' | 'travelEnd' | 'lines'>, today)`

**Validation rules (exact copy):**
- `category` missing or not in `BOOKING_CATEGORIES` → `category: 'Choose a category.'`
- Package with no `tripScope` → `tripScope: 'Choose Domestic or International.'`
- Package with 0 lines → `lines: 'Add at least one service.'`
- Non-Package with `lines.length !== 1` → `lines: 'Add the service details.'`
- Destination and date checks run only when `hasTravel` is true (same messages as today).
- Immigration Booking:
  - no traveller names → `travellerNames: 'Add at least one traveller name.'`
  - pax total 0 → `pax: 'Add at least one traveller.'`
- Visa line:
  - bad `visaType` → `visaType: 'Choose a visa type.'`
  - blank `visaCountry` → `visaCountry: 'Enter the country.'`
- Payment `lineId` not among `lines` → `lineId: 'Choose a service on this booking.'`
- DMC Payment whose tagged line has a different `dmcId` → `lineId: 'Choose a service from this DMC.'`

- [ ] **Step 1: Write failing tests.** Replace the first `validation` test in `rules.test.ts` with:

```ts
const base = { category: 'Hotel', hasTravel: false, sellingPrice: 0, pax: { adults: 1, children: 0, infants: 0 }, travellerNames: [], lines: [line()] } as const;
it('requires a Category; skips Travel checks when Travel is not added', () => {
  expect(validateBookingFields({ ...base, category: undefined }, { requireClient: false })).toHaveProperty('category');
  expect(validateBookingFields({ ...base, destination: '', travelStart: '' }, { requireClient: false })).toEqual({});
  expect(Object.keys(validateBookingFields({ ...base, hasTravel: true, destination: ' ', travelStart: '2026-11-10', travelEnd: '2026-11-09' }, { requireClient: false })).sort()).toEqual(['destination', 'travelEnd']);
});
it('Package needs Trip Scope and ≥1 line; single Categories exactly 1 line', () => {
  expect(validateBookingFields({ ...base, category: 'Package', lines: [] }, { requireClient: false })).toEqual({ tripScope: 'Choose Domestic or International.', lines: 'Add at least one service.' });
  expect(validateBookingFields({ ...base, lines: [line(), line()] }, { requireClient: false })).toHaveProperty('lines');
});
it('Immigration needs travellers', () => {
  const e = validateBookingFields({ ...base, category: 'Passport', pax: { adults: 0, children: 0, infants: 0 }, lines: [line({ type: 'Passport' })] }, { requireClient: false });
  expect(e).toMatchObject({ travellerNames: 'Add at least one traveller name.', pax: 'Add at least one traveller.' });
});
it('DMC optional on lines; Visa lines need type and country', () => {
  expect(validateLine(line({ dmcId: undefined }))).toEqual({});
  expect(validateLine(line({ type: 'Visa' }))).toEqual({ visaType: 'Choose a visa type.', visaCountry: 'Enter the country.' });
});
it('a tagged payment must point at a line on the Booking (DMC: of that DMC)', () => {
  const lines = [line({ id: 'la', dmcId: 'd1' }), line({ id: 'lb', dmcId: undefined })];
  const p = { date: '2026-11-01', kind: 'Payment', mode: 'UPI', amount: 5 } as const;
  expect(validatePayment({ ...p, lineId: 'zz' }, undefined, lines)).toHaveProperty('lineId');
  expect(validatePayment({ ...p, lineId: 'lb' }, undefined, lines)).toEqual({});
  expect(validatePayment({ ...p, dmcId: 'd1', lineId: 'lb' }, ['d1'], lines)).toEqual({ lineId: 'Choose a service from this DMC.' });
});
```

In `rules.test.ts` `flags`, add a test: `travelEnded` uses the latest line end when `travelEnd` is `''`, and is false with no dates at all. In `money.test.ts`, add:

```ts
it('in-house lines count in Net Cost but in no DMC', () => {
  const m = bookingMoney(booking({ sellingPrice: 10_000, lines: [line({ dmcId: undefined, netCost: 2_000 }), line({ dmcId: 'd1', netCost: 5_000 })] }));
  expect(m.netCost).toBe(7_000);
  expect(m.dmcs.map((d) => d.dmcId)).toEqual(['d1']);
  expect(lineDmcIds(booking({ lines: [line({ dmcId: undefined })] }))).toEqual([]);
});
it('lineMoney: per-line received, paid and owed from tagged entries', () => {
  const b = booking({
    lines: [line({ id: 'la', dmcId: 'd1', netCost: 8_000 }), line({ id: 'lb', dmcId: undefined, netCost: 1_000 })],
    clientPayments: [pay(3_000, { lineId: 'la' }), pay(500)],
    dmcPayments: [dmcPay('d1', 5_000, { lineId: 'la' }), dmcPay('d1', 1_000)],
  });
  expect(lineMoney(b)).toEqual([
    { lineId: 'la', dmcId: 'd1', cost: 8_000, clientReceived: 3_000, dmcPaid: 5_000, dmcOwed: 3_000 },
    { lineId: 'lb', dmcId: undefined, cost: 1_000, clientReceived: 0, dmcPaid: 0, dmcOwed: undefined },
  ]);
});
it('untagStalePayments clears tags for deleted lines and for DMC changes', () => {
  const prev = { clientPayments: [pay(1, { lineId: 'gone' }), pay(2, { lineId: 'la' })], dmcPayments: [dmcPay('d1', 3, { lineId: 'la' })] };
  const r = untagStalePayments(prev, [line({ id: 'la', dmcId: 'd2' })]);
  expect(r.clientPayments.map((p) => p.lineId)).toEqual([undefined, 'la']);
  expect(r.dmcPayments[0].lineId).toBeUndefined();
  expect(r.untagged).toEqual({ client: 1, dmc: 1 });
});
```

- [ ] **Step 2: Run** `npx vitest run src/admin/model`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the rules above. `bookingMoney` skips the per-DMC bucket for lines with no `dmcId`. In `dmcPaymentsDue`, skip in-house lines. `lineMoney` uses `lineCost(line, cancelled)` for `cost`, so a Cancelled Booking shows charges.
- [ ] **Step 4: Run** `npx vitest run src/admin/model`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(model): category-aware validation, in-house lines, per-line money, payment tags`.

---

### Task 3: Dashboard model: Booking date basis, Category/Division filters

**Files:**
- Modify: `src/admin/model/dashboard/{overview,table,insights,directory,rows}.ts`, `src/admin/export/bookings.ts`
- Test: `src/admin/model/dashboard/dashboard.test.ts`

**Interfaces:**
- Consumes: `bookingDate`, `bookingEndDate`, `divisionOf` (Task 1); `lineDmcIds` (Task 2).
- Produces:
  - `TableQuery` gains `categories: BookingCategory[]` (URL `cat=`, comma list) and `division?: Division` (URL `div=`, `travel | immigration`).
  - Both count in `activeFilterCount` and are cleared by `clearFilters`.
  - The URL sort key stays `travelStart`, but it compares `bookingDate`.
  - The `travelStart` / `travelEnd` date-range fields filter on `bookingDate` / `bookingEndDate`.
  - Month scope uses `monthOf(bookingDate(b))`, and so do overview stats and every Insights month bucket and range.
  - `BookingRow.dmcs` skips in-house lines.
  - The directory and Insights DMC tallies ignore lines with no `dmcId`.
  - Bookings CSV gains a `Category` column after `Booking ID`.

- [ ] **Step 1: Write failing tests** in `dashboard.test.ts` → `table` describe:

```ts
it('month scope and sort use the Booking date fallback; undated Bookings land in the createdAt month', () => {
  const undated = booking({ travelStart: '', travelEnd: '', lines: [line()], createdAt: new Date('2026-11-03T06:00:00Z') });
  const lineDated = booking({ travelStart: '', travelEnd: '', lines: [line({ start: '2026-11-01' })] });
  const rows = buildBookingRows([undated, lineDated], clients, dmcs, '2026-11-08');
  const q = { ...defaultTableQuery('2026-11-08') };
  expect(applyTableQuery(rows, q).map((r) => r.booking.id)).toEqual([lineDated.id, undated.id]);
});
it('filters by Category and Division and round-trips the URL', () => {
  const rows = buildBookingRows([booking({ category: 'Visa' }), booking({ category: 'Hotel' })], clients, dmcs, '2026-11-08');
  const q = { ...defaultTableQuery('2026-11-08'), scope: 'all' as const, division: 'Immigration' as const };
  expect(filterBookingRows(rows, q).map((r) => r.booking.category)).toEqual(['Visa']);
  const p = tableQueryToParams({ ...q, categories: ['Hotel', 'Bus'] }, '2026-11-08');
  expect(p.get('cat')).toBe('Hotel,Bus');
  expect(p.get('div')).toBe('immigration');
  expect(parseTableQuery(p, '2026-11-08')).toMatchObject({ categories: ['Hotel', 'Bus'], division: 'Immigration' });
});
```

Add a directory test: a Booking whose only line is in-house adds nothing to any DMC summary.

- [ ] **Step 2: Run** `npx vitest run src/admin/model/dashboard`. Expected: FAIL.
- [ ] **Step 3: Implement.** Replace each `travelStart` read listed above. An undefined `bookingDate` (fixtures only) sorts last and matches no month.
- [ ] **Step 4: Run** `npx vitest run src/admin/model && npm run typecheck`. Expected: model tests PASS. The only type errors left are in `data/` and `screens/`.
- [ ] **Step 5: Commit** `feat(dashboard): Booking date month basis; Category and Division filters`.

---

### Task 4: Firestore rules, document conversion and data writes

**Files:**
- Modify: `firestore.rules`, `src/admin/data/convert.ts`, `src/admin/data/bookings.ts`, `src/admin/data/index.ts`
- Test: `src/test/rules/admin.test.ts`, `src/admin/data/data.test.ts`

**Interfaces:**
- Consumes: `untagStalePayments`, `validatePayment` (Task 2).
- Produces:
  - `bookingFromDoc` reads `category` (default `'Package'`), `tripScope`, `hasTravel` (default `true`).
  - `OPTIONAL_BOOKING_KEYS = ['clientBalanceDueBy', 'travelStart', 'travelEnd', 'tripScope']`, so `''` / undefined → `deleteField()`.
  - `createBooking` drops blank `travelStart` / `travelEnd` before writing.
  - `BOOKING_SECTIONS`:

    ```
    client: ['clientId']
    service: ['category', 'tripScope', 'lines']
    travel: ['hasTravel', 'destination', 'travelStart', 'travelEnd', 'itinerary', 'pax', 'travellerNames']
    travellers: ['pax', 'travellerNames']
    price: ['sellingPrice', 'clientBalanceDueBy']
    notes: ['internalNotes']
    ```

    The `lines` key is removed.
  - `saveServiceSection(db: Firestore, bookingId: string, patch: Pick<BookingEditableFields, 'category' | 'tripScope' | 'lines'>): Promise<{ untagged: { client: number; dmc: number } }>` runs in one transaction:
    - reads the Booking
    - calls `untagStalePayments(booking, patch.lines)`
    - writes the patch, plus either payment list that changed, plus `updatedAt`
  - `addPayment` / `updatePayment` throw `AdminDataError('conflict', 'That service is no longer on this booking')` when `lineId` fails the Task 2 check against the stored lines.

**Rules (bookings):**
- Allowed keys gain `category`, `tripScope`, `hasTravel`.
- Required keys lose `destination`, `travelStart`, `travelEnd`.
- Then:

```
&& (!('category' in d) || d.category in ['Visa','Passport','Package','Hotel','Flight','Train','Bus'])
&& (!('tripScope' in d) || d.tripScope in ['Domestic','International'])
&& (!('hasTravel' in d) || d.hasTravel is bool)
&& (!('destination' in d) || (d.destination is string && d.destination.size() <= 200))
&& optDate(d, 'travelStart') && optDate(d, 'travelEnd')
&& (!('travelStart' in d) || !('travelEnd' in d) || d.travelEnd >= d.travelStart)
&& (d.get('hasTravel', true) == false
    || (nonEmptyString(d.get('destination', ''), 200) && 'travelStart' in d && 'travelEnd' in d))
```

- [ ] **Step 1: Write failing tests.** In `admin.test.ts` `bookings`, add:
  - `it('allows a Visa Booking without Travel')`: `booking({ category: 'Visa', hasTravel: false, destination: undefined, travelStart: undefined, travelEnd: undefined, lines: [{ id: 'l1', type: 'Visa', description: 'UAE visa', netCost: 0, visaType: 'Visitor', visaCountry: 'UAE' }] })` (strip undefined keys like the `rejects` loop does) → `assertSucceeds`.
  - Add these `it.each` reject rows:
    - `['a bad category', { category: 'Cruise' }]`
    - `['a bad trip scope', { tripScope: 'Local' }]`
    - `['Travel on without dates', { hasTravel: true, travelStart: undefined }]`
  - The legacy `booking()` (no `category`, no `hasTravel`) still passes.

  In `data.test.ts`, add:
  - `it('reads a legacy Booking as a Package with Travel')`: seed a doc without the new keys, then `bookingFromDoc` gives `category: 'Package', hasTravel: true` and no `tripScope`.
  - `it('creates a Booking without Travel; blank dates are not written')`: check the raw doc has no `travelStart` key.
  - `it('saveServiceSection clears tags for a deleted line and a changed DMC in the same write')`: seed a Booking with lines `la(d1)`, `lb(d1)`, a Client Payment tagged `lb`, and a DMC Payment tagged `la`. Save lines `[la with dmcId 'd2']`. Expect both tags removed, amounts unchanged, and `untagged: { client: 1, dmc: 1 }`.
  - `it('rejects a payment tagged to a line that is gone')`.
- [ ] **Step 2: Run** `EMU "src/test/rules src/admin/data"`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the rules, conversion and writes above.
- [ ] **Step 4: Run** `EMU "src/test/rules src/admin/data"`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(data): category fields, optional travel, transactional Service save with tag cleanup`.

---

### Task 5: Booking form state

**Files:**
- Modify: `src/admin/screens/booking/form.ts`, `src/admin/model/enquiry.ts`
- Create: `src/admin/screens/booking/form.test.ts`

**Interfaces:**
- Consumes: `BOOKING_SECTIONS`, `saveServiceSection` (Task 4); validation (Task 2); `divisionOf`, `isSingleService`, `categoryForService` (Task 1).
- Produces:
  - `SectionKey`: `'client' | 'service' | 'travel' | 'travellers' | 'price' | 'notes'`.
  - `SECTION_KEYS` in that order.
  - `SECTION_TITLES`: `client: 'Customer', service: 'Service', travel: 'Travel', travellers: 'Travellers', price: 'Price', notes: 'Notes'`.
  - `BookingForm = Omit<BookingEditableFields, 'category'> & { category: BookingCategory | ''; clientMode; newClient }`.
  - `visibleSections(form: BookingForm): SectionKey[]`: drops `travellers` unless the Division is Immigration.
  - `blankLine(type: LineType = 'Hotel'): ServiceLine`: no `dmcId`.
  - `canSetCategory(form: BookingForm, c: BookingCategory): boolean`: false only for Package → single with `lines.length > 1`.
  - `setCategory(form: BookingForm, c: BookingCategory): BookingForm`:
    - from `''`: single → `lines: [blankLine(c)]`; Package → `lines: [blankLine()]`
    - single → single: retype line 0 to `c`, and drop `visaType`/`visaCountry` unless `c === 'Visa'`
    - single → Package: keep the line
    - Package → single: allowed with 1 line, which is retyped
    - leaving Package clears `tripScope`
    - not allowed → returns `form` unchanged
  - `addService(form: BookingForm): BookingForm`: sets `category: 'Package'` and appends `blankLine()`.
  - `setTravel(form: BookingForm, on: boolean): BookingForm`.
  - `sectionErrors`:
    - `service` → `category`, `tripScope`, `lines` field errors plus per-line errors
    - `travel` → `{}` when `!hasTravel`
    - `travellers` → `pax`, `travellerNames`
  - `sectionPatch`:
    - `travel` with `!hasTravel` → `{ hasTravel: false, destination: '', travelStart: undefined, travelEnd: undefined, itinerary: '' }` plus pax/names (Travel Division only)
    - `travel` for Immigration never includes `pax` / `travellerNames`
    - `service` → `tripScope` only for Package, `dmcId: ''` → undefined, Visa fields only on Visa lines
  - `liveMoneyInput` reads `open.has('service')`.
  - `toCreateArgs` passes `category`, `tripScope`, `hasTravel`.
  - `untagWarning(booking: Booking, form: BookingForm): string | null`: when DMC Payments would lose their tag, returns `` `${n} DMC payment${n === 1 ? '' : 's'} tagged to a changed service will stay with the old DMC, untagged.` ``.
  - `blankForm`:
    - `category` from `conversion.category` (applied through `setCategory`), else `''`
    - `hasTravel: !!start`
    - `pax: { adults: 1, children: 0, infants: 0 }`
  - `EnquiryConversion.category?: BookingCategory` (set from `categoryForService`). Remove `lines: []` from the draft.

- [ ] **Step 1: Write failing tests** in `form.test.ts`:

```ts
it('picking a single Category creates its one line; adding a service makes a Package', () => {
  let f = setCategory(blankForm(), 'Visa');
  expect(f.lines.map((l) => l.type)).toEqual(['Visa']);
  f = addService(f);
  expect(f.category).toBe('Package');
  expect(f.lines.map((l) => l.type)).toEqual(['Visa', 'Hotel']);
});
it('Package with 2 lines cannot switch to a single Category; 1 line can and is retyped', () => {
  const two = addService(setCategory(blankForm(), 'Hotel'));
  expect(canSetCategory(two, 'Bus')).toBe(false);
  expect(setCategory(two, 'Bus')).toBe(two);
  const one = { ...two, lines: two.lines.slice(0, 1) };
  expect(setCategory(one, 'Bus')).toMatchObject({ category: 'Bus', tripScope: undefined, lines: [{ type: 'Bus' }] });
});
it('Travellers section only for Immigration', () => {
  expect(visibleSections(setCategory(blankForm(), 'Passport'))).toContain('travellers');
  expect(visibleSections(setCategory(blankForm(), 'Hotel'))).not.toContain('travellers');
});
it('removing Travel clears its fields in the patch', () => {
  const f = { ...setCategory(blankForm({ start: '2026-12-01' }), 'Hotel'), destination: 'Goa', hasTravel: false };
  expect(sectionPatch('travel', f)).toMatchObject({ hasTravel: false, destination: '', travelStart: undefined, travelEnd: undefined, itinerary: '' });
});
it('enquiry conversion presets the Category', () => {
  const c = enquiryConversion(enquiry({ service: 'passport-services' }), clients);
  expect(blankForm({ conversion: c }).category).toBe('Passport');
});
```

- [ ] **Step 2: Run** `npx vitest run src/admin/screens/booking/form.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces above.
- [ ] **Step 4: Run** the same file. Expected: PASS.
- [ ] **Step 5: Commit** `feat(booking-form): category state, add-service conversion, optional travel`.

---

### Task 6: Booking page: Service, Travel and Travellers sections

**Files:**
- Modify: `src/admin/screens/booking/fields.tsx`, `views.tsx`, `BookingPage.tsx`
- Test: `src/admin/screens/BookingScreens.test.tsx`

**Interfaces:**
- Consumes: Task 5 form API; `saveServiceSection` (Task 4); `lineMoney`, `bookingEndDate`, `divisionOf` (Tasks 1–2).
- Produces:
  - `ServiceFields({ form, set, errors, lineErrors, dmcs, dmcPayments, clientPayments })` replaces `LinesFields` as the `service` section editor:
    - Category `<select>` labelled "Category". Options failing `canSetCategory` are `disabled`.
    - Trip Scope as a segmented radio labelled "Trip scope" (Package only).
    - Division shown read-only.
    - Non-Package: the single line's fields inline (Type hidden; DMC select with an empty option "In-house"; Description; Start/End; Net cost; Pay DMC by; Confirmation no.; Voucher notes; for Visa, "Visa type" select and "Country" input), then a button **Add more service**.
    - Package: the existing line cards (with the Visa fields and the In-house option), and the button **Add service line**.
  - `ServiceView`: Category · Trip Scope · Division, then `LinesTable`. `LinesTable` gains:
    - "In-house" in place of the DMC link when there is no DMC
    - columns "Received" (Customer) and "Paid / owed" (DMC; "—" for in-house), from `lineMoney`
  - Travel panel:
    - when `!hasTravel`, shows the note "No travel details." and a button **Add travel details**
    - in edit, a **Remove travel details** button calls `setTravel(form, false)`
    - for Immigration, pax and traveller names are left out
  - Travellers panel (Immigration only): pax + traveller names fields/view.
  - `BookingPage`:
    - renders `visibleSections(form)`
    - Service save calls `saveServiceSection`
    - shows `untagWarning` as a warn `Note` above Save when it's non-null
    - subtitle and "Travel ended … Mark Completed?" use `bookingEndDate` (note hidden when undefined)

- [ ] **Step 1: Write failing screen tests.** Update existing `New booking` tests to pick a Category first: `selectOptions(within(section('Service')).getByLabelText('Category'), 'Package')`, then choose a Trip scope. Replace `section('Service lines')` with `section('Service')`. Add:
  - `it('creates a Visa booking without Travel, then converts it to a Package')`:
    1. pick Customer; Category Visa; Visa type Visitor; Country "UAE"; Description; Net cost; traveller name; Selling price
    2. Create → detail page shows "Visa", "Immigration", and no "Voucher" row (that last assertion is enabled in Task 8)
    3. Edit Service → **Add more service** → Trip scope Domestic → Save
    4. the Firestore doc has `category: 'Package'` and 2 lines, the Visa line first
  - `it('Travel is hidden until Add travel details')`: a Hotel booking created with no travel; the Firestore doc has no `travelStart`.
  - `it('a legacy Booking shows as Package with Travel and asks for Trip scope on Service save')`.
- [ ] **Step 2: Run** `EMU "src/admin/screens/BookingScreens.test.tsx"`. Expected: FAIL.
- [ ] **Step 3: Implement** the components above, reusing `Field`, `Panel` and the inputs from `src/admin/ui`.
- [ ] **Step 4: Run** the same file and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(booking): Service section with Category, inline service, Add more service; optional Travel; Travellers`.

---

### Task 7: Payments Service Line picker and Cancel dialog wording

**Files:**
- Modify: `src/admin/screens/booking/PaymentsSection.tsx`, `StatusControl.tsx`, `fields.tsx` (delete-line warning)
- Test: `src/admin/screens/BookingScreens.test.tsx`

**Interfaces:**
- Consumes: `validatePayment(p, allowedDmcIds, lines)`, `lineDmcIds` (Task 2).
- Produces:
  - The payment row form gains a "Service" select:
    - first option "Whole booking" (value `''` → no `lineId`)
    - Customer side: every line, labelled `"<type> — <description>"`
    - DMC side: only lines whose `dmcId` equals the chosen DMC; changing DMC resets it to `''`
  - Each entry row shows its Service label, or "Whole booking".
  - DMC "Add entry" is disabled when `lineDmcIds(booking)` is empty.
  - Cancel dialog per-line label: `"<type>, <DMC name or 'In-house'>"`. The charge input's aria-label is `Cancellation charge for <same label>`.
  - Delete-line confirm in the line editor warns when payments are tagged to that line: `"Payments tagged to this service will stay on the booking, untagged."`

- [ ] **Step 1: Write failing tests** in the `Payments` describe:
  - `it('tags a Customer Payment to a service and lists it')`
  - `it('DMC entry lists only that DMC's services; in-house-only booking disables DMC Add entry')`

  In `Status and cancellation`, assert the in-house line label "In-house".
- [ ] **Step 2: Run** `EMU "src/admin/screens/BookingScreens.test.tsx"`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same file. Expected: PASS.
- [ ] **Step 5: Commit** `feat(payments): optional Service Line on Customer and DMC payments; in-house labels`.

---

### Task 8: Lists, calendar, detail screens and documents

**Files:**
- Modify: `src/admin/screens/dashboard/{BookingsTable,TableFilters,BookingsCalendar}.tsx`, `src/admin/screens/{ClientDetailScreen,DmcDetailScreen}.tsx`, `src/admin/pdf/view.ts`, `src/admin/screens/booking/DocumentsCard.tsx`
- Test: `src/admin/screens/DashboardScreens.test.tsx`, `src/admin/pdf/view.test.ts`, `src/admin/screens/DocumentsCard.test.tsx`

**Interfaces:**
- Consumes: `bookingDate`, `bookingEndDate`, `divisionOf` (Task 1); `TableQuery.categories` / `division` (Task 3).
- Produces:
  - Table:
    - "Category" column after Booking ID
    - the "Travel dates" column renders `dateRange(bookingDate, bookingEndDate)`
    - Filters popover gains Category checkboxes and a Division radio (Any / Travel / Immigration), with chips `Category: …` and `Division: …`
  - Calendar: bars and agenda use `bookingDate` → `bookingEndDate ?? bookingDate` in place of `travelStart` / `travelEnd`.
  - Client/DMC detail booking lists use the same date range.
  - `invoiceView` description title:
    - Cancelled: `Cancellation charge — <subject>`
    - otherwise: `<Package ? 'Holiday package' : category> — <subject>`
    - `subject` = `destination` when `hasTravel`, else `lines[0].description`
    - the detail line is dropped when empty
  - `voucherView`: the trip block leaves out empty destination and dates.
  - `DocumentsCard`: no Voucher row when `divisionOf(booking.category) === 'Immigration'`.

- [ ] **Step 1: Write failing tests.**
  - `view.test.ts`:
    - `it('titles the invoice by Category')`: Visa booking with `hasTravel: false` and line description "UAE tourist visa" → `'Visa — UAE tourist visa'`; Package keeps `'Holiday package — <destination>'`
    - voucher with `hasTravel: false` → `trip.destination` is `''` and no crash
  - `DocumentsCard.test.tsx`: a Passport Booking shows the Invoice row and no Voucher row.
  - `DashboardScreens.test.tsx`: the Category filter chip narrows the table, and the URL gets `cat=Visa`.
- [ ] **Step 2: Run** `npx vitest run src/admin/pdf/view.test.ts` and `EMU "src/admin/screens/DashboardScreens.test.tsx src/admin/screens/DocumentsCard.test.tsx"`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** both commands. Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): Category in lists and filters, Booking-date calendar, category-aware documents`.

---

### Task 9: Full verification and docs touch-up

**Files:**
- Modify: `docs/specs/udan-admin.md` (Booking detail "Sections": Category, single service and Service lines are one **Service** panel, saved in one transaction), `src/admin/README.md` (model list: `category.ts`, `lineMoney`, `untagStalePayments`)

- [ ] **Step 1: Run** `npm run typecheck`. Expected: no errors.
- [ ] **Step 2: Run** `npm test`. Expected: all suites PASS.
- [ ] **Step 3: Run** `npm run build`. Expected: success.
- [ ] **Step 4: Update the docs** listed above.
- [ ] **Step 5: Commit** `docs: Service panel and new model helpers`.
