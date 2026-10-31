/**
 * Single source of truth for UDAN business facts.
 * Sources: the visiting card and the UDAN company profile (Dolly Shah).
 * The company profile wins where they differ (e.g. address, corporate travel).
 * Do not add prices, packages, stats, testimonials, email, hours or socials.
 */
import {
  Banknote,
  BookUser,
  BriefcaseBusiness,
  Building2,
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
  /** From the company profile. */
  slogan: 'Travel. Explore. Experience.',
  promise: 'Your Journey, Our Priority.',
  focusAreas: ['Travel Management', 'Visa Assistance', 'Tourism', 'Corporate Travel'],
  contactPerson: 'Dolly Shah',
  phone: {
    display: '+91 96872 32015',
    e164: '+919687232015',
  },
  address: {
    line1: 'UGF-12, Meghdeep Complex, Sandesh Press Road',
    line2: 'Opp. Prakash Higher Secondary School',
    locality: 'Vastrapur',
    city: 'Ahmedabad',
    region: 'Gujarat',
    postalCode: '380054',
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
  `${business.address.region} ${business.address.postalCode}`,
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
  // Added from the company profile; not in the original spec catalogue.
  'corporate-travel',
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
  /** What UDAN helps with, from the company profile. Empty where the profile has no detail. */
  highlights: readonly string[];
};

export const services: readonly Service[] = [
  {
    id: 'international-domestic-tours',
    label: 'International & Domestic Tours',
    description:
      'Holiday planning for trips abroad and across India, shaped around your dates, interests and budget.',
    group: 'travel',
    icon: TreePalm,
    highlights: [
      'Customised holiday packages',
      'Family holidays and group tours',
      'Honeymoon packages',
      'International vacation packages',
      'Domestic sightseeing and pilgrimage tours',
      'Customised itineraries and transportation arrangements',
    ],
  },
  {
    id: 'hotel-booking',
    label: 'Hotel Booking',
    description: 'Help finding and booking stays that suit your trip, location and budget.',
    group: 'travel',
    icon: Hotel,
    highlights: [
      'Hotel bookings across India and worldwide',
      'Budget, premium and luxury accommodation options',
      'Business travel accommodation',
      'Customised hotel arrangements',
    ],
  },
  {
    id: 'flight-train-tickets',
    label: 'Flight & Train Tickets',
    description: 'Air and rail ticket bookings for journeys within India and abroad.',
    group: 'travel',
    icon: TicketsPlane,
    highlights: [
      'Domestic and international air tickets',
      'Rail bookings',
      'Flight comparisons and itinerary planning',
      'Group and corporate flight bookings',
      'Ticket cancellation and rescheduling assistance',
    ],
  },
  {
    id: 'travel-insurance',
    label: 'Travel Insurance',
    description: 'Guidance on travel insurance options so you can set off with cover in place.',
    group: 'travel',
    icon: ShieldPlus,
    highlights: [],
  },
  {
    id: 'visa-services',
    label: 'Visa Services',
    description:
      'Guidance with visa applications: understanding requirements, preparing documents and submitting your application.',
    group: 'visa',
    icon: Stamp,
    highlights: [
      'Visa documentation guidance',
      'Application process and appointment assistance, where available',
      'Travel documentation support',
    ],
  },
  {
    id: 'visitor-business-visa',
    label: 'Visitor & Business Visitor Visa',
    description:
      'Support with visitor and business visitor visa applications, from paperwork to submission.',
    group: 'visa',
    icon: BriefcaseBusiness,
    highlights: [
      'Visitor and tourist visa assistance',
      'Business visitor visa assistance',
    ],
  },
  {
    id: 'passport-services',
    label: 'Passport Services',
    description: 'Help with new passport and renewal applications and the paperwork involved.',
    group: 'visa',
    icon: BookUser,
    highlights: [
      'Fresh passport application guidance',
      'Passport renewal assistance',
      'Documentation guidance for passport applications',
    ],
  },
  {
    id: 'currency-exchange',
    label: 'Currency Exchange',
    description: 'Foreign currency for your trip, arranged before you travel.',
    group: 'travel',
    icon: Banknote,
    highlights: [],
  },
  {
    id: 'corporate-travel',
    label: 'Corporate Travel Management',
    description:
      'Travel arrangements for businesses, from employee and management bookings to group travel.',
    group: 'travel',
    icon: Building2,
    highlights: [
      'Business travel arrangements',
      'Employee and management travel bookings',
      'Corporate flight and hotel reservations',
      'Group travel coordination',
      'Customised travel solutions for businesses',
      'Booking documentation and invoice coordination',
    ],
  },
  {
    id: 'other',
    label: 'Other / not sure',
    description: "Not sure which service you need? Tell us about your plans and we'll guide you.",
    group: 'other',
    icon: CircleQuestionMark,
    highlights: [],
  },
];

/* ------------------------------------------------------------------ */
/* Company profile                                                     */
/* ------------------------------------------------------------------ */

/** Verbatim-ish copy from the UDAN company profile. */
export const profile = {
  about: [
    'UDAN Immigration & Tours is an Ahmedabad-based travel and immigration service provider offering domestic and international travel solutions. We assist individuals, families, business travellers and corporate clients with their travel requirements.',
    'Our services include domestic and international flight bookings, rail bookings, hotel reservations, travel insurance, currency exchange, customised tour packages, visa assistance and corporate travel management.',
    "We focus on understanding our customers' needs and providing suitable travel solutions through personalised service, transparent communication and professional coordination.",
  ],
  mission:
    'To become a trusted name in the travel and tourism industry by providing convenient, reliable and customer-focused travel solutions.',
  vision: [
    'To simplify domestic and international travel planning.',
    'To provide customised travel solutions according to customer requirements.',
    'To deliver professional and responsive customer service.',
    'To maintain transparency in pricing and booking conditions.',
    'To build long-term relationships with individuals and corporate clients.',
  ],
  strengths: [
    'Comprehensive travel service offerings.',
    'Personalised customer assistance.',
    'Domestic and international travel solutions.',
    'Customised itineraries and holiday packages.',
    'Professional booking coordination.',
    'Assistance with travel documentation.',
    'Focus on customer satisfaction and long-term relationships.',
  ],
  commitment: [
    'At UDAN Immigration & Tours, we believe every journey should begin with confidence and proper planning.',
    'We are committed to assisting our customers throughout the travel planning and booking process, providing clear information about services, prices and applicable terms.',
    'Our goal is to make travel arrangements simpler and more convenient while building lasting relationships based on trust, transparency and service.',
  ],
  clients:
    'We value every client relationship built on trust, transparency and dependable service. We are proud to serve businesses across industries and strive to deliver seamless travel solutions tailored to their unique needs.',
  visaDisclaimer:
    'Visa decisions are made by the relevant immigration authorities. Visa approval cannot be guaranteed.',
} as const;

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
