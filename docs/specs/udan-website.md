---
title: UDAN Immigration & Tours website with Firestore-backed enquiries
status: ready-for-agent
labels: [ready-for-agent]
created: 2026-10-24
---

## Problem Statement

UDAN Immigration & Tours (Bodakdev, Ahmedabad) has no website. Prospective customers looking for tours, visa guidance, passport help, tickets, hotels, travel insurance or currency exchange cannot find UDAN online, see what it offers, or reach it easily — especially from their phones. When they do want to get in touch, the only route is calling Dolly Shah directly, and the business has no record of enquiries that arrive outside of phone calls.

## Solution

A premium, minimalist, mobile-first marketing website for UDAN that:

- Introduces the brand using the visiting-card identity (logo, UDAN Green, Lime Green, Sky Blue, Deep Teal).
- Presents travel services and visa-related services as two clearly separated areas.
- Makes calling, WhatsApp and directions one tap away on every page.
- Offers a short enquiry form (name, phone, service of interest, message). Every submitted enquiry is stored in Firebase Cloud Firestore so UDAN has a durable record to follow up from.
- Shows only verified business information. No invented prices, packages, stats, testimonials, credentials or promises about visa outcomes.

Pages: Home, Tours & Packages, Visa Services, Other Services, About Us, Contact, plus a Privacy page linked from the footer and the form.

## User Stories

### Discovery and brand

1. As a prospective traveller, I want to see the UDAN name and original logo straight away, so that I know I'm on the official business's site.
2. As a prospective traveller, I want a photography-led hero that says "Your Journey Begins with UDAN.", so that I immediately get that this is a travel business.
3. As a visitor, I want two clear hero actions ("Explore Tours" and "Explore Visa Services"), so that I can go straight to the area I care about.
4. As a visitor, I want the hero text to be readable on its background, so that I don't have to strain to read the main message.
5. As a visitor, I want a "Everything You Need for Your Next Journey" overview with four service cards, so that I can see everything UDAN offers at a glance.
6. As a visitor, I want each service card to have an icon, heading, short description and "Learn more" link, so that I can scan quickly and go deeper when I want to.
7. As a visitor, I want travel services and visa services to look visibly different from each other, so that I don't confuse holiday planning with document guidance.

### Tours

8. As a holiday planner, I want a "Discover Your Next Destination" gallery of destination cards, so that I get ideas for where to go.
9. As a holiday planner, I want each destination card to show a photo, the destination name and a short phrase, so that I can judge my interest quickly.
10. As a holiday planner, I want to tell international destinations apart from domestic ones, so that I can browse the kind of trip I'm planning.
11. As a holiday planner, I want an "Enquire Now" action on each destination, so that I can ask UDAN about that place without retyping it.
12. As a holiday planner, I want the enquiry form to already have tours selected and the destination mentioned when I come from a destination card, so that my enquiry has context.
13. As a visitor, I want no made-up prices, itineraries or offers, so that I can trust what I'm reading.
14. As a holiday planner, I want a dedicated Tours & Packages page with travel categories and bigger photography, so that I can browse more than the homepage shows.

### Visa and passport

15. As someone planning to go abroad, I want a "Guidance for Your Next Step Abroad" section covering visa services, visitor and business visitor visas, and passport services, so that I know UDAN can help with documents.
16. As a visa enquirer, I want each visa-related service to have a short description and an enquiry action, so that I know what to do next.
17. As a visa enquirer, I want honest wording that never promises approval, so that my expectations are realistic.
18. As a visa enquirer, I want a dedicated Visa Services page with clear information blocks, so that I can read about each service separately.
19. As a visa enquirer, I want the form to arrive with the right visa service selected when I click a visa enquiry action, so that I have less to fill in.

### Other services

20. As a traveller, I want a compact section listing hotel booking, flight and train tickets, travel insurance and currency exchange, so that I know I can sort everything in one place.
21. As a traveller, I want an Other Services page that groups hotels, tickets, insurance, passport services and currency exchange into clear categories, so that I can find a specific service quickly.

### Trust and process

22. As a cautious customer, I want a "Why choose UDAN" section with honest value points (many services in one place, easy contact, simple enquiry process, planning support), so that I can trust the business without being sold to.
23. As a first-time customer, I want a simple three-step "How to get started" guide, so that I know what happens after I get in touch.
24. As a visitor, I want an About Us page with UDAN's verified identity and range of services, so that I can learn who I'm dealing with.

### Contact actions

25. As a mobile visitor, I want a "Call Us" button that dials +91 96872 32015, so that I can call with one tap.
26. As a mobile visitor, I want a "WhatsApp Us" button that opens a chat with the same number, so that I can message instead of calling.
27. As a visitor, I want a "Get Directions" button that opens the business address in a maps app, so that I can find the office.
28. As a visitor, I want to see the contact person (Dolly Shah), phone number and full address, so that I know who to contact and where to go.
29. As a visitor on any page, I want a green "Contact Us" call to action in the header, so that I can always reach the contact options.
30. As a visitor, I want the phone number and address in the footer, so that I can find them from anywhere on the site.

### Enquiry form

31. As an enquirer, I want a short form with clearly labelled name, phone number, service of interest and message fields, so that sending an enquiry is quick.
32. As an enquirer, I want the service of interest to be a dropdown of UDAN's actual services, so that I pick from what's really on offer.
33. As an enquirer, I want an "Other / not sure" option in the dropdown, so that I can still send an enquiry if my need doesn't fit a category.
34. As an enquirer, I want clear inline errors when a required field is empty or my phone number is invalid, so that I can fix it before submitting.
35. As an enquirer, I want the phone field to accept common Indian formats (with or without +91, spaces or dashes), so that I'm not rejected for formatting.
36. As an enquirer, I want the submit button to show progress and be disabled while sending, so that I don't send the same enquiry twice.
37. As an enquirer, I want a clear success message after submitting, so that I know UDAN received my enquiry.
38. As an enquirer, I want a clear error message offering the call and WhatsApp options if submission fails, so that I can still reach UDAN.
39. As an enquirer, I want my typed details kept if submission fails, so that I don't have to type them again.
40. As an enquirer, I want a short privacy note next to the form that links to the Privacy page, so that I know how my details will be used.
41. As an enquirer, I want the form available on both the homepage contact section and the Contact page, so that I can enquire wherever I am.

### Business owner (UDAN)

42. As the UDAN owner, I want every submitted enquiry stored in Firestore with name, phone, service, message, source page and submission time, so that I have a reliable record to follow up from.
43. As the UDAN owner, I want each enquiry to start with status "new", so that I can tell which ones still need a reply.
44. As the UDAN owner, I want to view enquiries in the Firebase console, so that I don't need a custom admin tool on day one.
45. As the UDAN owner, I want the public to be unable to read, edit or delete stored enquiries, so that customers' personal details stay private.
46. As the UDAN owner, I want malformed or oversized submissions rejected by the database, so that spam and junk can't pile up.
47. As the UDAN owner, I want basic spam protection on the form, so that my enquiry list isn't flooded by bots.
48. As the UDAN owner, I want to know which page or destination an enquiry came from, so that I can understand customer interest.

### Navigation, accessibility, responsiveness

49. As a mobile visitor, I want a compact header with an accessible menu toggle, so that navigation works on small screens.
50. As a visitor, I want the current page highlighted in the navigation (not by colour alone), so that I know where I am.
51. As a keyboard user, I want visible focus states on every interactive element and a skip-to-content link, so that I can use the site without a mouse.
52. As a screen-reader user, I want form errors and the success message announced, so that I know how my submission went.
53. As a screen-reader user, I want meaningful alt text on photos and a labelled logo, so that I understand the content.
54. As a visitor with low vision, I want text contrast that meets WCAG AA, so that I can read everything.
55. As a visitor who prefers reduced motion, I want animations turned off, so that the site is comfortable to use.
56. As a tablet visitor, I want grids that reflow without feeling cramped, so that reading stays comfortable.
57. As a mobile visitor, I want full-width calls to action and large touch targets, so that I can tap accurately.
58. As a visitor on a slow connection, I want images that are optimised and lazy-loaded below the fold, so that pages load fast.
59. As a visitor who shares a page link, I want each page to have its own title and description, so that the link previews properly and search engines index it.
60. As a visitor following a direct link to an inner page, I want that page to load, not a 404, so that shared links work.

## Implementation Decisions

**Stack (existing scaffold):** Vite + React 19 + TypeScript, `firebase` v12 web SDK already installed, with Firebase config read from `VITE_FIREBASE_*` environment variables (template already in the repo).

**Routing:** Client-side routing across Home, Tours & Packages, Visa Services, Other Services, About Us, Contact and Privacy. Add a lightweight router dependency. Hosting needs a rewrite so every route serves the SPA shell.

**Hosting:** Firebase Hosting (same project as Firestore), with SPA rewrites configured. Firestore rules and indexes live in the repo and are deployed from there.

**Styling:** Plain CSS with design tokens as custom properties: brand colours (#57931E, #7FB61C, #29A9CA, #165D79), neutrals (#FFFFFF, #F7F8F5, #F0F3EE, #253238, #68757A, #E1E7E2), a spacing scale, one restrained radius, and a type scale. One font pair: Manrope for headings, Inter for body. No CSS framework.

**Icons:** A single line-icon library, used consistently everywhere.

**Content as data:** All business facts (name, contact person, phone, address, services, destinations) live in one typed business-content module. Pages, the footer, the form's service dropdown and the contact actions all read from it, so facts are never duplicated or made up. Destinations hold only a name, a phrase, an image, alt text and a region (international or domestic). They have no price or itinerary fields.

**Service catalogue:** A fixed list of service IDs used by the form dropdown, by prefilling and by the Firestore rules allow-list:
`international-domestic-tours`, `hotel-booking`, `flight-train-tickets`, `travel-insurance`, `visa-services`, `visitor-business-visa`, `passport-services`, `currency-exchange`, `other`.

**Contact actions module:** Builds the `tel:`, WhatsApp (`https://wa.me/919687232015`, with optional prefilled text) and Google Maps directions URLs from the business-content module.

**Enquiry module (deep module, single entry point):** `submitInquiry(input) → Promise<{ ok: true, id } | { ok: false, reason: 'validation' | 'network' | 'rejected', fieldErrors? }>`.

- Validates and normalises input on the client:
  - name: trimmed, 2–100 characters
  - phone: normalised to E.164 (`+91XXXXXXXXXX`) for Indian mobiles; anything else rejected
  - service: must be in the catalogue
  - message: trimmed, max 2000 characters, optional
- Writes the document to Firestore and maps SDK errors to the reasons above.
- Uses a Firestore instance passed in, so tests can point it at the emulator.

**Firestore schema:** collection `inquiries`, documents with auto-generated IDs:

```ts
type Inquiry = {
  name: string;            // 2–100 chars
  phone: string;           // E.164, e.g. "+919687232015"
  service: ServiceId;      // catalogue allow-list
  message: string;         // 0–2000 chars
  sourcePage: string;      // route path, ≤ 100 chars
  destination: string | null; // set when enquiring from a destination card, ≤ 100 chars
  status: 'new';           // only value allowed on create
  createdAt: Timestamp;    // serverTimestamp(); rules enforce == request.time
};
```

**Security rules:**

- `inquiries`: `create` is allowed only if the keys are exactly the schema keys, types and lengths match, `service` is in the allow-list, `status == 'new'` and `createdAt == request.time`.
- `read`, `update` and `delete` are denied to clients. UDAN reads enquiries in the Firebase console.
- Every other path is denied.

**Spam protection:** A hidden honeypot field in the form. If it's filled, the form reports success without writing anything. Firebase App Check with reCAPTCHA Enterprise is used if the site key is configured, and the code runs without it in development and on the emulator.

**Enquiry form component:** One component, reused on Home and Contact. It accepts optional `defaultService` and `destination` (prefilled from query parameters such as `?service=visa-services&destination=Dubai`, set by "Enquire" actions that link to the contact section) and a `sourcePage`. States: idle → submitting → success | error. On error, the user's input is kept and Call and WhatsApp fallbacks are shown. Form status is announced through a live region.

**No backend functions** in v1. The browser writes directly to Firestore. Email or WhatsApp notifications to UDAN are deferred (see Out of Scope).

**SEO:** Each route has its own title and meta description. LocalBusiness JSON-LD uses only verified facts (name, phone, address).

**Logo:** Use the original visiting-card logo asset, with its proportions preserved and an SVG version if possible. If no clean asset exists, flag it as a blocker. Don't redraw it.

**Imagery:** Licensed, authentic destination photography (e.g. Unsplash licence), served optimised in responsive sizes with lazy loading below the fold.

## Testing Decisions

**What makes a good test:** It exercises behaviour through the public surface a user or the database sees: rendered form, typed input, submitted result, stored document, rules decision. It doesn't assert on internal state, component structure or how the SDK is called. Tests should survive a refactor of the enquiry internals.

**Seam 1: Enquiry form against the Firestore emulator.** Render the enquiry form with Testing Library, wired to a Firestore instance connected to the local emulator. Interact as a user would. Cover:
- the happy path: fill the fields, submit, see the success message, and find one document in `inquiries` with normalised phone, `status: 'new'` and a server timestamp
- required-field and invalid-phone errors shown, with nothing written
- phone format normalisation
- prefill from `defaultService` and `destination`
- the honeypot showing success while writing nothing
- the submit button disabled while a submission is in flight
- an error state (e.g. emulator stopped or a rejected write) that keeps input and shows the Call and WhatsApp fallbacks

**Seam 2: Firestore security rules against the emulator** (using the Firebase rules unit-testing library). Assert that an unauthenticated client:
- can create a valid enquiry
- cannot create one with extra keys, wrong types, oversized fields, an unknown service, a status other than `new`, or a client-supplied `createdAt`
- cannot read, list, update or delete enquiries
- cannot touch any other collection

**Tooling:** Vitest with jsdom and Testing Library for Seam 1, Vitest in node for Seam 2. Firebase Emulator Suite (Firestore) started around the test run via `firebase emulators:exec`. A single `test` script runs both.

**Prior art:** None. The repo is a fresh scaffold with no existing tests. These tests set the pattern.

**Not tested automatically:** Visual design, static page content and responsive layout are checked manually or with a preview pass against the brief.

## Out of Scope

- An admin dashboard or authenticated staff area for managing enquiries (the Firebase console is used instead).
- Email, SMS or WhatsApp notifications to UDAN when an enquiry arrives (a likely follow-up using a Firestore-triggered Cloud Function).
- Package pricing, itineraries, availability, booking or payments.
- Visa eligibility checkers or document checklists presented as official guidance.
- Testimonials, reviews, statistics, awards, certifications or partner logos.
- Email address, social profiles or opening hours (not on the visiting card).
- Multi-language (Gujarati or Hindi) content.
- A blog or CMS. Content changes are code changes in the business-content module.
- Analytics and cookie-consent tooling beyond what the Privacy page describes.

## Further Notes

- **Source of truth:** the visiting card, for name, logo, contact person (Dolly Shah), phone (+91 96872 32015), address (UGF-12, Meghdeep Shopping Center, Opp. Prakash Highschool, Near Sandesh Press, Bodakdev, Ahmedabad, Gujarat, India), services and colours.
- **Colour use:** UDAN Green is the main action colour (one primary call to action per section). Deep Teal handles hierarchy, the nav, the footer surface and secondary buttons. Sky Blue and Lime Green are sparing accents. Check white text on #57931E for AA. If it falls short at body size, darken the button shade slightly or use large/bold button text.
- **Privacy:** Enquiries hold personal data (name and phone). The Privacy page must say what's collected, why (to reply to the enquiry), where it's stored (Google Firebase) and how to ask for deletion (by phone). UDAN should confirm the wording.
- **Open items for UDAN:**
  - a clean logo file
  - the chosen destination list and photos
  - which Firebase project and region to use (prefer `asia-south1`, Mumbai)
  - who has console access to read enquiries
