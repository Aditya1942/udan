import { ArrowRight, Globe, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import type { Destination } from '../content/business';
import { getEnquireHref } from '../lib/contactActions';
import { ResponsiveImage } from './ResponsiveImage';
import './DestinationCard.css';

type DestinationCardProps = {
  destination: Destination;
  headingLevel?: 'h2' | 'h3' | 'h4';
  /** `sizes` for the photo; default suits a 1/2/3/4-column grid. */
  sizes?: string;
  className?: string;
};

const REGION_LABEL = { international: 'International', domestic: 'Domestic' } as const;

/** Photo card with name, phrase, region badge and an "Enquire Now" link prefilled for tours + destination. */
export function DestinationCard({
  destination,
  headingLevel: Heading = 'h3',
  sizes = '(min-width: 72em) 25vw, (min-width: 48em) 33vw, (min-width: 34em) 50vw, 100vw',
  className,
}: DestinationCardProps) {
  const { name, phrase, region, image } = destination;
  const RegionIcon = region === 'international' ? Globe : MapPin;
  return (
    <article className={['destination-card', className].filter(Boolean).join(' ')}>
      <div className="destination-card__media">
        <ResponsiveImage photo={image} sizes={sizes} widths={[400, 640, 960, 1200]} />
        <span className={`destination-card__badge destination-card__badge--${region}`}>
          <RegionIcon aria-hidden="true" />
          {REGION_LABEL[region]}
        </span>
      </div>
      <div className="destination-card__body">
        <Heading className="destination-card__name">{name}</Heading>
        <p className="destination-card__phrase">{phrase}</p>
        <Link
          to={getEnquireHref({ service: 'international-domestic-tours', destination: name })}
          className="link-arrow destination-card__link"
        >
          Enquire Now<span className="visually-hidden"> about {name}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
