import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Scrolls to top on route change, or to the #hash target when present (e.g. /contact#enquiry). */
export function ScrollManager() {
  const { pathname, hash, search } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        target.scrollIntoView({ block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash, search]);

  return null;
}
