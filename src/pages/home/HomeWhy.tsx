import { ClipboardList, FileCheck2, Globe, Layers, MessageCircle, UserRoundCheck, type LucideIcon } from 'lucide-react';
import { ResponsiveImage } from '../../components/ResponsiveImage';
import { Section, SectionHeading } from '../../components/Section';
import { business, photos } from '../../content/business';

// Drawn from profile.strengths plus the spec's value points (easy contact, simple enquiry). No claims beyond these.
const POINTS: readonly { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Layers,
    title: 'Many services in one place',
    text: 'Tours, tickets, hotels, insurance, currency, corporate travel, and visa and passport guidance from one office.',
  },
  {
    icon: UserRoundCheck,
    title: 'Personalised assistance',
    text: 'Plans shaped around what you need, with one team to talk to from first question to booking.',
  },
  {
    icon: Globe,
    title: 'Domestic and international',
    text: 'Holidays and bookings across India and abroad, with itineraries customised to your trip.',
  },
  {
    icon: FileCheck2,
    title: 'Help with travel documents',
    text: 'Guidance on visa, passport and booking paperwork, so you know what is needed.',
  },
  {
    icon: MessageCircle,
    title: 'Easy to reach',
    text: `Call, send a WhatsApp message or visit us in ${business.address.locality}, ${business.address.city}.`,
  },
  {
    icon: ClipboardList,
    title: 'A simple enquiry process',
    text: 'Tell us what you need in a few words. No long forms before we can start helping.',
  },
];

export function HomeWhy() {
  return (
    <Section tone="surface" labelledBy="home-why-title" className="home-why">
      <div className="home-why__layout">
        <figure className="home-why__media">
          <ResponsiveImage
            photo={photos.planning}
            sizes="(min-width: 64em) 40vw, 100vw"
            widths={[480, 768, 1080, 1440]}
          />
        </figure>
        <div>
          <SectionHeading id="home-why-title" title="Why choose UDAN" />
          <ul role="list" className="home-why__list">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="home-why__item">
                <h3 className="home-why__title">
                  <Icon className="home-why__icon" aria-hidden="true" strokeWidth={1.75} />
                  {title}
                </h3>
                <p className="home-why__text">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
