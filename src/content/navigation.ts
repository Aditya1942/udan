export const routes = {
  home: '/',
  tours: '/tours',
  visa: '/visa-services',
  otherServices: '/other-services',
  about: '/about',
  contact: '/contact',
  privacy: '/privacy',
} as const;

export type RoutePath = (typeof routes)[keyof typeof routes];

export type NavLink = { to: RoutePath; label: string };

/** Primary navigation (header + footer). Contact is shown as the header CTA. */
export const primaryNav: readonly NavLink[] = [
  { to: routes.home, label: 'Home' },
  { to: routes.tours, label: 'Tours & Packages' },
  { to: routes.visa, label: 'Visa Services' },
  { to: routes.otherServices, label: 'Other Services' },
  { to: routes.about, label: 'About Us' },
  { to: routes.contact, label: 'Contact' },
];
