import { useId, type ReactNode } from 'react';

export type PanelProps = {
  title?: ReactNode;
  /** Heading level of the title (default 2). */
  level?: 2 | 3;
  /** Controls on the right of the head (Edit, Add entry…). */
  actions?: ReactNode;
  /** Wrap children in a padded body (default). Set false for tables/lists that run edge to edge. */
  padded?: boolean;
  id?: string;
  className?: string;
  children?: ReactNode;
};

/** Bordered white card with an optional head. One level only: a panel never holds a panel. */
export function Panel({ title, level = 2, actions, padded = true, id, className, children }: PanelProps) {
  const headingId = useId();
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <section id={id} className={['adm-panel', className].filter(Boolean).join(' ')} aria-labelledby={title ? headingId : undefined}>
      {title || actions ? (
        <div className="adm-panel__head">
          {title ? (
            <Heading id={headingId} className={level === 2 ? 'adm-h2' : 'adm-h3'}>
              {title}
            </Heading>
          ) : (
            <span />
          )}
          {actions ? <div className="adm-actions">{actions}</div> : null}
        </div>
      ) : null}
      {padded ? <div className="adm-panel__body">{children}</div> : children}
    </section>
  );
}

/** Label / value list (`<dl>`), e.g. Client details. */
export function KeyValues({ items, className }: { items: { label: ReactNode; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={['adm-kv', className].filter(Boolean).join(' ')}>
      {items.map((item, i) => (
        <div key={i}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Bordered strip of figures (month stats, money strip, KPIs). `columns` defaults to the number of items. */
export function StatStrip({
  items,
  columns,
  label,
  className,
}: {
  items: { label: ReactNode; value: ReactNode; className?: string }[];
  columns?: number;
  label?: string;
  /** Extra class; a class that sets `--adm-stat-cols` (e.g. `adm-stats--kpis`) needs `columns` left unset. */
  className?: string;
}) {
  const style = className && columns === undefined ? undefined : { ['--adm-stat-cols' as string]: columns ?? items.length };
  return (
    <dl className={['adm-stats', className].filter(Boolean).join(' ')} aria-label={label} style={style}>
      {items.map((item, i) => (
        <div key={i} className="adm-stat">
          <dt>{item.label}</dt>
          <dd className={item.className}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
