import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { deleteClient, updateClient, useAdminData, useBookingRows } from '../data';
import { bookingDate, bookingEndDate, clientSummary, clientWhatsapp, formatINR, hasErrors, type Client } from '../model';
import {
  Button,
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  errorMessage,
  KeyValues,
  LoadingState,
  Note,
  PageHeader,
  Panel,
  StatStrip,
  StatusBadge,
  useAdminTitle,
  useToast,
} from '../ui';
import { dateRange } from './booking/views';
import {
  ClientFormFields,
  clientErrors,
  clientFieldsOf,
  clientInputOf,
  ContactButtons,
  NONE,
  Outstanding,
  useRetryRows,
} from './directory/shared';

const BACK = { to: '/admin/customers', label: 'Customers' };

/** `/admin/customers/:id` — head (tel / WhatsApp / New booking), strip, Bookings table, Details with inline Edit/Save, Delete. */
export function ClientDetailScreen() {
  const { id = '' } = useParams();
  const { clientsById } = useAdminData();
  const rowsState = useBookingRows();
  const retryRows = useRetryRows();
  const client = clientsById.get(id);
  useAdminTitle(client?.name ?? 'Customer');

  if (rowsState.status === 'error') {
    return (
      <>
        <PageHeader title="Customer" back={BACK} />
        <ErrorState title="Couldn't load this Customer" error={rowsState.errors[0]} onRetry={retryRows} />
      </>
    );
  }
  if (rowsState.status === 'loading') {
    return (
      <>
        <PageHeader title="Customer" back={BACK} />
        <LoadingState lines={6} label="Loading Customer" />
      </>
    );
  }
  if (!client) {
    return (
      <>
        <PageHeader title="Customer" back={BACK} />
        <EmptyState title="Customer not found" action={<ButtonLink to="/admin/customers">All Customers</ButtonLink>}>
          It may have been deleted.
        </EmptyState>
      </>
    );
  }
  return <ClientPage key={client.id} client={client} />;
}

function ClientPage({ client }: { client: Client }) {
  const { rows } = useBookingRows();
  const summary = clientSummary(rows, client.id);
  const bookings = useMemo(
    () => rows.filter((r) => r.booking.clientId === client.id).sort((a, b) => b.booking.bookingSeq - a.booking.bookingSeq),
    [rows, client.id],
  );
  return (
    <>
      <PageHeader
        title={client.name}
        back={BACK}
        subtitle={[client.city, client.email].filter(Boolean).join(', ') || undefined}
        actions={
          <>
            <ContactButtons phone={client.mobile} whatsapp={clientWhatsapp(client)} />
            <ButtonLink to={`/admin/bookings/new?client=${client.id}`} variant="primary" icon={<Plus aria-hidden />}>
              New booking
            </ButtonLink>
          </>
        }
      />
      <StatStrip
        label="Customer totals (Pending excluded)"
        items={[
          { label: 'Bookings', value: summary.bookings },
          { label: 'Billed', value: formatINR(summary.billed) },
          { label: 'Outstanding', value: formatINR(summary.outstanding) },
        ]}
      />
      {summary.refundsOwed > 0 ? <Note tone="warn">Refund owed to {client.name}: {formatINR(summary.refundsOwed)}.</Note> : null}
      <div className="adm-dir">
        <Panel title="Bookings" padded={false}>
          {bookings.length === 0 ? (
            <EmptyState
              title="No bookings yet"
              action={
                <ButtonLink to={`/admin/bookings/new?client=${client.id}`} icon={<Plus aria-hidden />}>
                  New booking
                </ButtonLink>
              }
            >
              Bookings for {client.name} appear here.
            </EmptyState>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table adm-table--cards">
                <caption className="visually-hidden">Bookings for {client.name}</caption>
                <thead>
                  <tr>
                    <th scope="col">Booking</th>
                    <th scope="col">Destination</th>
                    <th scope="col">Travel</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">
                      Selling price
                    </th>
                    <th scope="col" className="num">
                      Outstanding
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(({ booking: b, money: m }) => (
                    <tr key={b.id} className={b.status === 'Cancelled' ? 'is-cancelled' : undefined}>
                      <th scope="row">
                        <Link to={`/admin/bookings/${b.bookingNo}`} className="adm-strong-link">
                          {b.bookingNo}
                        </Link>
                      </th>
                      <td data-label="Destination">{b.destination}</td>
                      <td data-label="Travel">{dateRange(bookingDate(b), bookingEndDate(b))}</td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td data-label="Selling price" className="num">
                        {formatINR(m.sellingPrice)}
                      </td>
                      <td data-label="Outstanding" className="num">
                        <Outstanding value={m.clientOutstanding} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <ClientDetailsPanel client={client} usedIn={summary.usedIn} />
      </div>
    </>
  );
}

function ClientDetailsPanel({ client, usedIn }: { client: Client; usedIn: number }) {
  const { db, clients } = useAdminData();
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() => clientInputOf(client));
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fields = clientFieldsOf(value);
  const errors = clientErrors(fields, clients.data, client.id);

  const startEdit = () => {
    setValue(clientInputOf(client));
    setTried(false);
    setFailure('');
    setEditing(true);
  };
  const save = async () => {
    setTried(true);
    if (hasErrors(errors)) return;
    setBusy(true);
    setFailure('');
    try {
      await updateClient(db, client.id, fields);
      setEditing(false);
      toast('Customer saved.');
    } catch (err) {
      setFailure(errorMessage(err as Error));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setDeleting(true);
    try {
      await deleteClient(db, client.id);
      toast(`${client.name} deleted.`);
      navigate('/admin/customers', { replace: true });
    } catch (err) {
      setDeleting(false);
      setConfirmDelete(false);
      toast(errorMessage(err as Error), { tone: 'danger' });
    }
  };

  return (
    <Panel
      title="Details"
      padded={false}
      actions={
        editing ? null : (
          <Button size="sm" icon={<Pencil aria-hidden />} onClick={startEdit}>
            Edit
          </Button>
        )
      }
    >
      <div className="adm-panel__body">
        {editing ? (
          <form
            className="adm-stack"
            aria-label="Edit customer details"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <ClientFormFields value={value} onChange={setValue} errors={tried ? errors : {}} />
            {failure ? <Note tone="danger">{failure}</Note> : null}
            <div className="adm-actions">
              <Button type="submit" variant="primary" busy={busy}>
                Save
              </Button>
              <Button onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <KeyValues
            items={[
              { label: 'Mobile', value: client.mobile },
              {
                label: 'WhatsApp',
                value: client.whatsappSameAsMobile ? <>{client.mobile} <span className="adm-muted">(same as mobile)</span></> : client.whatsapp || NONE,
              },
              { label: 'Email', value: client.email || NONE },
              { label: 'Address', value: client.address ? <span className="adm-pre">{client.address}</span> : NONE },
              { label: 'City', value: client.city || NONE },
              { label: 'State', value: client.state || NONE },
              { label: 'Country', value: client.country || NONE },
              {
                label: 'Emergency contact',
                value: [client.emergencyName, client.emergencyPhone].filter(Boolean).join(', ') || NONE,
              },
              { label: 'GST number', value: client.gstin || NONE },
              { label: 'PAN number', value: client.pan || NONE },
              { label: 'Notes', value: client.notes ? <span className="adm-pre">{client.notes}</span> : NONE },
            ]}
          />
        )}
      </div>
      <div className="adm-danger-zone">
        <Button size="sm" icon={<Trash2 aria-hidden />} disabled={usedIn > 0} onClick={() => setConfirmDelete(true)}>
          Delete customer
        </Button>
        {usedIn > 0 ? (
          <span className="adm-muted">
            Used in {usedIn} {usedIn === 1 ? 'booking' : 'bookings'}, so it can't be deleted.
          </span>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${client.name}?`}
        confirmLabel="Delete customer"
        danger
        busy={deleting}
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
      >
        <p>This removes the Customer record. It can't be undone.</p>
      </ConfirmDialog>
    </Panel>
  );
}
