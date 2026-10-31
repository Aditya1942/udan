import { describe, expect, it } from 'vitest';
import {
  buildEnquiryMessage,
  getCallHref,
  getDirectionsHref,
  getEnquireHref,
  getWhatsAppHref,
} from './contactActions';

describe('getCallHref', () => {
  it('dials the business number in E.164', () => {
    expect(getCallHref()).toBe('tel:+919687232015');
  });
});

describe('getWhatsAppHref', () => {
  it('opens a chat with the business number', () => {
    expect(getWhatsAppHref()).toBe('https://wa.me/919687232015');
  });

  it('prefills URL-encoded text when given', () => {
    expect(getWhatsAppHref("Hi UDAN, I'd like to enquire about Visa Services (Dubai) & more")).toBe(
      'https://wa.me/919687232015?text=' +
        encodeURIComponent("Hi UDAN, I'd like to enquire about Visa Services (Dubai) & more"),
    );
  });

  it('ignores blank text', () => {
    expect(getWhatsAppHref('   ')).toBe('https://wa.me/919687232015');
  });
});

describe('getDirectionsHref', () => {
  it('opens Google Maps directions to the full office address', () => {
    const url = new URL(getDirectionsHref());
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('destination')).toBe(
      'UGF-12, Meghdeep Shopping Center, Opp. Prakash Highschool, Near Sandesh Press, Bodakdev, Ahmedabad, Gujarat, India',
    );
  });

  it('encodes the address (no raw spaces or commas)', () => {
    expect(getDirectionsHref()).not.toMatch(/[ ,]/);
  });
});

describe('getEnquireHref', () => {
  it('links to the contact enquiry section with the service preselected', () => {
    expect(getEnquireHref({ service: 'visa-services' })).toBe(
      '/contact?service=visa-services#enquiry',
    );
  });

  it('adds an encoded destination when given', () => {
    expect(
      getEnquireHref({ service: 'international-domestic-tours', destination: 'Kerala & Goa' }),
    ).toBe('/contact?service=international-domestic-tours&destination=Kerala+%26+Goa#enquiry');
  });

  it('works with no arguments', () => {
    expect(getEnquireHref()).toBe('/contact#enquiry');
  });
});

describe('buildEnquiryMessage', () => {
  it('mentions the service and destination', () => {
    expect(buildEnquiryMessage({ service: 'visa-services', destination: 'Dubai' })).toBe(
      "Hi UDAN, I'd like to enquire about Visa Services (Dubai)",
    );
  });

  it('mentions only the service when there is no destination', () => {
    expect(buildEnquiryMessage({ service: 'hotel-booking' })).toBe(
      "Hi UDAN, I'd like to enquire about Hotel Booking",
    );
  });

  it('mentions only the destination when there is no service', () => {
    expect(buildEnquiryMessage({ destination: 'Bali' })).toBe(
      "Hi UDAN, I'd like to enquire about Bali",
    );
  });

  it('falls back to a general greeting', () => {
    expect(buildEnquiryMessage()).toBe("Hi UDAN, I'd like to make an enquiry");
    expect(buildEnquiryMessage({ service: 'other' })).toBe("Hi UDAN, I'd like to make an enquiry");
  });
});
