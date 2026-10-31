import { ArrowRight, Compass } from 'lucide-react';
import { Link } from 'react-router';
import { Section } from '../components/Section';
import { primaryNav, routes } from '../content/navigation';
import { usePageMeta } from '../hooks/usePageMeta';
import './NotFoundPage.css';

const SUGGESTIONS = primaryNav.filter((link) => link.to !== routes.home && link.to !== routes.contact);

export default function NotFoundPage() {
  usePageMeta({
    title: 'Page not found',
    description: 'The page you were looking for could not be found.',
  });

  return (
    <Section narrow className="notfound">
      <div className="notfound__inner">
        <span className="notfound__icon" aria-hidden="true">
          <Compass strokeWidth={1.5} />
        </span>
        <p className="notfound__code">Error 404</p>
        <h1 className="notfound__title">Page not found</h1>
        <p className="notfound__text">
          Looks like this page has taken a detour. It may have moved, or the link may be mistyped.
        </p>
        <div className="btn-group notfound__actions">
          <Link to={routes.home} className="btn btn--primary">
            Back to home
          </Link>
          <Link to={routes.contact} className="btn btn--outline">
            Contact us
          </Link>
        </div>
        <nav className="notfound__links" aria-labelledby="notfound-links-heading">
          <h2 id="notfound-links-heading" className="notfound__links-title">
            Or try one of these
          </h2>
          <ul role="list">
            {SUGGESTIONS.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="link-arrow">
                  {label}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </Section>
  );
}
