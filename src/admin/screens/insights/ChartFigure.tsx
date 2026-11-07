import { useId, useState, type ReactNode } from 'react';
import { PHONE_QUERY, useMediaQuery } from '../dashboard/hooks';

export type ChartTable = {
  caption: string;
  head: string[];
  /** Columns (by index) that hold numbers (right-aligned). The first column is the row header. */
  numeric?: number[];
  rows: ReactNode[][];
};

/**
 * One Insights chart: bordered `<figure>` + `<figcaption>`, the plot (labelled group) and a "View as table" toggle
 * that swaps in a real `<table>` with `<caption>`. `preferTable`: start on the table below 640px (crowded ticks).
 */
export function ChartFigure({
  title,
  note,
  wide,
  preferTable,
  plotLabel,
  empty,
  table,
  children,
}: {
  title: string;
  note?: ReactNode;
  wide?: boolean;
  preferTable?: boolean;
  /** Screen-reader description of the plot (kind of chart + how to explore it). */
  plotLabel: string;
  /** True when there is nothing to plot. */
  empty?: boolean;
  table: ChartTable;
  children: ReactNode;
}) {
  const titleId = useId();
  const phone = useMediaQuery(PHONE_QUERY);
  const [choice, setChoice] = useState<boolean | null>(null);
  const asTable = choice ?? (!!preferTable && phone);
  return (
    <figure className={wide ? 'adm-chart adm-chart--wide' : 'adm-chart'} aria-labelledby={titleId}>
      <figcaption className="adm-chart__head">
        <h3 id={titleId} className="adm-h3">
          {title}
        </h3>
        {!empty ? (
          <button type="button" className="adm-link-btn" aria-pressed={asTable} onClick={() => setChoice(!asTable)}>
            {asTable ? 'View as chart' : 'View as table'}
          </button>
        ) : null}
      </figcaption>
      {note ? <p className="adm-chart__note">{note}</p> : null}
      {empty ? (
        <p className="adm-muted">Nothing to show for this period.</p>
      ) : asTable ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption>{table.caption}</caption>
            <thead>
              <tr>
                {table.head.map((h, i) => (
                  <th key={i} scope="col" className={table.numeric?.includes(i) ? 'num' : undefined}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((cell, ci) =>
                    ci === 0 ? (
                      <th key={ci} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={ci} className={table.numeric?.includes(ci) ? 'num' : undefined}>
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="group" aria-label={plotLabel}>
          {children}
        </div>
      )}
    </figure>
  );
}
