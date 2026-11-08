---
title: UDAN admin — booking and DMC management with Firebase Auth and Firestore
status: ready-for-agent
labels: [ready-for-agent]
created: 2026-11-01
depends-on: docs/specs/udan-website.md (phase 2 — Firestore enquiry form, `firestore.rules`, rules test harness)
---

## Problem Statement

UDAN Immigration & Tours sells tours and visa/travel services and fulfils them through third-party suppliers (DMCs). Today every Booking lives in phone chats, notebooks and spreadsheets: what the Client was quoted, which DMC handles which hotel or transfer, what the Client has paid, what UDAN still owes each DMC, and what UDAN earns on the deal. There is no single place to see money owed in either direction, no invoice or voucher to send the Client, and website Enquiries can only be read in the Firebase console.

## Solution

A private `/admin` area inside the existing website, for allow-listed Admins only, that:

- Signs Admins in with Google. Access is limited to emails on a Firestore allow-list.
- Keeps reusable **Client** and **DMC** records, and **Bookings** that link one Client to one or more DMCs through **Service Lines**.
- Records **Client Payments**, **DMC Payments** and **Refunds** as lists of entries, and computes outstanding amounts and **Commission** in the browser.
- Handles the full Booking lifecycle by hand (Pending → Confirmed → Voucher Received → Completed, or Cancelled with Cancellation Charges).
- Shows a dashboard: an **Overview** tab (month stats, Needs attention, Bookings Calendar | Table) and an **Insights** tab (FY KPIs, charts, top tables).
- Generates a UDAN-branded **Invoice** PDF (single total, payments, balance, UPI QR) and **Voucher** PDF (services, dates, confirmation numbers, never DMC names or costs) in the browser. The Admin sends them by hand through Share, Download, WhatsApp or email.
- Lists website **Enquiries** and converts one into a Booking.
- Keeps the whole system on the free **Spark** plan: browser only, with no Cloud Functions and no Storage.

Screens: Login, Dashboard (Overview, Insights), Booking detail / New booking, Clients (list, detail), DMCs (list, detail), Enquiries, Settings (Account, Business profile, Data).

Vocabulary follows `GLOSSARY.md` (Admin, Client, DMC, Booking, Booking Status, Service Line, Selling Price, Net Cost, Commission, Client Payment, DMC Payment, Refund, Cancellation Charge, Invoice, Voucher, Enquiry, Enquiry Status, Backup, Payments Ledger). Use those words in code, UI copy and tests.

## User Stories

### Access

1. As an Admin, I want to sign in with my Google account in one click, so that I have no separate password to manage.
2. As the owner, I want only Google accounts whose email is on the allow-list to get in, so that nobody else can see Client or money data.
3. As someone not on the allow-list, I want a clear "This Google account isn't allowed to access UDAN admin." message, so that I know why I can't get in.
4. As the owner, I want an email removed from the allow-list to lose access on its next request, so that revoking access is immediate.
5. As an Admin, I want to see which account I'm signed in as and sign out from Settings, so that I can switch accounts on a shared device.
6. As an Admin following a deep link while signed out, I want to land on that page after signing in, so that links in chats work.
7. As the owner, I want `/admin` never indexed by search engines and never downloaded by public visitors, so that the public site stays fast and the admin stays private.

### Bookings

8. As an Admin, I want to create a Booking with a Client, a Booking Category, a Selling Price and its service(s) on one page, with travel details optional, so that I capture a sale in one go.
9. As an Admin, I want each Booking to get the next Booking ID (`UDN-001`, `UDN-002`, …) when I first save it, so that IDs are sequential and never reused.
10. As an Admin, I want to pick an existing Client by name or mobile, or create a new one inline, so that Client records stay reusable.
11. As an Admin, I want to add Service Lines (Hotel, Transfer, Flight, Train, Bus, Sightseeing, Visa, Passport, Package, Other), each with an optional DMC, its own Net Cost, dates, pay-by date and confirmation number, so that one Booking can use several DMCs or UDAN itself.
12. As an Admin, I want to create a new DMC from inside a Service Line, so that I don't lose my place in the Booking.
13. As an Admin, I want to edit each section of a Booking (Client, Travel, Price, Service lines, Notes) in place with its own Save and Cancel, so that small changes are quick and safe.
14. As an Admin, I want Selling Price, Net Cost, Commission, Client outstanding and DMC outstanding always visible beside the Booking and updated live while I edit, so that I see the money effect before saving.
15. As an Admin, I want to record Client Payments and Refunds inline (date, kind, mode, reference, amount, optional Service Line), and to edit or delete them, so that the Client balance is always right and I can see what was received per service.
16. As an Admin, I want to record DMC Payments and Refunds against a specific DMC on the Booking, optionally for one of that DMC's Service Lines, so that I know what I owe each DMC and each line.
17. As an Admin, I want to change the Booking Status in any direction from a select, so that the status matches reality even after a mistake.
18. As an Admin, I want cancelling to ask for a reason, the Client Cancellation Charge and each line's DMC Cancellation Charge, with a live preview of Commission and refunds, so that I understand the outcome before confirming.
19. As an Admin, I want to un-cancel a Booking, so that a wrong cancellation can be reversed.
20. As an Admin, I want a warning (not a block) when I set Voucher Received while some Service Lines lack a confirmation number, so that I don't send an incomplete Voucher by accident.
21. As an Admin, I want a "Mark Completed?" note on Bookings whose travel has ended, so that statuses don't go stale.
22. As an Admin, I want Bookings never deleted, only cancelled, so that the Booking ID series and money history stay intact.
- 22a. As an Admin, I want to choose a Booking Category (Visa, Passport, Package, Hotel, Flight, Train, Bus) right after the Customer, so that the form shows only what that kind of sale needs.
- 22b. As an Admin, I want a single-service Booking to show its service's fields inline, and an "Add more service" button that turns it into a Package, so that simple sales stay simple and can grow.
- 22c. As an Admin, I want to set a Package's Trip Scope (Domestic / International), so that I can tell the two apart.
- 22d. As an Admin, I want a Visa service to carry its Visa Type (Visitor / Business) and country, so that I know what is being applied for.
- 22e. As an Admin, I want travel details behind an "Add travel details" button, shown only for travel Categories (Package, Hotel, Flight, Train, Bus), so that I skip them when they don't apply.
- 22g. As an Admin, I want a Travellers section (head-counts and names, all optional) on every Booking, so that I can record who the service is for whatever the Category.
- 22f. As an Admin, I want each Booking's Division (Travel / Immigration) to follow from its Category, so that I can filter by line of business without extra input.

### Dashboard — Overview

23. As an Admin, I want a month bar (previous, next, "This month") that drives the stats, calendar and table, so that I review one month at a time.
24. As an Admin, I want four figures for the month (Bookings, Selling Price, Commission, Client outstanding), so that I see the month's health at a glance.
25. As an Admin, I want a Needs attention list (Client balances overdue, DMC payments due in 7 days or overdue, travel ended but not Completed, refunds owed, new Enquiries, Backup overdue), so that I know what to act on today.
26. As an Admin, I want a calendar of Bookings drawn as bars across their travel days, labelled with Booking ID and Client, coloured by status, so that I see who is travelling when.
27. As an Admin, I want to click an empty calendar day to start a New booking with that start date, so that I can capture a trip from the calendar.
28. As an Admin, I want a Bookings table (with Category column and Category / Division filters) with search, advanced filters, sorting, footer totals and CSV export, all kept in the URL, so that I can find and share any slice of Bookings.
29. As an Admin on a phone, I want an agenda list instead of the month grid and cards instead of table rows, so that the dashboard works on a small screen.

### Dashboard — Insights

30. As the owner, I want FY KPIs (Bookings, Selling Price, Commission, Commission %, average Selling Price, Cancellation rate) compared with the previous period, so that I can see how the business is trending.
31. As the owner, I want charts of monthly Selling Price and Commission, Bookings by status, Commission by destination, Net Cost by DMC, Selling Price by Service Line type, Client outstanding ageing, DMC payables for the next 8 weeks and Enquiries → Bookings per month, so that I understand where money comes from and goes.
32. As the owner, I want Top Clients, Top DMCs and Destinations tables, so that I know my best customers and suppliers.
33. As an Admin using a keyboard or screen reader, I want every chart to have a "View as table" option, so that the data is accessible.

### Clients and DMCs

34. As an Admin, I want a searchable Clients list with Bookings count, Billed and Outstanding, so that I can find a Client and see what they owe.
35. As an Admin, I want a Client page with call, WhatsApp, New booking, their Bookings and editable details, so that everything about one Client is in one place.
36. As an Admin, I want a DMCs list showing what I owe each DMC and the next pay-by date, and an "Only with money owed" filter, so that I pay suppliers on time.
37. As an Admin, I want a DMC page listing every Booking that DMC serves, with cost, paid and outstanding, so that I can reconcile with the DMC.
38. As an Admin, I want deleting a Client or DMC blocked while any Booking uses it ("Used in N bookings"), so that Bookings never point at missing records.

### Enquiries

39. As an Admin, I want to see every website Enquiry, filtered to Open (New + Contacted) by default, with counts per status, so that no lead is missed.
40. As an Admin, I want an Enquiries nav badge with the live count of New Enquiries, so that I notice new leads from any page.
41. As an Admin, I want to call or WhatsApp an Enquirer, mark them Contacted, add notes, close or reopen the Enquiry, so that I can track follow-ups.
42. As an Admin, I want to convert an Enquiry into a Booking with the form prefilled and the Client matched by mobile, so that I don't retype details.
43. As an Admin, I want to delete spam Enquiries (but never converted ones), so that the list stays clean.

### Documents

44. As an Admin, I want to prepare an Invoice PDF that gets an FY invoice number (`UDAN/2026-27/001`) the first time and keeps it afterwards, so that each Booking has one stable Invoice.
45. As a Client, I want an Invoice showing the package price, included services (without prices or DMC names), my payments, refunds and balance, plus a UPI QR for the balance, so that I know what I owe and can pay easily.
46. As a Client of a cancelled Booking, I want the Invoice to show the cancellation charge and whether I owe more or am due a refund, so that the settlement is clear.
47. As a Client, I want a Voucher showing my trip day by day with confirmation numbers and an emergency contact, so that I have everything I need while travelling.
48. As the owner, I want the Voucher to never show DMC names or any cost, so that supplier relationships and margins stay private.
49. As an Admin, I want to Share, Preview, Download, WhatsApp or email a prepared document, with a prefilled message, so that sending takes seconds on phone or desktop.

### Settings and data

50. As an Admin, I want to edit the Business profile (trading name, address, phones, email, website, bank and UPI details, invoice terms, emergency contacts, voucher notes, signature image), so that documents show current business details without code changes.
51. As the owner, I want to download a full JSON Backup of all admin data and be reminded when the last one is more than 30 days old, so that data can be recovered if lost.
52. As the owner, I want to export a Payments Ledger CSV by date range and side, and Clients and DMCs CSVs, so that my accountant can work in Excel.

### Quality

53. As an Admin, I want every data region to show loading, empty, error (with retry) and full states, so that I always know what is happening.
54. As a keyboard user, I want visible focus, labelled controls and 44px tap targets throughout the admin, so that it is usable without a mouse and on phones.

## Implementation Decisions

### Prerequisite

The website spec's **phase 2** enquiry work (`submitInquiry()` writing to `inquiries`, `firestore.rules`, `src/lib/firebase.ts`, the rules unit-testing harness) must land first. Today the site's enquiry block is a placeholder (`src/components/InquiryFormSlot.tsx`), and the repo has no `firestore.rules` and no Firebase init module. Admin Enquiries reads exactly what that form stores. If the rules test harness doesn't exist when the admin build starts, the admin build creates it (website spec, Seam 2 tooling).

### Platform constraints

- Firebase project `udan-2068e`, **Spark plan**. No Cloud Functions, no Cloud Storage, no Admin SDK, no custom claims, no scheduled jobs. Everything runs in the browser.
- Existing stack: Vite 7, React 19, TypeScript, react-router 7 data router (`createBrowserRouter` in `src/App.tsx`), firebase 12, lucide-react, Vitest + Testing Library.
- New dependencies: `@react-pdf/renderer@^4.9`, `qrcode`, `recharts@^3.10.1`, `react-is@^19` (must match installed react), `@firebase/rules-unit-testing` (dev), `firebase-tools` (dev, for emulators) if not already added by website phase 2.
- **Money**: integer INR rupees everywhere (no paise, no floats). Display `₹` with `en-IN` grouping (`₹1,48,500`) in tabular figures.
- **Dates**: business dates are `YYYY-MM-DD` strings in IST. "Today" is always computed in `Asia/Kolkata`. Firestore `Timestamp` is used only for `createdAt`, `updatedAt` and Enquiry `convertedAt`. Display dates as "1 Nov 2026".
- **FY**: 1 April – 31 March, IST, labelled `2026-27`.

### Auth: Google sign-in with an email allow-list

- **Admin** = a signed-in Google account whose email is listed in `config/admins` = `{ emails: string[] }` (lowercase). All Admins are equal and there are no roles.
- The allow-list is **edited only in the Firebase console**. The app can read it (Admins only) but never write it. Bootstrap: create the doc in the console with the owner's Gmail.
- Console setup: enable the Google provider, **disable Email/Password**, and set authorized domains to the hosting domains + `localhost`.
- **Login** (`/admin/login`): logo, "Sign in to UDAN admin", one **Continue with Google** button. Uses `signInWithPopup(new GoogleAuthProvider())` with `prompt: 'select_account'`. No email/password fields and no forgot-password link.
- **Session hook** `useAdminSession()` subscribes to `onAuthStateChanged` and returns `loading | signedOut | checking | admin | denied`. For each user, it reads `config/admins`. Success → `admin`. `permission-denied` → best-effort `deleteUser(currentUser)`, then `signOut`, then the "This Google account isn't allowed…" message on the login page.
- A **global `permission-denied` handler** on any Firestore call signs out and returns to login (this covers removed emails).
- Login, when already signed in as an Admin → redirect to `?next=` if it is a same-origin `/admin…` path, else `/admin`.
- **Settings → Account**: signed-in email + avatar + **Sign out**. No credential forms.

### Routing and bundle isolation

- **One Vite entry.** In `src/App.tsx`, add a top-level `/admin` route as a **sibling** of `SiteLayout` (no site header, footer or MobileContactBar), with `lazy: () => import('./admin/routes')`. All admin code lives under `src/admin/`, and nothing outside `src/admin/` imports from it.
- `src/lib/firebase.ts` (shared, from website phase 2) = `initializeApp` + a `getFirestore` getter. `firebase/auth` is imported **only** under `src/admin/auth/`.
- **Nested lazy chunks**: the Insights route lazy-imports Recharts. `@react-pdf/renderer`, the PDF templates, the TTF fonts and `qrcode` load only when **Prepare** is pressed.
- **Admin routes**:
  - `/admin/login`
  - `/admin` (Overview) and `/admin/insights`
  - `/admin/bookings/new` (`?start=YYYY-MM-DD` from a calendar day; `?enquiry=<id>` from Convert)
  - `/admin/bookings/:bookingNo` (detail = editor; **no `/edit` route**)
  - `/admin/clients`, `/admin/clients/:id`
  - `/admin/dmcs`, `/admin/dmcs/:id`
  - `/admin/enquiries`
  - `/admin/settings`
  - unknown `/admin/*` → admin-styled 404 inside the shell.
- **Guard**: `AdminLayout` (lazy) is the guard component, not a route loader. While `loading`/`checking` it shows a full-screen centred spinner (no shell flash). `signedOut`/`denied` → `<Navigate to="/admin/login?next=<path>" replace>`. `admin` → shell + `<Outlet>`.
- **Not indexed**: `firebase.json` `hosting.headers` gets `{ "source": "/admin{,/**}", "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }] }`. `AdminLayout` and Login set `<meta name="robots" content="noindex, nofollow">` and `document.title = "<Page> · UDAN admin"`, and remove them on unmount. `robots.txt` stays **unchanged**. Any future sitemap excludes `/admin`. No public link to `/admin`. Hosting rewrites stay unchanged (`** → /index.html`).
- **`bundleGuard` Vite plugin** in `vite.config.ts`: in `generateBundle`, walk the entry chunk + its **static** `imports` closure, and `this.error()` if any module id matches `/src\/admin\//`, `firebase\/auth|@firebase\/auth`, `@react-pdf` or `recharts`. `npm run build` fails on a leak.

### Data model (Firestore)

Collections `clients`, `dmcs`, `bookings`, `counters`, `settings`, `config`, plus the website's `inquiries`. Auto IDs except `counters`, `settings/business` and `config/admins`. Every admin-written doc has `createdAt` (create) and `updatedAt` (every write) as `serverTimestamp()`.

```ts
type ISODate = string;   // 'YYYY-MM-DD', IST
type INR = number;       // integer rupees, >= 0
type PayMode = 'Cash' | 'UPI' | 'Bank transfer' | 'Card' | 'Cheque' | 'Other';
type BookingStatus = 'Pending' | 'Confirmed' | 'Voucher Received' | 'Completed' | 'Cancelled';
type LineType = 'Hotel' | 'Transfer' | 'Flight' | 'Train' | 'Bus' | 'Sightseeing' | 'Visa' | 'Passport' | 'Package' | 'Other';
type BookingCategory = 'Visa' | 'Passport' | 'Package' | 'Hotel' | 'Flight' | 'Train' | 'Bus';
type Division = 'Travel' | 'Immigration';   // derived, never stored: Visa/Passport → Immigration, else Travel
type TripScope = 'Domestic' | 'International';
type VisaType = 'Visitor' | 'Business';

// clients/{autoId}
type Client = {
  name: string;
  mobile: string;          // E.164; unique across Clients (checked in the UI)
  email?: string; city?: string; notes?: string;
  createdAt: Timestamp; updatedAt: Timestamp;
};
// No passport/ID data (sensitive; no Storage).

// dmcs/{autoId}
type Dmc = {
  name: string;
  contactPerson?: string; phone?: string; email?: string; region?: string; notes?: string;
  createdAt: Timestamp; updatedAt: Timestamp;
};
// No bank details.

// bookings/{autoId}
type Booking = {
  bookingNo: string;       // 'UDN-001' — immutable; route key
  bookingSeq: number;      // 1, 2, … — immutable; sort key
  clientId: string;
  status: BookingStatus;
  category: BookingCategory;                  // absent on legacy docs = 'Package'
  tripScope?: TripScope;                      // Package only; required on save of a Package
  hasTravel?: boolean;                        // false = Travel section skipped ("Add travel details"); always false for Visa/Passport
  destination: string;                        // '' when Travel skipped
  travelStart?: ISODate; travelEnd?: ISODate; // entered, not derived from lines; with Travel: start required, end optional (one-way)
  pax: { adults: number; children: number; infants: number }; // Travellers section; 0 allowed
  travellerNames: string[];                   // optional names
  itinerary: string;                          // free text, printed as-is on the Voucher
  internalNotes: string;
  sellingPrice: INR;                          // the single total the Invoice shows
  clientBalanceDueBy?: ISODate;
  lines: ServiceLine[];
  clientPayments: ClientPayment[];
  dmcPayments: DmcPayment[];
  // set once
  invoiceNo?: string; invoiceSeq?: number; invoiceDate?: ISODate;
  enquiryId?: string;
  // cancellation (present only while Cancelled)
  cancelledAt?: ISODate; cancelReason?: string; clientCancellationCharge?: INR;
  createdAt: Timestamp; updatedAt: Timestamp;
};
type ServiceLine = {
  id: string;              // crypto.randomUUID()
  type: LineType; dmcId?: string; description: string;   // no dmcId = UDAN does it in-house
  visaType?: VisaType; visaCountry?: string;  // Visa lines only; both required there
  start?: ISODate; end?: ISODate;             // absent = "Whole trip"
  netCost: INR;
  confirmationNo?: string; voucherNotes?: string; dmcPayBy?: ISODate;
  dmcCancellationCharge?: INR;                // only while Cancelled; for in-house lines = cost UDAN still bears
};
type ClientPayment = { id: string; kind: 'Payment' | 'Refund'; date: ISODate; amount: INR; mode: PayMode; ref?: string; note?: string; lineId?: string };
type DmcPayment = ClientPayment & { dmcId: string };

// counters/booking, counters/invoice-2026-27
type Counter = { seq: number };

// settings/business — every field optional; documents print only filled fields
type BusinessProfile = {
  tradingName?: string; address?: string /* multi-line */; phones?: string; email?: string; website?: string;
  accountName?: string; accountNumber?: string; ifsc?: string; bankBranch?: string; upiId?: string;
  invoiceTerms?: string; emergencyContacts?: string; voucherNotes?: string;
  signature?: string;      // 'data:image/png;base64,…', ≤ 140,000 chars
  updatedAt: Timestamp;
};

// config/admins (console-edited)
type AdminAllowList = { emails: string[] };

// inquiries/{autoId} — public create schema from the website spec, unchanged; Admin adds:
type EnquiryAdminFields = {
  status: 'new' | 'contacted' | 'converted' | 'closed';
  adminNotes?: string; closeReason?: string;
  clientId?: string; bookingId?: string; convertedAt?: Timestamp;
  updatedAt?: Timestamp;
};
```

- **Lines per Category** (ADR 0001): every non-Package Booking holds exactly one Service Line, whose `type` equals the Category; a Package holds ≥ 1. "Add more service" appends a line and sets `category: 'Package'`. Changing Category between single Categories rewrites the line's `type`; Package → single Category only with exactly one line. Deleting lines never turns a Package back.
- **Legacy docs**: Bookings saved before Categories read as `category: 'Package'`, `hasTravel: true`, no `tripScope` (asked on next save).
- **Embedded lists**: Service Lines and both payment lists live inside the Booking doc. That means one read and an atomic save, far below the 1 MiB limit.
- **Nothing denormalised**: no Client name snapshot, no stored totals. The admin loads `clients`, `dmcs`, `bookings` and `inquiries` once per session with `onSnapshot` listeners in one `AdminDataProvider`. That gives live updates and keeps concurrent Admins in sync. All joins, totals, filters and search are computed in the browser. Volume is a few hundred Bookings a year, well under Spark's 50K reads/day.
- **Integrity checks done client-side**: a Client or DMC can't be deleted while any Booking references it (UI shows "Used in N bookings", delete disabled). Client mobile is unique. `travelEnd >= travelStart`. A DMC Payment's `dmcId` must be one of the Booking's line DMCs at the time of entry. A payment's `lineId`, when set, must be a line on the Booking (for DMC Payments, a line of that DMC). Deleting a line clears `lineId` on payments tagged to it; changing a line's DMC clears `lineId` on DMC Payments tagged to it (they stay on the old DMC's total; the form warns before saving).
- **Seeding `settings/business`**: on first open of Settings, or on first Prepare, if the doc is missing, seed it from `src/content/business.ts` (trading name, address, phone). Email and website stay empty. The logo is the bundled `src/assets/brand/` asset and can't be edited.

### Money rules (one pure module: `src/admin/model/money.ts`)

Not Cancelled:

- Net Cost = Σ line `netCost` (lines with or without a DMC)
- Commission = Selling Price − Net Cost
- Client net received = Σ Client Payments − Σ Client Refunds
- Client outstanding = Selling Price − Client net received
- DMC outstanding (per DMC) = Σ that DMC's lines' `netCost` − (Σ its DMC Payments − Σ its DMC Refunds). Total DMC outstanding = the sum over DMCs. In-house lines (no DMC) count in Net Cost but in no DMC's outstanding.
- Per line, DMC side (display only): paid = Σ DMC Payments − Refunds tagged to that line; still owed = line `netCost` (or `dmcCancellationCharge`) − paid. Untagged payments reduce only the DMC total, which stays the source of truth.
- Per line, Client side (display only): received = Σ Client Payments − Refunds tagged to that line. No per-line Client outstanding (lines have no Selling Price).

Cancelled:

- Selling Price is replaced by `clientCancellationCharge`, and each line's Net Cost by its `dmcCancellationCharge`.
- Commission = `clientCancellationCharge` − Σ `dmcCancellationCharge`
- Client outstanding = `clientCancellationCharge` − net received (negative = refund owed to the Client)
- DMC outstanding per DMC = Σ its lines' `dmcCancellationCharge` − its net paid (negative = refund due from that DMC)
- The original `sellingPrice` and `netCost` stay on the doc for history.

Deleting a line that has DMC Payments is allowed. That DMC's outstanding may go negative, shown as "Due back ₹X".

**Counting rules** (dashboard, Insights, Client/DMC strips):

| Booking state | Outstanding totals | Selling Price / Commission totals | Booking counts |
|---|---|---|---|
| Pending | excluded | excluded (Insights shows "Pending pipeline": count + Σ Selling Price) | excluded from stats; visible in calendar/table |
| Confirmed / Voucher Received / Completed | included | included | included |
| Cancelled | cancellation outstanding; negatives listed separately as Refunds owed, never netted into totals | Cancellation Charge as Selling Price, Σ line Cancellation Charges as Net Cost | excluded from counts; feeds Cancellation rate |

**Month basis**: a Booking belongs to the IST month of its **Booking date** in every money or month view: `travelStart` if set, else the earliest line `start`, else the IST date of `createdAt`. Its **end date** is `travelEnd` if set, else the latest line `end`, else none. Display (Invoice, Voucher, subtitle) uses entered dates only (travel or line dates), never the `createdAt` fallback.

**Flags**:

- **Travel ended, not marked Completed** = end date (see Month basis) `< today` and status is Confirmed or Voucher Received. Never shown when there is no end date.
- **Client balance overdue** = `clientBalanceDueBy < today` and Client outstanding > 0.
- **DMC payment due / overdue** = a line's `dmcPayBy` within the next 7 days / before today, and that DMC's outstanding on the Booking > 0.

### Booking ID and invoice numbering

- **Counter docs** in `counters`, bumped **inside the same Firestore transaction** that writes the Booking (first save, not form open) or that sets the Booking's `invoiceNo` (first Prepare of the Invoice). No gaps.
- **Booking ID**: one global series that never resets. `bookingNo = 'UDN-' + pad3(seq)` (min 3 digits, grows to `UDN-1000`), plus `bookingSeq`. Starts at 001 with no seeding (counter created at `seq: 1`).
- **Invoice number**: allocated lazily on first Prepare. `invoiceDate` = today (IST), the FY comes from `invoiceDate`, and the counter is `counters/invoice-<FY>` (e.g. `invoice-2026-27`). It restarts at 001 each April. Format `UDAN/2026-27/001` (min 3 digits). Uninvoiced Bookings use no number.
- **One Invoice per Booking**: re-Prepare keeps `invoiceNo` and the original `invoiceDate`, and renders the current price, payments and balance. No revision suffix, no credit notes. Numbers are never reused, including for Cancelled Bookings.

### Booking Status lifecycle

- Manual select on Booking detail. Any status can move to any other. It applies immediately as one field write. **No automatic changes.**
- Meanings, not gates: Pending = quote stage; Confirmed = Client committed + DMC(s) booked; Voucher Received = confirmation numbers in hand; Completed = travelled.
- → **Voucher Received** while any line lacks `confirmationNo`: an inline warning, but the change still saves.
- → **Cancelled** opens the **Cancel dialog**:
  - Fields: reason (required), Client Cancellation Charge (default 0; hint shows the original Selling Price), and a Cancellation Charge per line (default 0) — what the DMC keeps, or for in-house lines what UDAN still bears.
  - Live preview: what Commission becomes, Client refund owed / still owes, DMC due back / you owe.
  - A note to record refunds as Refund entries.
  - Buttons: "Keep booking" and a red "Cancel booking".
  - The write sets `status`, `cancelledAt` (today IST), `cancelReason` and the charges.
- **Un-cancel** (leaving Cancelled; a hint sits under the select) clears `cancelledAt`, `cancelReason`, `clientCancellationCharge` and every line's `dmcCancellationCharge`. Refund entries stay.
- **Partial cancellation** = edit the Booking: adjust the Selling Price, then edit or delete Service Lines. There is no line-level status.
- **No status history** and no audit log. Only the current values are kept.

### Admin shell and design

- **Design**: built with `/hallmark` (app-screen scope, modern-minimal; professional, minimalist). It **keeps the website palette, fonts (Manrope headings, Inter body), radius and spacing** from `src/styles/tokens.css`. The admin only appends derived tokens to that file:

```css
--adm-pending-bg: #eef1f2;   --adm-pending-fg: #46525a;   --adm-pending-bar: #8a979c; /* bar = light fill + 1px outline */
--adm-confirmed-bg: #e3eef2; --adm-confirmed-fg: #165d79; --adm-confirmed-bar: var(--color-teal);
--adm-voucher-bg: #e0f2f7;   --adm-voucher-fg: #0b5a6e;   --adm-voucher-bar: #17788f;
--adm-completed-bg: #eaf3e0; --adm-completed-fg: #3f6e15; --adm-completed-bar: var(--color-action);
--adm-cancelled-bg: #f3f3f1; --adm-cancelled-fg: #5b686d; /* + line-through */
--color-danger: #b42318;     --color-danger-tint: #fdecea;
--color-warn: #8a5300;       --color-warn-tint: #fdf3e1;
--adm-chart-1: #9cc3d2;
--adm-ctrl: 2.25rem;         --dur-micro: 120ms;
--adm-on-dark-hover: rgb(255 255 255 / 0.08); --adm-on-dark-active: rgb(255 255 255 / 0.14); --adm-on-dark-rule: rgb(255 255 255 / 0.2);
--adm-scrim: rgb(37 50 56 / 0.4);
```

- **Shell**: a white sticky top bar. On the left, the UDAN logo (→ `/admin`), then nav links: Dashboard, Enquiries (badge = live count of `status == 'new'`), Clients, DMCs, Settings. On the right, one filled primary button, **New booking**. No sidebar. Below 60rem the nav moves behind a menu button and New booking stays visible. Page container max 80rem on `--color-surface`.
- **Controls**:
  - App controls are 36px (`--adm-ctrl`) with 44px tap targets. One radius, `--radius`.
  - Segmented controls show the active option in the Confirmed tint. Focus = 2px `--focus-ring` outline.
  - Font weights 400/600/700 only. Labels in sentence case, never in capitals.
  - Field borders use `--color-slate` (`--color-border` fails 3:1 for input edges). Field hints sit under the input.
  - Every text/background pair is ≥ 4.5:1.
- **Dialogs**: native `<dialog>`, **centred**. Needs `margin: auto` because `base.css` resets `* { margin: 0 }`. Backdrop `--adm-scrim`. Used for the Cancel booking, New client and New DMC dialogs and for delete confirms. Everything else is inline or a disclosure.
- **Four states for every data region**: loading skeleton, empty (what goes here + one action), error (what broke + Retry), full.
- **Reference prototypes** (look and interaction source of truth; **do not merge**):
  - branch `prototype/admin-shell` (commit 4ecffa4), `src/prototype/admin/` → `VariantA` in `Variants.tsx`, `admin.css`. Route `/prototype/admin?variant=A`.
  - branch `prototype/admin-screens` (on top of admin-shell), `src/prototype/admin/{BookingScreens,DirectoryScreens,ScreensPage}.tsx`, `screens.css`, `screens-data.ts`. Variant B is the default. Routes `/prototype/admin/bookings/UDN-003`, `/bookings/UDN-007` (Cancelled), `/bookings/new?enquiry=e1`, `/clients`, `/dmcs`, `/enquiries`, `/settings`.
  - Login and Settings → Account in those prototypes are **superseded** by Google sign-in (above).

### Dashboard — Overview (`/admin`)

H1 "Dashboard", then underline tabs **Overview | Insights**. These are real routes, so back and deep links work. Overview runs top to bottom:

1. **Month bar**: prev / month (month+year popover) / next, plus a "This month" link when away from it. Kept in the URL as `?month=2026-11`. It is shared by the stats, calendar and table.
2. **Stat row** for the selected month: Bookings (count, excl. Pending/Cancelled), Selling Price, Commission, Client outstanding (for that month's Bookings). Shown as one bordered strip, 2×2 on a phone. Plain figures, no deltas.
3. **Needs attention** (all-time; hidden when empty):
   - One bordered list, one row per non-empty category: count pill by tone, label, "Show".
   - Each row expands in place (`<details>`) to list `UDN-xxx Client, detail` with links to the Bookings, and links to the table pre-filtered.
   - Categories:
     - Client balance overdue (danger)
     - DMC payments due in 7 days / overdue (warn)
     - Refunds owed to Clients / due from DMCs (warn)
     - Travel ended, not marked Completed (info)
     - New Enquiries (info, → `/admin/enquiries`)
     - **Backup overdue** (never, or > 30 days on this device; → Settings)
4. **Bookings block** with a **Calendar | Table** switch (`?view=calendar|table`). Default Calendar on desktop, Table on phone.

**Calendar** (hand-rolled, no library):

- Month grid, weeks start Monday. Today is a teal circle. Days from other months get a tinted background.
- Each Booking is a 24px bar spanning Booking date – end date (one day when there is no end date; see Month basis), labelled with the **Booking ID in bold + Client name** and coloured by status. Bars break at week edges with square ends.
- At most 3 bars per day cell, then "+N more" → a day popover.
- Cancelled is hidden by default ("Show cancelled" checkbox). Status legend below the grid.
- Click a bar → Booking detail. Click an empty day → `/admin/bookings/new?start=<date>`.
- Below 640px: an agenda list grouped by day.
- The travel-ended flag is not shown in the calendar.

**Table** — this **is** the Booking list; there is no separate bookings page.

- **Tools row**: search box, scope switch (selected month | All time), "Filters" popover with removable chips + "Clear all", CSV button.
- **Columns**: Booking ID, Client (name + mobile), Category, Destination, Travel dates (+ "Not marked Completed" flag), Pax, Status, Selling Price, Received, Client outstanding, Commission, DMC(s). Column visibility menu.
- **Search**: debounced, case-insensitive substring across Booking ID, Client name/mobile/email, destination, DMC name, confirmation no., invoice no. and traveller names. With text in a month scope, show a "Search all time" link.
- **Filters**:
  - Status (multi)
  - Category (multi); Division (Travel / Immigration)
  - Date range on Travel start / Travel end / Booked on (`createdAt`); a range overrides the month scope
  - Client; DMC (multi); Service Line type (multi)
  - Client payment: Fully paid / Outstanding / Overdue / Refund owed
  - DMC payment: Fully paid / Outstanding / Due in 7 days / Overdue
  - Invoice: Generated / Not generated
  - Flag: Travel ended, not Completed
- **Sort**: the column header is the sort button (arrow shows direction). Sortable: Booking ID (`bookingSeq`), Client, Destination, Travel start, Status (lifecycle order), Selling Price, Outstanding, Commission, Booked on. Default: Travel start asc.
- **Display**:
  - Horizontal rules only; numbers right-aligned, tabular.
  - Overdue outstanding in danger red. Negative outstanding reads "Refund ₹X" in warn.
  - Footer totals for filtered rows: count, Selling Price, Received, Outstanding, Commission.
  - Month scope: no pagination. All time: 50 rows + "Show more".
  - All search, filter, sort and scope state lives in URL query params.
  - Phone: each row becomes a card (ID, Client + mobile, dates, status, outstanding).
- **CSV export**: filtered + sorted rows, via the shared CSV util.

### Dashboard — Insights (`/admin/insights`, lazy, Recharts)

- **Period**: This month / Last month / This FY / Last FY / Custom range. Default This FY. Compared with the previous equal period; deltas appear on KPIs only.
- **KPIs** (6; 3 columns on tablet): Bookings, Selling Price, Commission, Commission % (Commission ÷ Selling Price), Average Selling Price, Cancellation rate. Plus the Pending pipeline figure.
- **Charts**, each in a bordered `<figure>` on a 2-column grid (chart 1 full width):
  1. Selling Price + Commission by month — `ComposedChart`, bars + line, second Y axis.
  2. Bookings by Status — `BarChart layout="vertical"`.
  3. Commission by destination, top 10 — vertical layout.
  4. Net Cost by DMC, top 10 — vertical layout.
  5. Selling Price by Service Line type — vertical layout.
  6. Client outstanding ageing: not due / 0–30 / 31–60 / 61–90 / 90+ days past `clientBalanceDueBy` — stacked `Bar stackId`.
  7. DMC payables, next 8 weeks by `dmcPayBy` — stacked.
  8. Enquiries → Bookings per month — `ComposedChart`. Enquiries are counted by IST `createdAt` month; converted = those of that cohort with `status == 'converted'` (conversion rate).
- **Chart styling**:
  - Bars use `--adm-chart-1`; the line and the emphasised series use `--color-teal`. Horizontal grid only, no axis lines.
  - Colours are passed as `fill="var(--token)"`. Don't rely on colour alone.
- **Chart behaviour**:
  - Keep the default `accessibilityLayer` (focusable; ←/→ moves the tooltip).
  - Leave `isAnimationActive` at its default `'auto'` (honours reduced motion); never hard-code `true`.
  - `ResponsiveContainer width="100%"`.
- **Chart accessibility**: each chart has `<figcaption>` + `aria-label` + a **"View as table"** toggle that renders a real `<table>` with `<caption>`. Below 640px, default to the table view if ticks crowd.
- **Tables**:
  - Top Clients: Bookings, Selling Price, Commission, repeat flag.
  - Top DMCs: lines, Net Cost, paid, outstanding.
  - Destinations: Bookings, Selling Price, Commission %.

### Booking detail and New booking (edit in place)

- **Head**:
  - Booking ID + status badge, and a "Client, destination, dates" line.
  - **Status select** top right.
  - Cancelled → red note with date + reason. Travel ended → warn note "Mark Completed?".
  - Breadcrumb "← Bookings" → dashboard table, All time.
- **Layout**: main column (1fr) + a **sticky rail** (16–20rem). Under 60rem the rail moves above the sections and stops sticking.
- **Sections**: Client, Service, Travel, Travellers, Price, Client payments, DMC payments, Notes. Each is a panel with its own **Edit** button.
  - **Service** sits right after Client, one panel (section key `service`, title "Service"): Category select; Trip scope (Package only, required); Division shown read-only; then either the single service's fields inline (non-Package, with **Add more service**, which converts to Package) or the line cards (Package, with **Add service line**). Save writes category, tripScope and lines together in one transaction (`saveServiceSection`), which also clears payment tags that point at deleted lines or lines whose DMC changed.
  - **Travel** (destination, dates, itinerary): travel Categories only (Package, Hotel, Flight, Train, Bus), hidden behind **Add travel details** (`hasTravel`); removable again. Not shown for Visa/Passport; picking Visa/Passport turns Travel off, and the Service save clears any saved travel details in the same write.
  - **Travellers** (pax + names): its own section on every Category, all optional.
  - **Edit** swaps the section into its fields with **Save / Cancel**. Save = one `updateDoc` of that section's fields + `updatedAt`. Cancel discards.
  - Several sections may be open at once. The Money rail recomputes live from unsaved values.
- **Read states**:
  - **Client**: link to the Client, city/email, tel + WhatsApp.
  - **Travel**: destination, dates, balance due by.
  - **Travellers**: pax breakdown ("None" at 0), traveller names ("Names not added").
  - **Price**: Selling Price, balance due by.
  - **Service lines** table: Type + description, DMC link, dates or "Whole trip", Confirmation no. or "Missing" (warn), Pay DMC by, Net cost. While Cancelled, adds a DMC charge column and strikes through the net cost. Footer total.
  - **Notes**: itinerary, internal notes, "From enquiry" link.
- **Field sets** (used by section Edit and New booking, in order Client → Service → Travel → Travellers → Price → Notes):
  - **Client**: segmented Existing / New. Existing = type-ahead on name/mobile. New = name + mobile (required), email, city inline; the Client is created in the same write. From an Enquiry: note "Matched existing Client X by mobile" or "A new Client will be created", with fields prefilled.
  - **Travel**: destination, start, end (optional, min = start), itinerary textarea.
  - **Travellers**: adults/children/infants (default 1 adult, 0 allowed), traveller names as chip input (Enter adds).
  - **Price**: Selling Price (₹ input with en-IN grouping) + Client balance due by.
  - **Service lines**: repeatable cards — Type, DMC select (optional, "In-house" when empty) with "+ New DMC…" dialog, Description, Start/End (optional), Net cost, Pay DMC by, Confirmation no., Voucher notes; Visa lines add Visa Type + Country. A new Package starts with one blank card. Deleting a line asks to confirm and warns if payments are tagged to it or that DMC has payments.
  - **Notes**: internal notes.
- **Payment entries** live inline in the Client payments and DMC payments sections:
  - "Add entry" opens a row form: date (default today), DMC (DMC side only; only DMCs on this Booking's lines), Service Line (optional; DMC side lists only that DMC's lines), kind Payment/Refund, mode, reference, note, amount.
  - Entries show their Service Line when tagged; the Service lines table shows per-line received (Client) and paid / still owed (DMC).
  - Each entry is editable (pencil, same inline row) and deletable (with confirm). Each change writes the whole list array.
  - Refund rows show "−₹X" in warn. Footer: "Net received" / "Net paid".
  - DMC "Add entry" is disabled when there are no lines. Payment sections are hidden on New booking until it is saved.
- **Rail — Money**: Selling Price (or Client Cancellation Charge), Net Cost, Commission, Client outstanding ("Refund ₹X" in warn if negative), DMC outstanding ("Due back ₹X" if negative).
- **Rail — Documents card**: see Documents.
- **New booking** (`/admin/bookings/new`):
  - Same page with every section open. The rail shows Money + one **Create booking** button ("Gets UDN-0xx on save"). Status starts at Pending.
  - `?start=` prefills `travelStart`. `?enquiry=` prefills per Enquiry conversion.
  - **Create** is one Firestore transaction: read `counters/booking` → create/bump it → create the Client (if new) → create the Booking with `bookingNo`/`bookingSeq` → update the Enquiry (if converting). On success, navigate to `/admin/bookings/<bookingNo>`. Cancel/leave = nothing written.
- **Validation (in the form)**:
  - Required: Client, Category, sellingPrice ≥ 0 integer. Package: Trip Scope, ≥ 1 line. Other Categories: exactly 1 line.
  - With Travel added: destination, travelStart; travelEnd optional, ≥ travelStart when set. Visa/Passport never have Travel.
  - Travellers: optional on every Category; counts must be whole numbers ≥ 0.
  - Each line needs type, description, netCost ≥ 0 integer; DMC optional; end ≥ start when both are set. Visa lines need Visa Type + Country.
  - Payments need date, kind, mode, amount > 0 integer.
  - Rules don't validate inside arrays, so the form is the only guard for array contents.

### Clients and DMCs

- **Clients list** (`/admin/clients`):
  - Search across name, mobile, email, city.
  - Table: Name (+ email) | Mobile | City | Bookings | Billed | Outstanding.
  - **New client** dialog: name, mobile (unique), email, city, notes.
- **Client page**:
  - Head with tel / WhatsApp / **New booking** (prefilled Client).
  - 3-figure strip: Bookings, Billed, Outstanding (Pending excluded).
  - Bookings table.
  - Details panel with inline Edit/Save.
  - Delete disabled with "Used in N bookings".
- **DMCs list** (`/admin/dmcs`):
  - Search + "Only with money owed" checkbox.
  - Table: DMC | Region | Contact (+ phone) | Bookings | Net cost | You owe ("Due back" if negative) | Next pay by (red if past).
  - **New DMC** dialog: name, contact person, phone, email, region, notes.
- **DMC page**:
  - Head with tel / WhatsApp / Edit.
  - Strip: Bookings | Net cost | You owe (+ next pay-by).
  - Table: Booking | Client + dates | Services | Status | Pay by | Cost | Paid | Outstanding.
  - Payments are recorded on Bookings only.
  - Delete disabled while referenced.

### Enquiries (`/admin/enquiries`)

- **Source**: exactly the website form's `inquiries` docs (name, phone E.164, service id → label from the website service catalogue, message, sourcePage, destination, createdAt, status). Uses a live `onSnapshot`.
- **Enquiry Status**: `new | contacted | converted | closed`.
  - The Admin sets new/contacted/closed manually, in any direction.
  - `converted` is set **only** by conversion and is final.
  - `closed` takes an optional `closeReason`.
- **Filter**: segmented Open (default; new + contacted) | New | Contacted | Converted | Closed | All, with counts, kept in the URL. Also service and date range filters. Search name/phone/destination. Newest first.
- **Rows** (a list, not a table):
  - Name + status badge (new = teal tint, contacted = warn tint, converted = green, closed = grey), phone, service, destination, received date, source page, message.
  - An "Add a note / Admin notes" disclosure that saves on blur.
  - New rows get a teal left rule.
- **Actions**:
  - Call (`tel:`), WhatsApp (wa.me to the enquiry phone with a prefilled greeting). Contact actions don't change status.
  - Mark contacted (new only). Close (optional reason). Reopen (closed → contacted).
  - **Convert** (primary).
  - Delete-as-spam icon with confirm. Not on converted Enquiries.
  - A converted row shows only "View UDN-xxx".
- **Convert** → `/admin/bookings/new?enquiry=<id>`:
  - **Client**: exact E.164 match of the enquiry phone against `clients.mobile` → suggest that Client (Admin confirms or picks another). Otherwise, a new Client prefilled with name + mobile.
  - **Booking prefill**: `destination` ← enquiry destination (opens Travel; for a Visa preset it fills the Visa line's Country instead, and Passport drops it); `internalNotes` ← "From enquiry <date>: <service label> — <message>"; status Pending; `enquiryId` set.
  - **Category preset** from the enquiry service: international-domestic-tours → Package; hotel-booking → Hotel; flight-train-tickets → Flight; visa-services, visitor-business-visa → Visa (Visa Type left to the Admin); passport-services → Passport; others → none.
  - **On save** (same Create transaction): Enquiry → `status: 'converted'`, `clientId`, `bookingId`, `convertedAt`, `updatedAt`.
  - One Enquiry → at most one Booking. Any service may convert.
- The Privacy page doesn't change.

### Documents: Invoice and Voucher PDFs

**Rendering** (`src/admin/pdf/`, lazy):

- `@react-pdf/renderer` JSX templates, A4. Inter body 9pt, Manrope headings, white page.
- **Static TTFs** bundled with the PDF chunk: Inter Regular/SemiBold (opsz 14), Manrope SemiBold/Bold. These are not the fontsource variable WOFF2 files, which react-pdf can't use. Both fonts contain `₹`.
- No hyphenation: `Font.registerHyphenationCallback(w => [w])`.
- UPI QR via `qrcode` → PNG data URL.
- Template code to port: `VariantA` + Included services / cancelled strike-through from `VariantC` on branch `prototype/invoice-templates` (commit 90a45b6, `src/prototype/invoice/`). `VariantD` + `Timeline` on branch `prototype/voucher-templates` (commit 34c00c4, `src/prototype/voucher/`). Do not merge those branches.

**Invoice** ("Minimal letter" + Included services):

- **Header**: wordmark left. On the right: "Invoice", the invoice number, "Date <invoiceDate>", "Booking UDN-xxx". Thin rule below.
- **Two columns**: "Billed to" (Client name, mobile, email, city; empty hidden) | "From" (Business profile: trading name, address, phones, email, website; filled only).
- **Description**: one priced row, "<Category label> — <destination, or the line description when Travel is skipped>" (Package reads "Holiday package"), with dates + pax under it when known. Amount = Selling Price.
- **Included services**: the Service Lines in order — type, description, dates ("—" if none). **Never prices, never DMC.**
- **Totals** (right, 230pt):
  - Package price. One line per Payment ("Received <date> · <mode>", −amount) and per Refund ("Refunded <date> · <mode>", +amount). A rule.
  - Then the result in bold: **Balance due** (danger red, with "by <clientBalanceDueBy>"), **Paid in full** (action green) or **Refund due to you** (warn amber).
- **Payment details**: only when balance > 0 and bank or UPI is filled. Bank lines + UPI ID on the left. On the right, a UPI QR of `upi://pay?pa=<upiId>&pn=<tradingName>&am=<balance>&tn=<invoiceNo>`, captioned "Scan to pay ₹X".
- **Terms** (small, muted) left; signature image right with "For <trading name>". Each hidden when empty.
- **Footer** (fixed): "Thank you for travelling with <trading name>." + **"This is not a tax invoice."**
- **Cancelled**:
  - Outlined red "CANCELLED" pill by the title.
  - Red sentence: "This booking was cancelled on <date>. The package price of ₹X is replaced by the cancellation charge below."
  - The description row and the totals label become "Cancellation charge". Payments and Refunds are listed; the result is Balance due or Refund due to you.
  - Included services rows are struck through, with the original package price struck through.

**Voucher** ("Minimal letter" + day timeline):

- **Header**: wordmark left. On the right: "Travel voucher", "Booking UDN-xxx", "Issued <today>" (not stored).
- **Three columns**: Guest (name, mobile, "Travellers: …" if names) · Trip (destination, range "18 Dec 2026 – 24 Dec 2026", pax) · Emergency contact (red left border; Business profile emergency contacts, else business phones).
- **"Your bookings" timeline**:
  - Lines with `start`, grouped by start date (sorted; day label left, teal dot + line).
  - Each row: **type** (teal) · description; "until <end>" when end ≠ start; `voucherNotes` small and muted below; confirmation no. right-aligned bold, or amber **"To be confirmed"**.
  - Lines without `start` go in a tinted "Throughout your trip" box after the timeline.
- **Itinerary**: printed as-is, line by line; hidden if empty.
- **Good to know**: voucher standard notes as bullets; hidden if empty.
- **Footer**: "<trading name> · phones · email · website" (filled only).
- **Never** DMC names, costs or payments. No signature, no QR. Allowed with missing confirmations.
- **Disabled when Cancelled**. **Hidden for Immigration Bookings** (Visa, Passport); the Invoice stays for every Category.
- Trip column shows only what is known (destination, range, pax) when Travel is skipped.

**Documents card** (Booking detail rail):

- One row per document (Invoice, Voucher).
- **Prepare** builds the PDF. For the Invoice, the first Prepare runs the invoice-number transaction first.
  - Why a separate step: Web Share needs user activation within ~5 s, and rendering can take longer.
  - The Blob is kept in memory only and discarded on leaving the page. Re-Prepare regenerates from current data.
- **Once prepared**, the row shows the filename + actions:
  - **Share**: only if `navigator.canShare({ files: [file] })`. Calls `navigator.share({ files, title, text })`. `AbortError` is ignored. Other errors → toast "Sharing failed — use Download".
  - **Preview**: Blob URL in a new tab.
  - **Download**: always shown; `<a download>`.
  - **WhatsApp**: `https://wa.me/<E.164 digits without +>?text=<message>`. Text only. Hidden without a Client mobile.
  - **Email**: `mailto:` with subject + body, only if the Client has an email. Text only.
- **Message**: `Hi <Client first name>, please find your <invoice|travel voucher> for booking <UDN-001> attached. — <trading name>`.
- **Email subject**: `Invoice UDAN/2026-27/001 — <trading name>` or `Travel voucher UDN-001 — <trading name>`. Not configurable.
- **Filenames**: `UDAN-Invoice-UDAN_2026-27_001.pdf` (`/` → `_`), `UDAN-Voucher-UDN-001.pdf`.
- **States**:
  - Voucher row disabled "Booking cancelled" while Cancelled. Invoice stays preparable on Cancelled.
  - Render failure → inline row error with Retry.
  - Prepare shows a busy state.
- **No "sent" tracking**: sending writes nothing.

### Settings (`/admin/settings`)

- A left in-page anchor nav (hidden under 60rem).
- **Account**: signed-in email + avatar + Sign out.
- **Business profile** — **one form, one Save** (sticky save bar) across 3 panels:
  - **Business profile**: trading name, address, phones, email, website; signature PNG upload with preview / Replace / Remove. The upload is resized in the browser to ≤ 100 KB and stored as a data URL in `settings/business` (rules cap: 140,000 chars).
  - **Payment details**: account name, account number, IFSC, bank + branch, UPI ID (with a QR hint).
  - **Invoice and voucher text**: invoice terms, emergency contacts, voucher standard notes.
- **Data** card (own buttons, not part of the profile Save):
  - **Download backup** → `udan-backup-YYYY-MM-DD.json` (IST). Built from full reads of `clients`, `dmcs`, `bookings`, `counters`, `settings`, `inquiries`. Shape: `{ format: "udan-admin-backup", version: 1, exportedAt: ISO, projectId, collections: { <name>: { <docId>: data } } }`. Timestamps (`createdAt`, `updatedAt`, `convertedAt`) become ISO 8601 strings. The signature is included as-is. Pretty-printed.
  - Shows "Last backup on this device: <date> / never". The value lives in `localStorage` and feeds the dashboard's Backup overdue item (> 30 days or never).
  - **No in-app restore** (it would fight the rules). The JSON is lossless for a local firebase-admin script if ever needed. The UI copy says so plainly.
  - **Export payments CSV** → `udan-payments-<from>-<to>.csv`.
    - Filters: date range by payment date (presets This FY [default], Last FY, This month, Custom) and Side (Client / DMC / Both [default]).
    - One row per Client Payment / DMC Payment / Refund across all Bookings, including Cancelled.
    - Columns: Date, Booking ID, Booking status, Side, Party (Client or DMC name), Kind, Mode, Reference, Note, Amount (positive), Signed amount (Client payment +, Client refund −, DMC payment −, DMC refund +).
    - Sorted by date asc, then Booking ID.
  - **Export Clients CSV** / **Export DMCs CSV**: all record fields + a Bookings count. No filters.
- **Shared CSV util** `toCsv` (also used by the Bookings table export):
  - UTF-8 with BOM, RFC 4180 quoting, CRLF.
  - IST `YYYY-MM-DD` dates. INR integers without symbol or commas.
  - Formula-injection guard: cells starting with `=`, `+`, `-`, `@`, tab or CR get a `'` prefix.

### Firestore security rules

One `firestore.rules` file shared with the website. **Default deny.** The rules are guardrails against Admin-UI bugs, not an adversary model.

```
function isAdmin() {
  return request.auth != null
    && request.auth.token.firebase.sign_in_provider == 'google.com'
    && request.auth.token.email_verified == true
    && request.auth.token.email.lower()
         in get(/databases/$(database)/documents/config/admins).data.emails;
}
```

- **`config/admins`**: read if `isAdmin()`. Write **always denied**. Other `config/*` ids denied.
- **`clients`, `dmcs`, `bookings`, `counters`, `settings`**: read/write only if `isAdmin()`. Nothing public.
- **Light schema validation** per collection:
  - `keys().hasOnly([...])` allow-list + required keys present.
  - Scalar types: strings; money `int` and `>= 0`; `YYYY-MM-DD` regex for dates; `status` in the enum.
  - `createdAt == request.time` on create; `updatedAt == request.time` on every write.
  - **No validation inside arrays** (`lines`, `clientPayments`, `dmcPayments`, `travellerNames`) beyond `is list`.
- **`bookings`**:
  - `bookingNo`, `bookingSeq` and `createdAt` are immutable.
  - Allows `category`, `tripScope`, `hasTravel`; `category`/`tripScope` in their enums when present. `destination` may be empty and `travelStart`/`travelEnd` absent when `hasTravel == false`; with Travel, `destination` and `travelStart` are required and `travelEnd` optional; when both dates are present, `travelEnd >= travelStart`. A Visa/Passport Booking must have `hasTravel == false`.
  - `invoiceNo`, `invoiceSeq`, `invoiceDate` and `enquiryId` can be **set once** (absent → present), then never changed or removed.
  - **Delete denied.**
- **`clients`, `dmcs`**: Admin may delete. The "in use" check is client-side only.
- **`counters`**:
  - Id matches `booking` or `invoice-\d{4}-\d{2}`. Shape `{ seq: int }`.
  - Create only with `seq == 1`. Update only with `seq == resource.data.seq + 1`. Delete denied.
  - No `getAfter` cross-check; the app's transaction pairs the counter and the Booking.
- **`settings`**:
  - Only the `business` id. Key allow-list of Business profile fields, all optional strings.
  - `signature.size() <= 140000` and it starts with `data:image/png;base64,`. Delete denied.
- **`inquiries`**:
  - Public `create` unchanged from the website spec.
  - `read` if `isAdmin()`.
  - `delete` if `isAdmin()` and `resource.data.status != 'converted'`.
  - `update` if `isAdmin()` and `affectedKeys().hasOnly(['status','adminNotes','closeReason','clientId','bookingId','convertedAt','updatedAt'])`; `status` is one of the 4 values; `converted` requires `bookingId`; once `converted`, status can't change.
- `firestore.indexes.json` stays empty. Everything is filtered in the browser.
- Each rules check costs 1 extra read for the `config/admins` `get()`, shared within a request or batch. That is negligible on Spark.

### Modules (deep modules, tested through their public surface)

- `src/admin/model/` — **pure**, no Firestore. Money (per Booking, per DMC, counting rules), flags, month/FY helpers (IST), dashboard aggregations (stats, Needs attention, table filter/search/sort, Insights series), Booking/Invoice number formatting, filenames and the share message.
- `src/admin/data/` — Firestore access behind one interface, taking a `Firestore` instance (emulator in tests):
  - `AdminDataProvider` (snapshots of the 4 collections).
  - `createBooking(draft, { newClient?, enquiryId? })` → transaction.
  - `allocateInvoiceNo(bookingId)` → transaction.
  - `saveBookingSection(id, patch)`, `setStatus`, `cancelBooking`, `uncancelBooking`.
  - Payment entry CRUD.
  - Client/DMC CRUD; Enquiry updates.
  - `getBusinessProfile` / `saveBusinessProfile` (with seeding).
  - Errors are mapped to `permission-denied | network | conflict | unknown`.
- `src/admin/auth/` — `useAdminSession`, sign-in/out, allow-list check, `permission-denied` handler.
- `src/admin/pdf/` — templates + `prepareInvoice(booking, data)` / `prepareVoucher(…)` → `File`.
- `src/admin/export/` — `toCsv`, bookings CSV rows, ledger rows, Clients/DMCs rows, backup serialiser.
- `src/admin/ui/` — screens and components.

## Testing Decisions

**What makes a good test**: as in the website spec, exercise behaviour through the public surface: rendered screen, user action, stored document, rules decision, generated file content. Never assert on internals or how the SDK is called.

**Seam 1 — pure model unit tests** (Vitest, node):

- Money rules for non-cancelled and Cancelled Bookings: per-DMC outstanding, negative outstanding ("refund owed" / "due back"), deleted line with payments.
- Counting-rules table (Pending excluded, Cancelled via charges, Cancellation rate).
- Flags (overdue, due in 7 days, travel ended) around IST midnight.
- FY derivation (31 Mar / 1 Apr IST). `UDN-` / `UDAN/FY/` formatting incl. ≥ 1000. Filename `/` → `_`.
- Table search/filter/sort and footer totals. Insights series (month basis = Booking date, ageing buckets, enquiry cohort conversion).

**Seam 2 — Firestore rules** (extends the website's Seam 2: Vitest node, `@firebase/rules-unit-testing`, `firebase emulators:exec`):

- **Setup**: seed `config/admins` via `withSecurityRulesDisabled`. Contexts via `authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } })`.
- **Auth**:
  - Allowed email → allowed. Mixed-case email matches. Email not listed → denied.
  - `email_verified: false` → denied. `sign_in_provider: 'password'` with a listed email → denied.
  - Unauthenticated → denied on every admin collection and on admin ops on `inquiries`.
  - Any write to `config/admins` → denied, even by an Admin. Other `config/*` ids → denied.
- **Schema**:
  - Admin can create/read/update a valid doc in each collection.
  - Rejected: an unknown top-level key, a wrong type, negative money, a bad status, a bad date format, a missing `updatedAt == request.time`.
- **Bookings**: delete denied. `bookingNo` change denied. `invoiceNo` set once OK; change or removal denied. `enquiryId` set-once.
- **Counters**: create `seq: 1` OK, `+1` OK, `+2` / decrement denied, bad id denied.
- **Settings**: oversize or non-PNG signature denied. Other `settings/*` id denied.
- **Inquiries**:
  - Admin update limited to the allowed keys. `converted` needs `bookingId`. `converted` is final.
  - Converted can't be deleted; non-converted can.
  - The public create cases from the website spec still pass.

**Seam 3 — data module against the emulator**:

- `createBooking` allocates `UDN-001`, `UDN-002` sequentially and creates Client + Booking + Enquiry update atomically (a failed rule → nothing written).
- `allocateInvoiceNo` gives `UDAN/2026-27/001` and is idempotent on a second call (same number and date). A new FY counter restarts at 001.
- Cancel / un-cancel writes and clears the right fields.

**Seam 4 — export units**:

- `toCsv`: BOM, quoting, CRLF, injection guard.
- Ledger rows: signs per side/kind, date filter, side filter, sort.
- Backup serialiser: all 6 collections present, Timestamps → ISO, `format`/`version` fields.

**Seam 5 — screen tests** (Testing Library, jsdom, emulator-backed data module) for the core flows:

- New booking → lands on detail.
- Section Edit/Save/Cancel.
- Add/edit/delete payment updates the Money rail.
- Cancel dialog preview + write.
- Enquiry Convert with mobile match.
- Login denied message for a non-listed email.

**PDF content**: unit-test the template **view-models** (what lines, totals, labels and visibility the Invoice/Voucher get for partial / paid / cancelled-refund / cancelled-due / missing-confirmation / empty-profile cases). Assert that the Voucher view-model contains no DMC name and no money. Rendered PDF visuals are checked manually.

**Build check**: the `bundleGuard` plugin fails `npm run build` on a leak, so the build itself is the test.

**Manual acceptance**:

- Load `/` with DevTools Network: no admin, auth, pdf or chart chunks requested.
- `/admin` responses carry `X-Robots-Tag: noindex, nofollow`.
- **Real devices**: on Android Chrome and iOS Safari, Share of a prepared Invoice and Voucher opens WhatsApp with the PDF attached. Desktop Chrome shows Share. Firefox hides Share and Download + WhatsApp work.
- Visual check of the PDFs against the prototype branches. The 4 states on each data region. Phone layouts (calendar agenda, table cards, rail above sections).

## Out of Scope

- Staff roles / per-user permissions — all allow-listed Admins are equal.
- Allow-list editing in the app — Firebase console only.
- GST / tax invoices, PAN, credit notes, invoice revisions — UDAN is not GST-registered.
- Multi-currency — INR only.
- Expense tracking / net profit after expenses — Commission is gross only.
- Payment gateway / online Client payments.
- Automatic email/WhatsApp sending, notifications, scheduled jobs or auto status changes (these need Blaze/Cloud Functions).
- In-app Backup restore. The JSON is kept lossless for a local firebase-admin script if ever needed.
- Status history, audit log, "sent" tracking for documents.
- Passport/ID documents or any file uploads beyond the signature image.
- Line-level Booking status or partial-cancellation workflows beyond editing lines.
- Editable document message templates.

## Further Notes

- **Map and decision records**: `.scratch/admin-bms/map.md` and its tickets in `.scratch/admin-bms/issues/` hold the reasoning behind every decision here. Research: `.scratch/admin-bms/research/chart-library.md` and `.scratch/admin-bms/research/client-side-pdf.md` (branch `research/client-side-pdf`).
- **Build order suggestion**:
  1. Website phase 2 (prerequisite).
  2. Rules + auth + shell + bundle guard.
  3. Data model + Booking detail/New booking + Clients/DMCs.
  4. Overview dashboard.
  5. Documents (PDF).
  6. Enquiries + conversion.
  7. Insights.
  8. Settings Data card.
- **Console setup checklist** for UDAN:
  - Enable the Google provider; disable Email/Password.
  - Authorized domains.
  - Create `config/admins` with the owner's lowercase Gmail.
  - Deploy `firestore.rules`.
  - Fill the Business profile (email, website, bank/UPI, terms, signature) in Settings before sending the first Invoice.
- **Fonts**: static TTFs for the PDF only (in the lazy PDF chunk). The site keeps its fontsource variable fonts.
- **Glossary**: `GLOSSARY.md` is the vocabulary source. Keep "Enquiry" in UI copy even though the collection is `inquiries` (website spec name).
