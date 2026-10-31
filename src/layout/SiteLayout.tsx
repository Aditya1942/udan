import { Outlet } from 'react-router';
import { MobileContactBar } from './MobileContactBar';
import { ScrollManager } from './ScrollManager';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import './SiteLayout.css';

export const MAIN_ID = 'main-content';

export function SiteLayout() {
  return (
    <div className="site-layout">
      <ScrollManager />
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Skip to content
      </a>
      <SiteHeader />
      <main id={MAIN_ID} tabIndex={-1} className="site-main">
        <Outlet />
      </main>
      <SiteFooter />
      <MobileContactBar />
    </div>
  );
}
