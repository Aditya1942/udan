/**
 * Admin shell (prototype Variant A): white sticky top bar with the logo, five nav links (Enquiries carries the
 * live count of New Enquiries) and one primary New booking button. Below 60rem the nav moves behind a menu button.
 */
import { LayoutDashboard, Menu, MessageSquareText, Plus, Settings, Truck, Users, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useNewEnquiryCount } from '../data';
import { ButtonLink, IconButton } from '../ui';
import { Brand } from './Brand';

const MAIN_ID = 'admin-main';

type NavItem = { label: string; to: string; icon: LucideIcon; /** Paths (prefixes) that mark this item current. */ match: (path: string) => boolean };

const under = (prefix: string) => (path: string) => path === prefix || path.startsWith(`${prefix}/`);

export const ADMIN_NAV: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/admin',
    icon: LayoutDashboard,
    match: (p) => p === '/admin' || p === '/admin/' || under('/admin/insights')(p) || under('/admin/bookings')(p),
  },
  { label: 'Enquiries', to: '/admin/enquiries', icon: MessageSquareText, match: under('/admin/enquiries') },
  { label: 'Clients', to: '/admin/clients', icon: Users, match: under('/admin/clients') },
  { label: 'DMCs', to: '/admin/dmcs', icon: Truck, match: under('/admin/dmcs') },
  { label: 'Settings', to: '/admin/settings', icon: Settings, match: under('/admin/settings') },
];

function NavLinks({ vertical = false, onNavigate }: { vertical?: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const newEnquiries = useNewEnquiryCount();
  return (
    <ul className={vertical ? 'adm-nav adm-nav--v' : 'adm-nav'}>
      {ADMIN_NAV.map(({ label, to, icon: Icon, match }) => (
        <li key={label}>
          <Link to={to} aria-current={match(pathname) ? 'page' : undefined} onClick={onNavigate}>
            <Icon aria-hidden /> {label}
            {label === 'Enquiries' && newEnquiries > 0 ? (
              <>
                {' '}
                <span className="adm-count" aria-label={`${newEnquiries} new`}>
                  {newEnquiries}
                </span>
              </>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div className="adm-mobile-menu" ref={root}>
      <IconButton ref={toggle} label={open ? 'Close menu' : 'Menu'} aria-expanded={open} aria-controls="adm-mobile-nav" onClick={() => setOpen((o) => !o)}>
        {open ? <X aria-hidden /> : <Menu aria-hidden />}
      </IconButton>
      <nav id="adm-mobile-nav" aria-label="Admin menu" className="adm-mobile-menu__panel" hidden={!open}>
        <NavLinks vertical onNavigate={() => setOpen(false)} />
      </nav>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="adm">
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Skip to content
      </a>
      <header className="adm-topbar">
        <div className="adm-container adm-topbar__inner">
          <Brand />
          <nav aria-label="Admin" className="adm-topbar__nav">
            <NavLinks />
          </nav>
          <ButtonLink to="/admin/bookings/new" variant="primary" icon={<Plus aria-hidden />}>
            New booking
          </ButtonLink>
          <MobileMenu />
        </div>
      </header>
      <main id={MAIN_ID} tabIndex={-1} className="adm-container adm-main">
        {children}
      </main>
    </div>
  );
}
