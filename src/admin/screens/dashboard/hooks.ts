/** Dashboard URL state: the table query (month, scope, search, filters, sort) plus `?view=`, and a media-query hook. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { defaultTableQuery, parseTableQuery, tableQueryToParams, type ISODate, type TableQuery } from '../../model';

/** Phones (< 640px): agenda instead of the month grid, Table by default, chart tables by default. */
export const PHONE_QUERY = '(max-width: 40rem)';

export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, [query]);
  return matches;
}

/** Params owned by `parseTableQuery` / `tableQueryToParams`; everything else (`view`, Insights' keys) is kept as is. */
const TABLE_KEYS = ['month', 'scope', 'q', 'status', 'date', 'from', 'to', 'client', 'dmc', 'type', 'cpay', 'dpay', 'inv', 'flag', 'sort', 'dir'];

/** `/admin?<params>` for a query (defaults omitted), e.g. Needs attention's pre-filtered table links. */
export function tableHref(patch: Partial<TableQuery>, today: ISODate): string {
  const p = tableQueryToParams({ ...defaultTableQuery(today), ...patch }, today);
  p.set('view', 'table');
  return `/admin?${p}`;
}

/** The table query from the URL and a patcher (replace: typing and toggling don't stack history). */
export function useTableQuery(today: ISODate) {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => parseTableQuery(params, today), [params, today]);
  const update = useCallback(
    (patch: Partial<TableQuery> | ((q: TableQuery) => TableQuery)) =>
      setParams(
        (current) => {
          const q = parseTableQuery(current, today);
          const next = tableQueryToParams(typeof patch === 'function' ? patch(q) : { ...q, ...patch }, today);
          for (const [k, v] of current) if (!TABLE_KEYS.includes(k)) next.set(k, v);
          return next;
        },
        { replace: true },
      ),
    [setParams, today],
  );
  return { query, update };
}

export type BookingsView = 'calendar' | 'table';

/** `?view=calendar|table`; default Calendar on desktop, Table on phone. */
export function useBookingsView(): [BookingsView, (view: BookingsView) => void] {
  const [params, setParams] = useSearchParams();
  const phone = useMediaQuery(PHONE_QUERY);
  const raw = params.get('view');
  const view: BookingsView = raw === 'calendar' || raw === 'table' ? raw : phone ? 'table' : 'calendar';
  const set = useCallback(
    (next: BookingsView) =>
      setParams(
        (p) => {
          const out = new URLSearchParams(p);
          out.set('view', next);
          return out;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [view, set];
}
