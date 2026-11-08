# A single-service Booking holds exactly one Service Line

Every Booking Category except Package (Visa, Passport, Hotel, Flight, Train, Bus) still stores its service as one Service Line in `lines`, even though the form shows that line's fields inline and never shows a Service lines list. We chose this over putting DMC and Net Cost fields on the Booking itself, so there is one money path: Net Cost, Commission, per-DMC outstanding, payments, cancellation charges, Invoice and Voucher all keep reading `lines`. "Add more service" then only appends a second line and sets the Category to Package, with no data moved.

## Consequences

- Validation must enforce exactly one line for non-Package Categories and at least one for Package.
- Code must not treat "has a Service lines list on screen" as "has Service Lines"; every Booking has them.
