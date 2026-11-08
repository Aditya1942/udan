import { useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useAdminData } from '../data';
import { enquiryConversion, isISODate } from '../model';
import { ButtonLink, EmptyState, ErrorState, LoadingState, Note, PageHeader, useAdminTitle } from '../ui';
import { BOOKINGS_BACK, NewBooking } from './booking/BookingPage';
import { blankForm } from './booking/form';

/** `/admin/bookings/new` (`?start=YYYY-MM-DD` from a calendar day, `?enquiry=<id>` from Convert, `?client=<id>` from a Client page). */
export function NewBookingScreen() {
  const [params] = useSearchParams();
  useAdminTitle('New booking');
  const { clients, dmcs, bookings, enquiries, retry } = useAdminData();
  const startParam = params.get('start');
  const start = isISODate(startParam) ? startParam : undefined;
  const enquiryId = params.get('enquiry') || undefined;
  // Once the form is showing, our own Create flips the Enquiry to converted just before we navigate away:
  // keep the form mounted instead of swapping to "already converted".
  const formShown = useRef<string | null>(null);

  const needed = [
    { name: 'clients' as const, state: clients },
    { name: 'dmcs' as const, state: dmcs },
    { name: 'bookings' as const, state: bookings },
    ...(enquiryId ? [{ name: 'enquiries' as const, state: enquiries }] : []),
  ];
  const failed = needed.find((n) => n.state.status === 'error');
  const header = <PageHeader title="New booking" back={BOOKINGS_BACK} />;
  if (failed) {
    return (
      <>
        {header}
        <ErrorState title={`Couldn't load ${failed.name}`} error={failed.state.error} onRetry={() => retry(failed.name)} />
      </>
    );
  }
  if (needed.some((n) => n.state.status === 'loading')) {
    return (
      <>
        {header}
        <LoadingState lines={8} label="Loading booking form" />
      </>
    );
  }

  if (enquiryId) {
    const enquiry = enquiries.data.find((e) => e.id === enquiryId);
    if (!enquiry) {
      return (
        <>
          {header}
          <EmptyState title="Enquiry not found" action={<ButtonLink to="/admin/enquiries">Back to Enquiries</ButtonLink>}>
            It may have been deleted. Start a booking without it, or pick another Enquiry.
          </EmptyState>
        </>
      );
    }
    if (enquiry.status === 'converted' && formShown.current !== enquiryId) {
      const booking = bookings.data.find((b) => b.id === enquiry.bookingId);
      return (
        <>
          {header}
          <div className="adm-stack">
            <Note>This Enquiry was already converted.</Note>
            {booking ? <ButtonLink to={`/admin/bookings/${booking.bookingNo}`}>View {booking.bookingNo}</ButtonLink> : null}
          </div>
        </>
      );
    }
    formShown.current = enquiryId;
    const conversion = enquiryConversion(enquiry, clients.data);
    return (
      <NewBooking
        key={enquiryId}
        initial={blankForm({ start, conversion })}
        conversion={{ enquiryId, mobile: enquiry.phone, matchedClient: conversion.matchedClient }}
      />
    );
  }
  const clientParam = params.get('client');
  const clientId = clientParam && clients.data.some((c) => c.id === clientParam) ? clientParam : undefined;
  return <NewBooking key={`${start ?? 'blank'}:${clientId ?? ''}`} initial={blankForm({ start, clientId })} />;
}
