import { ArrowDown } from 'lucide-react';
import { Section, SectionHeading } from '../../components/Section';
import { business } from '../../content/business';

const STEPS: readonly { title: string; text: string }[] = [
  {
    title: 'Get in touch',
    text: `Call or WhatsApp ${business.contactPerson}, visit our office, or send us an enquiry.`,
  },
  {
    title: 'Share your plans',
    text: "Tell us where you’d like to go, when, and what you need: a holiday, tickets, a stay or help with a visa or passport.",
  },
  {
    title: 'We guide your next steps',
    text: "We’ll talk you through the options, the documents involved and what happens next.",
  },
];

export function HomeSteps() {
  return (
    <Section tone="teal" labelledBy="home-steps-title" className="home-steps">
      <SectionHeading
        id="home-steps-title"
        eyebrow="Getting started"
        title="How to Get Started"
        intro="Three simple steps from first question to next steps."
        align="center"
      />
      <ol className="home-steps__list">
        {STEPS.map(({ title, text }, index) => (
          <li key={title} className="home-steps__item">
            <span className="home-steps__number" aria-hidden="true">
              {index + 1}
            </span>
            <h3 className="home-steps__title">
              <span className="visually-hidden">Step {index + 1}: </span>
              {title}
            </h3>
            <p className="home-steps__text">{text}</p>
          </li>
        ))}
      </ol>
      <div className="home-section-cta home-section-cta--center">
        <a href="#contact" className="btn btn--primary">
          Get in touch
          <ArrowDown aria-hidden="true" />
        </a>
      </div>
    </Section>
  );
}
