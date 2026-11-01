import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/**
 * Disclosure popover (`<details>`): summary = trigger, panel floats below. Closes on Escape (focus back to the
 * trigger) and on a click outside. `children` may be a function receiving `close`.
 */
export function Popover({
  summary,
  summaryClassName,
  summaryLabel,
  className,
  align = 'start',
  label,
  style,
  children,
}: {
  summary: ReactNode;
  summaryClassName?: string;
  /** Accessible name of the trigger when its text isn't enough. */
  summaryLabel?: string;
  className?: string;
  align?: 'start' | 'end';
  /** Accessible name of the panel. */
  label: string;
  style?: CSSProperties;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => {
    const el = ref.current;
    if (!el?.open) return;
    el.open = false;
    el.querySelector('summary')?.focus();
  };
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const el = ref.current;
      if (el?.open && !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, []);
  return (
    <details
      ref={ref}
      className={['adm-pop', className].filter(Boolean).join(' ')}
      style={style}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && ref.current?.open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <summary className={summaryClassName} aria-label={summaryLabel}>
        {summary}
      </summary>
      <div className={align === 'end' ? 'adm-popover adm-popover--end' : 'adm-popover'} role="group" aria-label={label}>
        {typeof children === 'function' ? children(close) : children}
      </div>
    </details>
  );
}
