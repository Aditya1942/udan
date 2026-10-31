import type { ReactNode } from 'react';
import './Section.css';

export type SectionTone = 'default' | 'surface' | 'travel' | 'visa' | 'teal';

type SectionProps = {
  children: ReactNode;
  id?: string;
  /** Background treatment. 'travel' = faint green, 'visa' = faint sky/teal, 'teal' = Deep Teal surface. */
  tone?: SectionTone;
  /** Narrow reading-width container. */
  narrow?: boolean;
  /** id of the heading that names this section (pass the same id to SectionHeading). */
  labelledBy?: string;
  className?: string;
};

/** Page section with vertical rhythm and a centred container. */
export function Section({ children, id, tone = 'default', narrow, labelledBy, className }: SectionProps) {
  const classes = ['section', tone !== 'default' && `section--${tone}`, className].filter(Boolean).join(' ');
  return (
    <section id={id} className={classes} aria-labelledby={labelledBy}>
      <div className={narrow ? 'container container--narrow' : 'container'}>{children}</div>
    </section>
  );
}

type SectionHeadingProps = {
  title: ReactNode;
  /** Deprecated: kept for compatibility, no longer rendered. */
  eyebrow?: ReactNode;
  intro?: ReactNode;
  /** Heading level. Default 'h2'. */
  as?: 'h1' | 'h2' | 'h3';
  align?: 'start' | 'center';
  /** Put on the heading element; use with Section's labelledBy. */
  id?: string;
  className?: string;
};

export function SectionHeading({
  title,
  intro,
  as: Heading = 'h2',
  align = 'start',
  id,
  className,
}: SectionHeadingProps) {
  const classes = ['section-heading', `section-heading--${align}`, className].filter(Boolean).join(' ');
  return (
    <header className={classes}>
      <Heading id={id} className="section-heading__title">
        {title}
      </Heading>
      {intro && <p className="section-heading__intro">{intro}</p>}
    </header>
  );
}
