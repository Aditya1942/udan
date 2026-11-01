/** Login redirects: only same-origin `/admin…` paths are honoured (never the login page itself). */

export const ADMIN_HOME = '/admin';
export const LOGIN_PATH = '/admin/login';

/** The path to go to after sign-in, or `/admin` when `next` is missing or not a safe admin path. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return ADMIN_HOME;
  let url: URL;
  try {
    url = new URL(next, 'https://udan.invalid');
  } catch {
    return ADMIN_HOME;
  }
  if (url.origin !== 'https://udan.invalid') return ADMIN_HOME;
  const { pathname } = url;
  if (pathname !== ADMIN_HOME && !pathname.startsWith(`${ADMIN_HOME}/`)) return ADMIN_HOME;
  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) return ADMIN_HOME;
  return `${pathname}${url.search}${url.hash}`;
}

/** `/admin/login?next=<path>` for a signed-out visit to `path`. */
export function loginPathFor(path: string): string {
  const next = safeNext(path);
  return next === ADMIN_HOME ? LOGIN_PATH : `${LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}
