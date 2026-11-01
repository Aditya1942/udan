import { Link } from 'react-router';
import type { AttentionCategory, ISODate } from '../../model';
import { formatDate } from '../../model';
import { tableHref } from './hooks';

/** Needs attention (all-time): one row per non-empty category; each expands in place. Hidden when empty. */
export function NeedsAttention({ categories, today }: { categories: AttentionCategory[]; today: ISODate }) {
  if (!categories.length) return null;
  return (
    <section className="adm-attn" aria-labelledby="attn-h">
      <h2 id="attn-h" className="adm-h2">
        Needs attention
      </h2>
      <ul>
        {categories.map((c) => (
          <li key={c.key} className={`adm-attn__row adm-attn__row--${c.tone}`}>
            <details>
              <summary>
                <span className="adm-attn__count">{c.count}</span>
                <span className="adm-attn__label">{c.label}</span>
                <span className="adm-attn__open" aria-hidden>
                  Show
                </span>
              </summary>
              <div className="adm-attn__body">
                <Body category={c} today={today} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Body({ category: c, today }: { category: AttentionCategory; today: ISODate }) {
  if (c.key === 'newEnquiries')
    return (
      <p>
        {c.count === 1 ? '1 Enquiry is' : `${c.count} Enquiries are`} waiting for a first contact.{' '}
        <Link to="/admin/enquiries?filter=new">Open Enquiries</Link>
      </p>
    );
  if (c.key === 'backupOverdue')
    return (
      <p>
        {c.lastBackup ? `Last backup on this device: ${formatDate(c.lastBackup)}.` : 'No backup has been taken on this device yet.'}{' '}
        <Link to="/admin/settings#data">Download a backup in Settings</Link>
      </p>
    );
  return (
    <>
      <ul className="adm-attn__items">
        {c.items.map((it, i) => (
          <li key={`${it.bookingId}-${i}`}>
            <Link to={`/admin/bookings/${it.bookingNo}`}>{it.bookingNo}</Link> {it.clientName}, {it.detail}
          </li>
        ))}
      </ul>
      {c.links.length ? (
        <p className="adm-attn__links">
          {c.links.map((l) => (
            <Link key={l.label} to={tableHref(l.query, today)}>
              {l.label}
            </Link>
          ))}
        </p>
      ) : null}
    </>
  );
}
