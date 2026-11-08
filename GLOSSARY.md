# UDAN Immigration & Tours

UDAN sells tours and visa/travel services to customers, fulfilling packages through third-party suppliers. This glossary covers the public website's enquiries and the admin booking management system.

## People and parties

**Admin**:
A person who signs in to `/admin` with a Google account whose email is on the admin allow-list. All Admins have equal access; there are no roles.
_Avoid_: User, staff, operator

**Customer**:
A person who buys a package from UDAN; a reusable record shared across their bookings. Holds name and mobile, plus optional WhatsApp, email, address, city, state, country, emergency contact, GST number and PAN.
_Avoid_: Client (still the name in code and storage: `clients` collection, `clientId`), traveller, guest

**DMC**:
A domestic or international supplier (Destination Management Company) that UDAN forwards a booking to; a reusable directory record.
_Avoid_: Supplier, vendor, agent

## Bookings

**Booking**:
One sale to a Customer, identified by a sequential Booking ID (e.g. `UDN-001`) that is never reused, linking the Customer side and DMC side. Cancelled, never deleted.
_Avoid_: Order, trip, reservation

**Booking Status**:
Where a Booking stands, set by the Admin: Pending (quoted, not yet committed), Confirmed (Customer committed and DMCs booked), Voucher Received (DMC confirmation numbers in hand), Completed (travelled) or Cancelled. Never changes on its own.

**Cancellation Charge**:
On a Cancelled Booking, the amount UDAN keeps from the Customer, or that a DMC keeps from UDAN for one Service Line; replaces Selling Price and Net Cost while the Booking stays Cancelled.
_Avoid_: Cancellation fee, penalty

**Service Line**:
One service within a Booking (hotel, transfer, flight, sightseeing, visa, package or other), fulfilled by one DMC at its own Net Cost; a Booking's Net Cost is the sum of its Service Lines.
_Avoid_: Item, component, leg

**Selling Price**:
The total the Customer pays UDAN for a Booking.
_Avoid_: Package price, sale amount

**Net Cost**:
The total UDAN owes its DMCs for a Booking — the sum of its Service Lines' Net Cost.
_Avoid_: DMC cost, purchase price

**Commission**:
Selling Price minus Net Cost — UDAN's gross profit on a Booking, before expenses and taxes. Never shown to the Customer.
_Avoid_: Margin, profit, markup

**Customer Payment**:
One amount received from the Customer against a Booking, or a Refund paid back to them; outstanding is Selling Price (or Cancellation Charge) minus payments net of refunds.

**DMC Payment**:
One amount paid by UDAN to a DMC against a Booking, or a Refund received back from them; outstanding is tracked per DMC as that DMC's Service Lines' Net Cost (or Cancellation Charges) minus its payments net of refunds.

**Refund**:
Money returned after it was paid — to the Customer by UDAN, or to UDAN by a DMC; recorded alongside payments, never as a negative payment.

## Documents

**Invoice**:
A UDAN-branded PDF sent to the Customer showing a single total and payments; at most one per Booking, numbered in a per-financial-year series (e.g. `UDAN/2026-27/001`) when first generated, and re-generated under the same number to reflect current payments. Not a GST tax invoice.
_Avoid_: Bill, receipt

**Voucher**:
A UDAN-branded PDF the Customer carries while travelling, showing services, dates and confirmation numbers but never the DMC's name or any costs.

**Enquiry**:
A lead submitted through the public website form; may be converted into a Booking.
_Avoid_: Inquiry, lead

**Enquiry Status**:
Where an Enquiry stands: New (not yet replied to), Contacted (Admin has reached out), Converted (became a Booking; final) or Closed (not pursued). Set by the Admin, except Converted, which only conversion sets.

## Records

**Backup**:
A downloaded file holding a complete copy of all admin data at one moment, taken manually by the Admin; the safety net if data is lost.
_Avoid_: export (for the full copy)

**Payments Ledger**:
Every Customer Payment, DMC Payment and Refund across all Bookings, listed by date; exported for accounting.
