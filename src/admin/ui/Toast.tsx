import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { IconButton } from './Button';

export type ToastTone = 'info' | 'danger';
type Toast = { id: number; message: string; tone: ToastTone };
type ShowToast = (message: string, options?: { tone?: ToastTone; durationMs?: number }) => void;

const ToastContext = createContext<ShowToast | null>(null);

/** Hosts short status messages ("Saved", "Sharing failed — use Download") in a polite live region. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const show = useCallback<ShowToast>(
    (message, { tone = 'info', durationMs = 5000 } = {}) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-2), { id, message, tone }]);
      timers.current.set(id, setTimeout(() => dismiss(id), durationMs));
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={t.tone === 'danger' ? 'adm-toast adm-toast--danger' : 'adm-toast'}>
            <span>{t.message}</span>
            <IconButton label="Dismiss" onClick={() => dismiss(t.id)}>
              <X aria-hidden="true" />
            </IconButton>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** `toast(message, { tone?: 'info' | 'danger', durationMs? })`. Use inside ToastProvider (the admin shell). */
export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside ToastProvider');
  return show;
}
