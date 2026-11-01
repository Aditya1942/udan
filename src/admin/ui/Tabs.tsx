import type { ReactNode } from 'react';
import { NavLink } from 'react-router';

export type TabItem = { to: string; label: ReactNode; /** Match exactly (default true). */ end?: boolean };

/** Underline tabs that are real routes (Overview | Insights). */
export function Tabs({ label, items }: { label: string; items: TabItem[] }) {
  return (
    <nav className="adm-tabs" aria-label={label}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end ?? true} className="adm-tab">
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export type SegmentedOption<T extends string> = { value: T; label: ReactNode; disabled?: boolean };

/** Segmented control (aria-pressed buttons); the active option uses the Confirmed tint. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="adm-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} disabled={o.disabled} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
