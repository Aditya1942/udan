/**
 * Single source of truth for UDAN business facts.
 * Everything here comes from the visiting card (see docs/specs/udan-website.md).
 * Do not add prices, packages, stats, testimonials, email, hours or socials.
 */
import {
  Banknote,
  BookUser,
  BriefcaseBusiness,
  CircleQuestionMark,
  Hotel,
  ShieldPlus,
  Stamp,
  TicketsPlane,
  TreePalm,
  type LucideIcon,
} from 'lucide-react';

export const business = {
  name: 'UDAN Immigration & Tours',
  shortName: 'UDAN',
  tagline: 'Your Journey Begins with UDAN.',
  contactPerson: 'Dolly Shah',
  phone: {
    display: '+91 96872 32015',
    e164: '+919687232015',
  },
  address: {
    line1: 'UGF-12, Meghdeep Shopping Center',
    line2: 'Opp. Prakash Highschool, Near Sandesh Press',
    locality: 'Bodakdev',
    city: 'Ahmedabad',
    region: 'Gujarat',
    country: 'India',
    countryCode: 'IN',
  },
} as const;

/** Address as one comma-separated line (used for display and maps). */
export const fullAddress = [
  business.address.line1,
  business.address.line2,
  business.address.locality,
  business.address.city,
  business.address.region,
  business.address.country,
].join(', ');

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

/** Fixed catalogue IDs. Shared with the enquiry form and Firestore rules (phase 2). */
export const SERVICE_IDS = [
  'international-domestic-tours',
  'hotel-booking',
  'flight-train-tickets',
  'travel-insurance',
  'visa-services',
  'visitor-business-visa',
  'passport-services',
  'currency-exchange',
  'other',
] as const;

export type ServiceId = (typeof SERVICE_IDS)[number];

/** 'travel' = holiday/booking services, 'visa' = document guidance, 'other' = catch-all. */
export type ServiceGroup = 'travel' | 'visa' | 'other';

export type Service = {
  id: ServiceId;
  label: string;
  description: string;
  group: ServiceGroup;
  icon: LucideIcon;
};

export const services: readonly Service[] = [
  {
    id: 'international-domestic-tours',
    label: 'International & Domestic Tours',
    description:
      'Holiday planning for trips abroad and across India, shaped around your dates, interests and budget.',
    group: 'travel',
    icon: TreePalm,
  },
  {
    id: 'hotel-booking',
    label: 'Hotel Booking',
    description: 'Help finding and booking stays that suit your trip, location and budget.',
    group: 'travel',
    icon: Hotel,
  },
  {
    id: 'flight-train-tickets',
    label: 'Flight & Train Tickets',
    description: 'Air and rail ticket bookings for journeys within India and abroad.',
    group: 'travel',
    icon: TicketsPlane,
  },
  {
    id: 'travel-insurance',
    label: 'Travel Insurance',
    description: 'Guidance on travel insurance options so you can set off with cover in place.',
    group: 'travel',
    icon: ShieldPlus,
  },
  {
    id: 'visa-services',
    label: 'Visa Services',
    description:
      'Guidance with visa applications: understanding requirements, preparing documents and submitting your application.',
    group: 'visa',
    icon: Stamp,
  },
  {
    id: 'visitor-business-visa',
    label: 'Visitor & Business Visitor Visa',
    description:
      'Support with visitor and business visitor visa applications, from paperwork to submission.',
    group: 'visa',
    icon: BriefcaseBusiness,
  },
  {
    id: 'passport-services',
    label: 'Passport Services',
    description: 'Help with new passport and renewal applications and the paperwork involved.',
    group: 'visa',
    icon: BookUser,
  },
  {
    id: 'currency-exchange',
    label: 'Currency Exchange',
    description: 'Foreign currency for your trip, arranged before you travel.',
    group: 'travel',
    icon: Banknote,
  },
  {
    id: 'other',
    label: 'Other / not sure',
    description: "Not sure which service you need? Tell us about your plans and we'll guide you.",
    group: 'other',
    icon: CircleQuestionMark,
  },
];

export function isServiceId(value: unknown): value is ServiceId {
  return typeof value === 'string' && (SERVICE_IDS as readonly string[]).includes(value);
}

export function getService(id: ServiceId): Service {
  const service = services.find((s) => s.id === id);
  if (!service) throw new Error(`Unknown service id: ${id}`);
  return service;
}

export function getServicesByGroup(group: ServiceGroup): Service[] {
  return services.filter((s) => s.group === group);
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

/**
 * Unsplash photo (Unsplash licence), hotlinked from images.unsplash.com.
 * `src` is the base URL without query params; ResponsiveImage adds w/q/auto/fit/h.
 * `width`/`height` are the intrinsic aspect ratio we crop to.
 */
export type Photo = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const photos = {
  /** Aeroplane wing above sunlit clouds. Home hero. */
  hero: {
    src: unsplash('1436491865332-7a61a109cc05'),
    alt: 'View from an aeroplane window of a wing above sunlit clouds',
    width: 1600,
    height: 1067,
  },
  /** Map, notebook, camera and backpack flat-lay. Planning / visa / about imagery. */
  planning: {
    src: unsplash('1488646953014-85cb44e25828'),
    alt: 'Travel planning flat-lay with a paper map, notebook, camera and backpack',
    width: 1600,
    height: 1067,
  },
} satisfies Record<string, Photo>;

/* ------------------------------------------------------------------ */
/* Destinations                                                        */
/* ------------------------------------------------------------------ */

export type DestinationRegion = 'international' | 'domestic';

/** Inspiration only: deliberately no price, itinerary or duration fields. */
export type Destination = {
  name: string;
  phrase: string;
  region: DestinationRegion;
  image: Photo;
};

// OPEN ITEM (spec): UDAN must confirm the destination list and photos.
// This is a placeholder selection for layout and inspiration only.
export const destinations: readonly Destination[] = [
  {
    name: 'Dubai',
    phrase: 'Skyline views, desert evenings and city energy.',
    region: 'international',
    image: {
      src: unsplash('1512453979798-5ea266f8880c'),
      alt: 'Dubai skyline with the Burj Khalifa at sunset',
      width: 1200,
      height: 900,
    },
  },
  {
    name: 'Singapore',
    phrase: 'A garden city of bold architecture and great food.',
    region: 'international',
    image: {
      src: unsplash('1525625293386-3f8f99389edd'),
      alt: 'Aerial view of Marina Bay Sands and the waterfront in Singapore',
      width: 1200,
      height: 900,
    },
  },
  {
    name: 'Thailand',
    phrase: 'Limestone cliffs, island beaches and warm hospitality.',
    region: 'international',
    image: {
      src: unsplash('1552465011-b4e21bf6e79a'),
      alt: 'Longtail boats on a turquoise beach beside a limestone cliff in Thailand',
      width: 1200,
      height: 900,
    },
  },
  {
    name: 'Switzerland',
    phrase: 'Alpine valleys, waterfalls and storybook villages.',
    region: 'international',
    image: {
      src: unsplash('1530122037265-a5f1f91d3b99'),
      alt: 'Lauterbrunnen valley in Switzerland with chalets, cliffs and a river',
      width: 1200,
      height: 900,
    },
  },
  {
    name: 'Bali',
    phrase: 'Lakeside temples, rice terraces and calm retreats.',
    region: 'international',
    image: {
      src: unsplash('1537996194471-e657df975ab4'),
      alt: 'Pura Ulun Danu Bratan temple reflected in a misty lake in Bali',
      width: 1200,
      height: 900,
    },
  },
  {
    name: 'Kashmir',
    phrase: 'Houseboats on Dal Lake beneath snow-capped peaks.',
    region: 'domestic',
    image: {
      src: unsplash('1595815771614-ade9d652a65d'),
      alt: 'Traditional houseboats on Dal Lake in Kashmir with snowy mountains behind',
      width: 1200,
      height: 900,
    },
  },
  {
    name: 'Kerala',
    phrase: 'Slow days on palm-fringed backwaters.',
    region: 'domestic',
    image: {
      src: unsplash('1602216056096-3b40cc0c9944'),
      alt: 'A houseboat on the palm-lined backwaters of Kerala',
      width: 1200,
      height: 900,
    },
  },
  {
    name: 'Rajasthan',
    phrase: 'Royal palaces, forts and colourful bazaars.',
    region: 'domestic',
    image: {
      src: unsplash('1477587458883-47145ed94245'),
      alt: 'Hawa Mahal palace facade in Jaipur, Rajasthan',
      width: 1200,
      height: 900,
    },
  },
];
