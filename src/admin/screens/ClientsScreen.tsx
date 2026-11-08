import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useBookingRows, useAdminData } from '../data';
import { clientSummary, formatINR } from '../model';
import { Button, DataRegion, EmptyState, PageHeader, useAdminTitle, useToast } from '../ui';
import { ClientDialog } from './directory/ClientDialog';
import { matchesText, SearchBox, useRetryRows, useSearchParam } from './directory/shared';

/** `/admin/customers` — search (name, mobile, email, city) + table with Bookings, Billed, Outstanding; New customer dialog. */
export function ClientsScreen() {
  useAdminTitle('Customers');
  const { clients } = useAdminData();
  const retryRows = useRetryRows();
  const rowsState = useBookingRows();
  const [q] = useSearchParam('q');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const list = useMemo(
    () =>
      clients.data
        .filter((c) => matchesText(q, c.name, c.mobile, c.email, c.city))
        .map((c) => ({ client: c, summary: clientSummary(rowsState.rows, c.id) })),
    [clients.data, rowsState.rows, q],
  );

  return (
    <>
      <PageHeader
        title="Customers"
        actions={
          <Button variant="primary" icon={<Plus aria-hidden />} onClick={() => setCreating(true)}>
            New customer
          </Button>
        }
      />
      <DataRegion
        status={rowsState.status}
        error={rowsState.errors[0]}
        onRetry={retryRows}
        errorTitle="Couldn't load Customers"
        isEmpty={clients.data.length === 0}
        empty={
          <EmptyState
            title="No Customers yet"
            action={
              <Button variant="primary" icon={<Plus aria-hidden />} onClick={() => setCreating(true)}>
                New customer
              </Button>
            }
          >
            Customers are added here or while creating a booking.
          </EmptyState>
        }
      >
        <div className="adm-table-tools">
          <SearchBox label="Search customers" placeholder="Search name, mobile, email, city" />
        </div>
        {list.length === 0 ? (
          <EmptyState title="No Customers match">Try a different name, mobile, email or city.</EmptyState>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--dir adm-table--cards">
              <caption className="visually-hidden">Customers</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Mobile</th>
                  <th scope="col">City</th>
                  <th scope="col" className="num">
                    Bookings
                  </th>
                  <th scope="col" className="num">
                    Billed
                  </th>
                  <th scope="col" className="num">
                    Outstanding
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ client: c, summary: s }) => (
                  <tr key={c.id}>
                    <th scope="row">
                      <Link to={`/admin/customers/${c.id}`} className="adm-strong-link">
                        {c.name}
                      </Link>
                      {c.email ? <span className="adm-sub">{c.email}</span> : null}
                    </th>
                    <td data-label="Mobile">{c.mobile}</td>
                    <td data-label="City" data-hide-sm={c.city ? undefined : ''}>
                      {c.city}
                    </td>
                    <td data-label="Bookings" className="num">
                      {s.bookings}
                    </td>
                    <td data-label="Billed" className="num" data-hide-sm="">
                      {formatINR(s.billed)}
                    </td>
                    <td data-label="Outstanding" className="num">
                      {formatINR(s.outstanding)}
                      {s.refundsOwed > 0 ? <span className="adm-sub is-refund">Refund {formatINR(s.refundsOwed)}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataRegion>
      <ClientDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          toast('Customer created.');
          navigate(`/admin/customers/${id}`);
        }}
      />
    </>
  );
}
