/** Composite inputs used inside `Field` (they forward id / aria-describedby / aria-invalid to the real <input>). */
import { X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

type ForwardedProps = { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false'; 'aria-label'?: string };

const inrGroup = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/**
 * ₹ amount input with en-IN grouping (`1,48,500`). Whole rupees only: non-digits are dropped,
 * empty reads as 0 (shown as the "0" placeholder).
 */
export function MoneyInput({
  value,
  onChange,
  disabled,
  ...aria
}: ForwardedProps & { value: number; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <span className="adm-money">
      <span aria-hidden="true">₹</span>
      <input
        {...aria}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={value ? inrGroup.format(value) : ''}
        placeholder="0"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
          onChange(digits ? Number(digits) : 0);
        }}
      />
    </span>
  );
}

/** Chip list + text input: Enter (or comma) adds the typed value, each chip removes itself. */
export function ChipInput({
  values,
  onChange,
  placeholder = 'Type and press Enter',
  ...aria
}: ForwardedProps & { values: string[]; onChange: (values: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState('');
  const commit = () => {
    const v = text.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setText('');
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && text.trim()) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Enter') {
      e.preventDefault(); // never submit the surrounding form from here
    } else if (e.key === 'Backspace' && !text && values.length) {
      onChange(values.slice(0, -1));
    }
  };
  return (
    <div className="adm-tags">
      {values.map((v) => (
        <button key={v} type="button" className="adm-chip" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
          {v} <X aria-hidden="true" />
        </button>
      ))}
      <input {...aria} type="text" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} onBlur={commit} />
    </div>
  );
}
