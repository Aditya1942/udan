/** Read states of the Booking sections (Client, Travel, Price, Service lines, Notes). */
import { ExternalLink, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router';
import { formatDate, formatINR, telUrl, whatsappUrl, type Booking, type Client, type Dmc, type Pax } from '../../model';
import { EmptyState, KeyValues } from '../../ui';

export function paxText(p: Pax): string {
  const part = (n: number, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : '');
  return [part(p.adults, 'adult', 'adults'), part(p.children, 'child', 'children'), part(p.infants, 'infant', 'infants')].filter(Boolean).join(', ') || 'None';
}

export function dateRange(start?: string, end?: string): string {
  if (!start) return '';
  return end && end !== start ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start);
}

export function ClientView({ client }: { client?: Client }) {
  if (!client) return <p className="adm-muted">This Client record no longer exists. Edit to pick another.</p>;
  const extra = [client.city, client.email].filter(Boolean).join(', ');
  return (
    <div className="adm-stack">
      <p>
        <Link to={`/admin/clients/${client.id}`} className="adm-strong-link">
          {client.name}
        </Link>
        {extra ? <span className="adm-sub">{extra}</span> : null}
      </p>
      <div className="adm-actions">
        <a className="adm-btn adm-btn--outline adm-btn--sm" href={telUrl(client.mobile)}>
          <Phone aria-hidden /> {client.mobile}
        </a>
        <a className="adm-btn adm-btn--outline adm-btn--sm" href={whatsappUrl(client.mobile)} target="_blank" rel="noreferrer">
          <MessageCircle aria-hidden /> WhatsApp
        </a>
      </div>
    </div>
  );
}

export function TravelView({ booking }: { booking: Booking }) {
  return (
    <KeyValues
      items={[
        { label: 'Destination', value: booking.destination },
        { label: 'Travel', value: dateRange(booking.travelStart, booking.travelEnd) },
        {
          label: 'Travellers',
          value: (
            <>
              {paxText(booking.pax)}
              <span className="adm-sub">{booking.travellerNames.join(', ') || 'Names not added'}</span>
            </>
          ),
        },
        ...(booking.clientBalanceDueBy ? [{ label: 'Client balance due by', value: formatDate(booking.clientBalanceDueBy) }] : []),
      ]}
    />
  );
}

export function PriceView({ booking }: { booking: Booking }) {
  const cancelled = booking.status === 'Cancelled';
  return (
    <KeyValues
      items={[
        { label: 'Selling price', value: <span className={cancelled ? 'is-struck' : undefined}>{formatINR(booking.sellingPrice)}</span> },
        ...(cancelled ? [{ label: 'Client cancellation charge', value: formatINR(booking.clientCancellationCharge ?? 0) }] : []),
        { label: 'Balance due by', value: booking.clientBalanceDueBy ? formatDate(booking.clientBalanceDueBy) : <span className="adm-muted">Not set</span> },
      ]}
    />
  );
}

export function LinesTable({ booking, dmcsById }: { booking: Booking; dmcsById: ReadonlyMap<string, Dmc> }) {
  const cancelled = booking.status === 'Cancelled';
  if (!booking.lines.length) {
    return (
      <div className="adm-panel__body">
        <EmptyState title="No Service Lines yet">Each line is one thing a DMC supplies, with its own Net cost. Edit to add one.</EmptyState>
      </div>
    );
  }
  const total = booking.lines.reduce((s, l) => s + l.netCost, 0);
  const totalCharge = booking.lines.reduce((s, l) => s + (l.dmcCancellationCharge ?? 0), 0);
  return (
    <div className="adm-table-wrap">
      <table className="adm-table adm-table--lines">
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">DMC</th>
            <th scope="col">Dates</th>
            <th scope="col">Confirmation no.</th>
            <th scope="col">Pay DMC by</th>
            <th scope="col" className="num">
              Net cost
            </th>
            {cancelled ? (
              <th scope="col" className="num">
                DMC charge
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {booking.lines.map((l) => (
            <tr key={l.id}>
              <th scope="row" data-label="Service">
                {l.type}
                <span className="adm-sub">{l.description}</span>
              </th>
              <td data-label="DMC">
                <Link to={`/admin/dmcs/${l.dmcId}`}>{dmcsById.get(l.dmcId)?.name ?? 'Unknown DMC'}</Link>
              </td>
              <td data-label="Dates">{l.start ? dateRange(l.start, l.end) : <span className="adm-muted">Whole trip</span>}</td>
              <td data-label="Confirmation no.">{l.confirmationNo || <span className="adm-missing">Missing</span>}</td>
              <td data-label="Pay DMC by">{l.dmcPayBy ? formatDate(l.dmcPayBy) : <span className="adm-muted">None</span>}</td>
              <td data-label="Net cost" className={cancelled ? 'num is-struck' : 'num'}>
                {formatINR(l.netCost)}
              </td>
              {cancelled ? (
                <td data-label="DMC charge" className="num">
                  {formatINR(l.dmcCancellationCharge ?? 0)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={5}>
              Net cost
            </th>
            <td className={cancelled ? 'num is-struck' : 'num'}>{formatINR(total)}</td>
            {cancelled ? <td className="num">{formatINR(totalCharge)}</td> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function NotesView({ booking }: { booking: Booking }) {
  return (
    <dl className="adm-kv adm-kv--block">
      <div>
        <dt>
          Itinerary <span className="adm-muted">printed on the Voucher</span>
        </dt>
        <dd className="adm-pre">{booking.itinerary || <span className="adm-muted">None</span>}</dd>
      </div>
      <div>
        <dt>
          Internal notes <span className="adm-muted">admin only</span>
        </dt>
        <dd className="adm-pre">{booking.internalNotes || <span className="adm-muted">None</span>}</dd>
      </div>
      {booking.enquiryId ? (
        <div>
          <dt>Source</dt>
          <dd>
            <Link to="/admin/enquiries?filter=converted">
              From enquiry <ExternalLink aria-hidden className="adm-inline-icon" />
            </Link>
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
