import type { ReactNode } from 'react';
import type { Photo } from '../content/business';
import { ResponsiveImage } from './ResponsiveImage';
import './PageHero.css';

type PageHeroProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  intro?: ReactNode;
  /** Optional background photo (loaded eagerly). Text sits on a dark overlay for contrast. */
  photo?: Photo;
  /** Colour treatment when there is no photo, and accent colour otherwise. */
  tone?: 'travel' | 'visa' | 'neutral';
  /** Actions (buttons) under the intro. */
  children?: ReactNode;
};

/** Inner-page header with the page's single <h1>. */
export function PageHero({ title, eyebrow, intro, photo, tone = 'neutral', children }: PageHeroProps) {
  const classes = ['page-hero', `page-hero--${tone}`, photo && 'page-hero--photo'].filter(Boolean).join(' ');
  return (
    <header className={classes}>
      {photo && (
        <div className="page-hero__media" aria-hidden="true">
          <ResponsiveImage photo={photo} priority alt="" />
        </div>
      )}
      <div className="container page-hero__inner">
        {eyebrow && <p className="page-hero__eyebrow">{eyebrow}</p>}
        <h1 className="page-hero__title">{title}</h1>
        {intro && <p className="page-hero__intro">{intro}</p>}
        {children && <div className="page-hero__actions">{children}</div>}
      </div>
    </header>
  );
}
