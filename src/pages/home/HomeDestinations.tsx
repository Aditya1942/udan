import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { DestinationCard } from '../../components/DestinationCard';
import { Section, SectionHeading } from '../../components/Section';
import { destinations, type DestinationRegion } from '../../content/business';
import { routes } from '../../content/navigation';

type Filter = 'all' | DestinationRegion;

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'international', label: 'International' },
  { value: 'domestic', label: 'Domestic' },
];

export function HomeDestinations() {
  const [filter, setFilter] = useState<Filter>('all');
  const shown = filter === 'all' ? destinations : destinations.filter((d) => d.region === filter);
  const status =
    filter === 'all'
      ? `Showing all ${shown.length} destinations`
      : `Showing ${shown.length} ${filter} destinations`;

  return (
    <Section tone="surface" labelledBy="home-destinations-title" className="home-destinations">
      <div className="home-destinations__head">
        <SectionHeading
          id="home-destinations-title"
          eyebrow="Tours & packages"
          title="Discover Your Next Destination"
          intro="A few places to spark ideas, abroad and across India. Tell us where you'd like to go and we'll help you plan it."
        />
        <div className="home-filter" role="group" aria-label="Filter destinations">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className="home-filter__option"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="visually-hidden" role="status">
        {status}
      </p>

      <ul role="list" className="home-destinations__grid">
        {shown.map((destination) => (
          <li key={destination.name}>
            <DestinationCard destination={destination} />
          </li>
        ))}
      </ul>

      <div className="home-section-cta">
        <Link to={routes.tours} className="btn btn--primary">
          See Tours &amp; Packages
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </Section>
  );
}
