import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router';
import { ContactActions } from '../components/ContactActions';
import { PageHero } from '../components/PageHero';
import { ResponsiveImage } from '../components/ResponsiveImage';
import { Section, SectionHeading } from '../components/Section';
import { business, fullAddress, getServicesByGroup, photos, profile } from '../content/business';
import { routes } from '../content/navigation';
import { usePageMeta } from '../hooks/usePageMeta';
import { getCallHref } from '../lib/contactActions';
import './AboutPage.css';

const travelServices = getServicesByGroup('travel');
const visaServices = getServicesByGroup('visa');

export default function AboutPage() {
  usePageMeta({
    title: 'About Us',
    description: `About ${business.name}: travel, visa, passport and corporate travel services from one office in ${business.address.locality}, ${business.address.city}.`,
  });

  return (
    <>
      <PageHero tone="neutral" eyebrow="About Us" title={`About ${business.shortName}`} intro={business.slogan} />

      <Section labelledBy="about-who-heading">
        <div className="about-who">
          <div className="about-who__text">
            <SectionHeading id="about-who-heading" eyebrow="Who we are" title={business.promise} />
            <div className="about-who__copy">
              {profile.about.map((paragraph, index) => (
                <p key={paragraph} className={index === 0 ? 'lead' : undefined}>
                  {paragraph}
                </p>
              ))}
            </div>
            <dl className="about-facts">
              <div className="about-facts__row">
                <dt>Business</dt>
                <dd>{business.name}</dd>
              </div>
              <div className="about-facts__row">
                <dt>Contact person</dt>
                <dd>{business.contactPerson}</dd>
              </div>
              <div className="about-facts__row">
                <dt>Phone</dt>
                <dd>
                  <a href={getCallHref()}>{business.phone.display}</a>
                </dd>
              </div>
              <div className="about-facts__row">
                <dt>Office</dt>
                <dd>{fullAddress}</dd>
              </div>
              <div className="about-facts__row">
                <dt>Focus areas</dt>
                <dd>{business.focusAreas.join(' · ')}</dd>
              </div>
            </dl>
          </div>
          <div className="about-who__media">
            <ResponsiveImage photo={photos.planning} sizes="(min-width: 64em) 45vw, 100vw" widths={[480, 768, 1080, 1440]} />
          </div>
        </div>
      </Section>

      <Section tone="surface" labelledBy="about-mission-heading">
        <SectionHeading id="about-mission-heading" eyebrow="Mission & vision" title="What we're working towards" />
        <div className="about-mv">
          <article className="about-mv__mission" aria-labelledby="about-mission-title">
            <h3 id="about-mission-title" className="about-mv__title">
              Our mission
            </h3>
            <p className="about-mv__mission-text">{profile.mission}</p>
          </article>
          <article className="about-mv__vision" aria-labelledby="about-vision-title">
            <h3 id="about-vision-title" className="about-mv__title">
              Our vision
            </h3>
            <ul role="list" className="about-checklist">
              {profile.vision.map((item) => (
                <li key={item}>
                  <Check aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </Section>

      <Section labelledBy="about-services-heading">
        <SectionHeading
          id="about-services-heading"
          eyebrow="What we do"
          title="The range of services"
          intro="Two areas of work, kept clearly separate: planning travel for individuals, families and businesses, and guidance with documents."
        />
        <div className="about-areas">
          <article className="about-area about-area--travel" aria-labelledby="about-area-travel">
            <h3 id="about-area-travel" className="about-area__title">
              Travel
            </h3>
            <ul role="list" className="about-area__list">
              {travelServices.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <Icon aria-hidden="true" strokeWidth={1.75} />
                  {label}
                </li>
              ))}
            </ul>
            <div className="about-area__links">
              <Link to={routes.tours} className="link-arrow">
                Tours &amp; Packages
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link to={routes.otherServices} className="link-arrow">
                Other Services
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </article>
          <article className="about-area about-area--visa" aria-labelledby="about-area-visa">
            <h3 id="about-area-visa" className="about-area__title">
              Visa &amp; passport guidance
            </h3>
            <ul role="list" className="about-area__list">
              {visaServices.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <Icon aria-hidden="true" strokeWidth={1.75} />
                  {label}
                </li>
              ))}
            </ul>
            <p className="about-area__note">{profile.visaDisclaimer}</p>
            <div className="about-area__links">
              <Link to={routes.visa} className="link-arrow">
                Visa Services
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </Section>

      <Section tone="travel" labelledBy="about-strengths-heading">
        <div className="about-strengths">
          <SectionHeading id="about-strengths-heading" eyebrow="Our strengths" title="What we bring to every booking" />
          <ul role="list" className="about-strengths__list">
            {profile.strengths.map((item) => (
              <li key={item}>
                <Check aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section labelledBy="about-commitment-heading">
        <div className="about-commitment">
          <div className="about-commitment__text">
            <SectionHeading id="about-commitment-heading" eyebrow="Our commitment" title="Every journey should begin with confidence" />
            {profile.commitment.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="about-clients">
            <h3>Our clients</h3>
            <p>{profile.clients}</p>
          </div>
        </div>
      </Section>

      <Section tone="teal" labelledBy="about-contact-heading">
        <div className="about-contact">
          <div className="about-contact__text">
            <h2 id="about-contact-heading">Talk to {business.contactPerson}</h2>
            <p>
              Call, WhatsApp or drop by the office in {business.address.locality}, {business.address.city} to start
              planning.
            </p>
          </div>
          <ContactActions onDark />
        </div>
      </Section>
    </>
  );
}
