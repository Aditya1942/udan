import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Spinner } from './states';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

type StyleProps = {
  /** `primary` = the one filled action on a screen; `outline` (default) for everything else. */
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  /** Full width, 44px tall. */
  block?: boolean;
  /** Leading icon (lucide element). */
  icon?: ReactNode;
};

function buttonClass({ variant = 'outline', size = 'md', block }: StyleProps, extra?: string): string {
  return ['adm-btn', `adm-btn--${variant}`, size === 'sm' && 'adm-btn--sm', block && 'adm-btn--block', extra].filter(Boolean).join(' ');
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  StyleProps & {
    /** Shows a spinner, sets aria-busy and disables the button. */
    busy?: boolean;
    ref?: Ref<HTMLButtonElement>;
  };

/** App button (36px, 44px hit target). `type` defaults to "button". */
export function Button({ variant, size, block, icon, busy, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block }, className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export type ButtonLinkProps = LinkProps & StyleProps;

/** A router link styled as a button. */
export function ButtonLink({ variant, size, block, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, size, block }, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  /** Accessible name (required: the button shows only an icon). */
  label: string;
  /** `ghost` = no border until hover (row actions). */
  variant?: 'default' | 'ghost';
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

/** Square icon-only button. */
export function IconButton({ label, variant = 'default', className, type = 'button', children, ...rest }: IconButtonProps) {
  const classes = ['adm-icon-btn', variant === 'ghost' && 'adm-icon-btn--ghost', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

/** Inline text action that looks like a link (e.g. "This month", "Show"). */
export function LinkButton({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={['adm-link-btn', className].filter(Boolean).join(' ')} {...rest} />;
}
