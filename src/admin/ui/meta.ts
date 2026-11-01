import { useEffect } from 'react';

export const ADMIN_TITLE_SUFFIX = 'UDAN admin';

/** `document.title = "<page> · UDAN admin"` while mounted; restores the previous title on unmount. */
export function useAdminTitle(page: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = page ? `${page} · ${ADMIN_TITLE_SUFFIX}` : ADMIN_TITLE_SUFFIX;
    return () => {
      document.title = previous;
    };
  }, [page]);
}

/** Adds `<meta name="robots" content="noindex, nofollow">` while mounted (AdminLayout, Login). */
export function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    meta.dataset.admin = '';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}
