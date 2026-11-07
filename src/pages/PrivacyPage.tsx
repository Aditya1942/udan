import { Link } from 'react-router';
import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { business } from '../content/business';
import { routes } from '../content/navigation';
import { usePageMeta } from '../hooks/usePageMeta';
import { getCallHref, getWhatsAppHref } from '../lib/contactActions';
import './PrivacyPage.css';

/*
 * DRAFT WORDING: UDAN must review and confirm this privacy notice before launch
 * (see docs/specs/udan-website.md, "Privacy"). Update LAST_UPDATED whenever the text changes.
 */
const LAST_UPDATED = { iso: '2026-10-24', display: '24 October 2026' } as const;

export default function PrivacyPage() {
  usePageMeta({
    title: 'Privacy',
    description: 'How UDAN Immigration & Tours handles the details you share when you send an enquiry.',
  });

  const phoneLink = <a href={getCallHref()}>{business.phone.display}</a>;

  return (
    <>
      <PageHero
        tone="neutral"
        eyebrow="Privacy"
        title="Privacy notice"
        intro={`How ${business.name} handles the details you share when you send us an enquiry.`}
      />

      <Section className="privacy">
        <p className="privacy__updated">
          Last updated: <time dateTime={LAST_UPDATED.iso}>{LAST_UPDATED.display}</time>
        </p>

        <div className="privacy__body">
          <section aria-labelledby="privacy-collect">
            <h2 id="privacy-collect">What we collect</h2>
            <p>When you send an enquiry through the form on this website, we receive:</p>
            <ul>
              <li>your name</li>
              <li>your phone number</li>
              <li>the service you’re interested in</li>
              <li>your message, if you write one</li>
              <li>the page the enquiry was sent from (and the destination, if you enquired about one)</li>
              <li>the date and time the enquiry was sent</li>
            </ul>
          </section>

          <section aria-labelledby="privacy-why">
            <h2 id="privacy-why">Why we collect it</h2>
            <p>
              We use these details only to reply to your enquiry and to follow up about the service you asked
              about.
            </p>
          </section>

          <section aria-labelledby="privacy-where">
            <h2 id="privacy-where">Where it is stored</h2>
            <p>
              Enquiries are stored in Google Firebase (Cloud Firestore), a cloud database service
              provided by Google. Enquiries cannot be read or changed from this website once they are sent.
            </p>
          </section>

          <section aria-labelledby="privacy-who">
            <h2 id="privacy-who">Who can see it</h2>
            <p>
              Only {business.shortName} can see your enquiry. We do not sell your details or share them with
              anyone for marketing.
            </p>
          </section>

          <section aria-labelledby="privacy-retention">
            <h2 id="privacy-retention">How long we keep it</h2>
            <p>We keep your enquiry for as long as we need it to respond and follow up with you.</p>
          </section>

          <section aria-labelledby="privacy-delete">
            <h2 id="privacy-delete">Asking us to delete your details</h2>
            <p>
              You can ask us to delete your enquiry at any time. Call {business.contactPerson} on {phoneLink} or
              send a message on{' '}
              <a href={getWhatsAppHref('Hi UDAN, please delete my enquiry details.')} target="_blank" rel="noopener noreferrer">
                WhatsApp<span className="visually-hidden"> (opens in a new tab)</span>
              </a>{' '}
              to the same number.
            </p>
          </section>

          <section aria-labelledby="privacy-other">
            <h2 id="privacy-other">Other services used by this website</h2>
            <p>
              Photos on this website are loaded from Unsplash. The Call, WhatsApp and Get Directions buttons open
              your phone, WhatsApp or Google Maps, which handle your information under their own privacy
              policies.
            </p>
          </section>

          <section aria-labelledby="privacy-questions">
            <h2 id="privacy-questions">Questions</h2>
            <p>
              If you have any questions about this notice, please <Link to={routes.contact}>contact us</Link>.
            </p>
          </section>
        </div>
      </Section>
    </>
  );
}
