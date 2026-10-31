import { ArrowRight, CalendarDays, Check, Compass, MapPin, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router';
import { DestinationCard } from '../components/DestinationCard';
import { PageHero } from '../components/PageHero';
import { ResponsiveImage } from '../components/ResponsiveImage';
import { Section, SectionHeading } from '../components/Section';
import { destinations, getService, photos, type Destination, type ServiceId } from '../content/business';
import { routes } from '../content/navigation';
import { usePageMeta } from '../hooks/usePageMeta';
import { getEnquireHref } from '../lib/contactActions';
import './ToursPage.css';

const TOURS_ENQUIRY = getEnquireHref({ service: 'international-domestic-tours' });

const tourHighlights = getService('international-domestic-tours').highlights;

const international = destinations.filter((d) => d.region === 'international');
const domestic = destinations.filter((d) => d.region === 'domestic');

/** Hero photo taken from the (placeholder) destination list in business.ts. */
const heroPhoto = (destinations.find((d) => d.name === 'Switzerland') ?? destinations[0]).image;

/** Travel services UDAN can arrange alongside a trip (labels/descriptions come from business.ts). */
const PLAN_SERVICES: readonly ServiceId[] = [
  'hotel-booking',
  'flight-train-tickets',
  'travel-insurance',
  'currency-exchange',
];

/** What helps UDAN plan: questions only, no promises. */
const TRIP_DETAILS = [
  { icon: MapPin, text: 'Where you would like to go, or the kind of trip you have in mind' },
  { icon: CalendarDays, text: 'Roughly when you want to travel and for how long' },
  { icon: Users, text: 'How many people are travelling' },
  { icon: Wallet, text: 'A comfortable budget range' },
] as const;

type GalleryProps = { items: readonly Destination[] };

/**
 * Destination grid: the first card is featured (spans two columns from tablet up).
 * On desktop (3 columns) the feature is dropped when the count already fills whole rows.
 */
function DestinationGallery({ items }: GalleryProps) {
  const classes = ['tours-gallery', items.length % 3 === 0 && 'tours-gallery--even'].filter(Boolean).join(' ');
  return (
    <ul role="list" className={classes}>
      {items.map((destination, index) => {
        const featured = index === 0;
        return (
          <li key={destination.name} className={featured ? 'tours-gallery__item tours-gallery__item--featured' : 'tours-gallery__item'}>
            <DestinationCard
              destination={destination}
              sizes={
                featured
                  ? '(min-width: 64em) 66vw, 100vw'
                  : '(min-width: 64em) 33vw, (min-width: 40em) 50vw, 100vw'
              }
            />
          </li>
        );
      })}
    </ul>
  );
}

export default function ToursPage() {
  usePageMeta({
    title: 'Tours & Packages',
    description:
      'Explore international and domestic holiday ideas with UDAN Immigration & Tours, Ahmedabad, and enquire about planning your next trip.',
  });

  return (
    <>
      <PageHero
        tone="travel"
        photo={heroPhoto}
        eyebrow="Tours & Packages"
        title="Holidays planned around you"
        intro="From city breaks abroad to journeys across India, tell us where you'd like to go and we'll help you plan the trip, from tickets and hotels to insurance."
      >
        <Link to={TOURS_ENQUIRY} className="btn btn--primary">
          Enquire about a trip
          <ArrowRight aria-hidden="true" />
        </Link>
        <a href="#international" className="btn btn--light">
          Browse destinations
        </a>
      </PageHero>

      <Section id="international" labelledBy="tours-international-heading">
        <SectionHeading
          id="tours-international-heading"
          eyebrow="International"
          title="Trips abroad"
          intro="A few places to spark ideas. Enquire about any of them, or anywhere else you have in mind."
        />
        <DestinationGallery items={international} />
      </Section>

      <Section id="domestic" tone="surface" labelledBy="tours-domestic-heading">
        <SectionHeading
          id="tours-domestic-heading"
          eyebrow="Domestic"
          title="Journeys across India"
          intro="Mountains, backwaters and royal cities, closer to home."
        />
        <DestinationGallery items={domestic} />
        <p className="tours-note">
          <Compass aria-hidden="true" />
          These destinations are ideas for inspiration. Every holiday is customised around your dates,
          interests and budget.
        </p>
      </Section>

      <Section tone="travel" labelledBy="tours-plan-heading" className="tours-plan">
        <div className="tours-plan__layout">
          <div className="tours-plan__media">
            <ResponsiveImage
              photo={photos.planning}
              sizes="(min-width: 64em) 40vw, 100vw"
              widths={[480, 768, 1080, 1440]}
            />
          </div>
          <div className="tours-plan__content">
            <SectionHeading
              id="tours-plan-heading"
              eyebrow="Plan a trip with UDAN"
              title="Everything for your trip, in one place"
              intro="UDAN can help arrange the different parts of your journey, so you have one point of contact instead of many."
            />
            {tourHighlights.length > 0 && (
              <div className="tours-plan__highlights">
                <h3 className="tours-plan__highlights-title">How we help with holidays</h3>
                <ul role="list" className="tours-plan__chips">
                  {tourHighlights.map((item) => (
                    <li key={item}>
                      <Check aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <h3 className="tours-plan__services-title">Also arranged alongside your trip</h3>
            <ul role="list" className="tours-plan__services">
              {PLAN_SERVICES.map((id) => {
                const { label, description, icon: Icon } = getService(id);
                return (
                  <li key={id} className="tours-plan__service">
                    <span className="tours-plan__service-icon" aria-hidden="true">
                      <Icon strokeWidth={1.75} />
                    </span>
                    <div>
                      <h3 className="tours-plan__service-title">{label}</h3>
                      <p className="tours-plan__service-text">{description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="tours-plan__details">
              <h3 className="tours-plan__details-title">To get started, it helps to share</h3>
              <ul role="list" className="tours-plan__checklist">
                {TRIP_DETAILS.map(({ icon: Icon, text }) => (
                  <li key={text}>
                    <Icon aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </ul>
              <p className="tours-plan__details-foot">
                <Check aria-hidden="true" />
                Not sure yet? That's fine. We can talk it through.
              </p>
            </div>

            <div className="btn-group">
              <Link to={TOURS_ENQUIRY} className="btn btn--primary">
                Enquire about a trip
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link to={routes.otherServices} className="btn btn--ghost">
                See all travel services
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="visa" labelledBy="tours-visa-heading" className="tours-visa">
        <div className="tours-visa__inner">
          <div>
            <h2 id="tours-visa-heading" className="tours-visa__title">
              Travelling abroad and need a visa or passport?
            </h2>
            <p className="tours-visa__text">
              UDAN also offers guidance with visa and passport applications.
            </p>
          </div>
          <Link to={routes.visa} className="btn btn--outline">
            Explore Visa Services
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </Section>
    </>
  );
}
