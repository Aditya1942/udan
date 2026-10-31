import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Logo } from '../components/Logo';
import { primaryNav, routes } from '../content/navigation';
import './SiteHeader.css';

const NAV_ID = 'site-nav';
const headerNav = primaryNav.filter((link) => link.to !== routes.contact);

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Close the menu whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    navRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className="site-header" data-menu-open={open || undefined}>
      <div className="container site-header__bar">
        <Logo />
        <NavLink to={routes.contact} className="btn btn--primary btn--sm btn--inline site-header__cta">
          Contact Us
        </NavLink>
        <button
          ref={toggleRef}
          type="button"
          className="site-header__toggle"
          aria-expanded={open}
          aria-controls={NAV_ID}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
        </button>
        <nav ref={navRef} id={NAV_ID} className="site-nav" aria-label="Main">
          <ul role="list" className="site-nav__list">
            {headerNav.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.to === routes.home} className="site-nav__link">
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <NavLink to={routes.contact} className="btn btn--primary btn--sm site-nav__cta">
            Contact Us
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
