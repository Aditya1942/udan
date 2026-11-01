import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode } from 'react';

type ControlProps = { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false' };

export type FieldProps = {
  label: ReactNode;
  /** Help text under the input. */
  hint?: ReactNode;
  /** Validation message (also marks the control aria-invalid). */
  error?: ReactNode;
  className?: string;
  /** One control: <input>, <select>, <textarea> or a component that forwards id/aria props. */
  children: ReactElement<ControlProps>;
};

/**
 * Label + control + hint + error, wired with id / aria-describedby / aria-invalid.
 * Style comes from `.adm-field` (36px controls, slate borders, focus ring).
 */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const autoId = useId();
  const control = isValidElement(children) ? children : null;
  const id = control?.props.id ?? `f${autoId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [control?.props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={['adm-field', className].filter(Boolean).join(' ')}>
      <label className="adm-field__label" htmlFor={id}>
        {label}
      </label>
      {control
        ? cloneElement(control, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : control.props['aria-invalid'] })
        : children}
      {hint ? (
        <span id={hintId} className="adm-field__hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="adm-field__error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** Checkbox with its label to the right (44px tap row). */
export function Checkbox({ label, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  return (
    <label className="adm-check">
      <input type="checkbox" {...rest} />
      {label}
    </label>
  );
}
