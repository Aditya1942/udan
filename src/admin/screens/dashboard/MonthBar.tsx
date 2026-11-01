import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { addMonths, formatMonth, monthOf, type ISODate, type ISOMonth } from '../../model';
import { IconButton, LinkButton } from '../../ui';
import { Popover } from './Popover';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Month bar: previous / month (month + year popover) / next, plus "This month" when away from it. */
export function MonthBar({ month, today, onChange }: { month: ISOMonth; today: ISODate; onChange: (month: ISOMonth) => void }) {
  const thisMonth = monthOf(today);
  return (
    <div className="adm-period" role="group" aria-label="Month">
      <IconButton label="Previous month" variant="ghost" onClick={() => onChange(addMonths(month, -1))}>
        <ChevronLeft aria-hidden />
      </IconButton>
      <Popover
        label="Choose month"
        summaryClassName="adm-period__label"
        summaryLabel={`${formatMonth(month)}, choose month`}
        summary={
          <>
            {formatMonth(month)} <ChevronDown aria-hidden />
          </>
        }
      >
        {(close) => (
          <MonthGrid
            month={month}
            thisMonth={thisMonth}
            onPick={(m) => {
              onChange(m);
              close();
            }}
          />
        )}
      </Popover>
      <IconButton label="Next month" variant="ghost" onClick={() => onChange(addMonths(month, 1))}>
        <ChevronRight aria-hidden />
      </IconButton>
      {month !== thisMonth ? <LinkButton onClick={() => onChange(thisMonth)}>This month</LinkButton> : null}
    </div>
  );
}

function MonthGrid({ month, thisMonth, onPick }: { month: ISOMonth; thisMonth: ISOMonth; onPick: (m: ISOMonth) => void }) {
  const [year, setYear] = useState(Number(month.slice(0, 4)));
  return (
    <>
      <div className="adm-popover__head">
        <IconButton label="Previous year" variant="ghost" onClick={() => setYear(year - 1)}>
          <ChevronLeft aria-hidden />
        </IconButton>
        <span className="adm-period__year" aria-live="polite">
          {year}
        </span>
        <IconButton label="Next year" variant="ghost" onClick={() => setYear(year + 1)}>
          <ChevronRight aria-hidden />
        </IconButton>
      </div>
      <div className="adm-monthgrid">
        {MONTHS.map((label, i) => {
          const m = `${year}-${pad(i + 1)}`;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={m === month}
              aria-label={formatMonth(m)}
              className={m === thisMonth ? 'is-current' : undefined}
              onClick={() => onPick(m)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </>
  );
}
