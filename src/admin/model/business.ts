/** Business profile defaults (seeding `settings/business`) and normalisation. */
import { business } from '../../content/business';
import { BUSINESS_PROFILE_FIELDS, SIGNATURE_MAX_CHARS, SIGNATURE_PREFIX, type BusinessProfile } from './types';

/** Seed for a missing `settings/business`: trading name, address, phone. Email and website stay empty. */
export function defaultBusinessProfile(): BusinessProfile {
  const a = business.address;
  return {
    tradingName: business.name,
    address: [a.line1, a.line2, `${a.locality}, ${a.city}`, `${a.region} ${a.postalCode}`, a.country].join('\n'),
    phones: business.phone.display,
  };
}

/** Trims every field and drops empty ones (documents print only filled fields). */
export function normaliseBusinessProfile(profile: BusinessProfile): BusinessProfile {
  const out: BusinessProfile = {};
  for (const key of BUSINESS_PROFILE_FIELDS) {
    const value = profile[key]?.trim();
    if (value) out[key] = value;
  }
  return out;
}

export function isValidSignature(dataUrl: string): boolean {
  return dataUrl.startsWith(SIGNATURE_PREFIX) && dataUrl.length <= SIGNATURE_MAX_CHARS;
}
