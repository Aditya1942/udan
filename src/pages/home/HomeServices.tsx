import { BookUser, Stamp, TicketsPlane, TreePalm } from 'lucide-react';
import { Section, SectionHeading } from '../../components/Section';
import { ServiceCard, type ServiceCardProps } from '../../components/ServiceCard';
import { business } from '../../content/business';
import { routes } from '../../content/navigation';

type Overview = Pick<ServiceCardProps, 'icon' | 'title' | 'description' | 'href' | 'tone'>;

// Travel first, then the document-guidance (visa) cards, so the two areas read as separate groups.
const overview: readonly Overview[] = [
  {
    icon: TreePalm,
    title: 'Tours & Packages',
    description: 'International and domestic holidays planned around your dates, interests and budget.',
    href: routes.tours,
    tone: 'travel',
  },
  {
    icon: TicketsPlane,
    title: 'Tickets, Hotels & More',
    description: 'Flight and train tickets, hotel bookings, travel insurance, currency exchange and corporate travel.',
    href: routes.otherServices,
    tone: 'travel',
  },
  {
    icon: Stamp,
    title: 'Visa Services',
    description: 'Guidance with visa applications, including visitor and business visitor visas.',
    href: routes.visa,
    tone: 'visa',
  },
  {
    icon: BookUser,
    title: 'Passport Services',
    description: 'Help with new passport and renewal applications and the paperwork involved.',
    href: routes.visa,
    tone: 'visa',
  },
];

export function HomeServices() {
  return (
    <Section labelledBy="home-services-title" className="home-services">
      <SectionHeading
        id="home-services-title"
        eyebrow="What we do"
        title="Everything You Need for Your Next Journey"
        intro="From the holiday itself to the tickets, stays and paperwork around it, UDAN brings it together under one roof."
      />
      <ul className="home-services__focus" aria-label="Our focus areas">
        {business.focusAreas.map((area) => (
          <li key={area}>{area}</li>
        ))}
      </ul>
      <ul className="home-services__grid">
        {overview.map((item) => (
          <li key={item.title}>
            <ServiceCard {...item} />
          </li>
        ))}
      </ul>
      <p className="home-services__legend">
        <span className="home-services__key home-services__key--travel">Travel services</span>
        <span className="home-services__key home-services__key--visa">Visa &amp; passport guidance</span>
      </p>
    </Section>
  );
}
