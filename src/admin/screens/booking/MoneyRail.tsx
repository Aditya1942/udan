/** Rail "Money" panel: effective Selling Price, Net Cost, Commission, Client and DMC outstanding (live from unsaved values). */
import { bookingMoney, formatINR, type MoneyInput } from '../../model';
import { Panel } from '../../ui';

export function MoneyPanel({ input }: { input: MoneyInput }) {
  const m = bookingMoney(input);
  const rows = [
    { label: m.cancelled ? 'Client cancellation charge' : 'Selling price', value: formatINR(m.sellingPrice) },
    { label: m.cancelled ? 'DMC cancellation charges' : 'Net cost', value: formatINR(m.netCost) },
    { label: 'Commission', value: formatINR(m.commission), className: m.commission < 0 ? 'is-overdue' : undefined },
    {
      label: 'Client outstanding',
      value: m.clientOutstanding < 0 ? `Refund ${formatINR(-m.clientOutstanding)}` : formatINR(m.clientOutstanding),
      className: m.clientOutstanding < 0 ? 'is-refund' : undefined,
    },
    {
      label: 'DMC outstanding',
      value: m.dmcOutstanding < 0 ? `Due back ${formatINR(-m.dmcOutstanding)}` : formatINR(m.dmcOutstanding),
      className: m.dmcOutstanding < 0 ? 'is-refund' : undefined,
    },
  ];
  return (
    <Panel title="Money" padded={false}>
      <dl className="adm-money-stack" aria-label="Money">
        {rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd className={r.className}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
