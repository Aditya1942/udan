import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button, IconButton } from './Button';

export type DialogProps = {
  open: boolean;
  /** Called on Escape, the close button, or the backdrop. */
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  /** Buttons, right-aligned (Cancel first, primary/danger last). */
  footer?: ReactNode;
  /** Wrap the body in a <form> and call this on submit (Enter submits). */
  onSubmit?: () => void;
  wide?: boolean;
  /** Extra class on the <dialog>, e.g. a custom width. */
  className?: string;
};

/** Centred native <dialog> (modal, focus-trapped by the browser), backdrop --adm-scrim. */
export function Dialog({ open, onClose, title, children, footer, onSubmit, wide, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const previousActive = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      previousActive.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', ''); // jsdom
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      previousActive.current?.focus();
      previousActive.current = null;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      previousActive.current?.focus();
    };
  }, []);

  const content = (
    <>
      <div className="adm-dialog__head">
        <h2 id={titleId} className="adm-h2">
          {title}
        </h2>
        <IconButton label="Close" variant="ghost" onClick={onClose}>
          <X aria-hidden="true" />
        </IconButton>
      </div>
      <div className="adm-dialog__body">{children}</div>
      {footer ? <div className="adm-dialog__foot">{footer}</div> : null}
    </>
  );

  return (
    <dialog
      ref={ref}
      className={['adm-dialog', wide && 'adm-dialog--wide', className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // backdrop
      }}
    >
      {open ? (
        onSubmit ? (
          <form
            className="adm-dialog__inner"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {content}
          </form>
        ) : (
          <div className="adm-dialog__inner">{content}</div>
        )
      ) : null}
    </dialog>
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  /** Red confirm button (deletes). */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Yes/no confirm (delete confirms etc.). */
export function ConfirmDialog({ open, title, children, confirmLabel, danger, busy, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      onSubmit={onConfirm}
      footer={
        <>
          <Button onClick={onClose} disabled={busy} autoFocus={danger ? true : undefined}>
            Cancel
          </Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} busy={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
