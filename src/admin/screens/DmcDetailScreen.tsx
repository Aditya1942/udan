import { Pencil, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { deleteDmc, updateDmc, useAdminData, useBookingRows } from '../data';
import { dmcSummary, formatDate, formatINR, hasErrors, todayIST, validateDmc, type Dmc } from '../model';
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
import { ContactButtons, DmcFormFields, dmcFieldsOf, dmcInputOf, NONE, Outstanding, useRetryRows } from './directory/shared';

const BACK = { to: '/admin/dmcs', label: 'DMCs' };

/** `/admin/dmcs/:id` — head (tel / WhatsApp / Edit), strip, every Booking this DMC serves, Details with Edit/Delete. */
export function DmcDetailScreen() {
  const { id = '' } = useParams();
  const { dmcsById } = useAdminData();
  const rowsState = useBookingRows();
  const retryRows = useRetryRows();
  const dmc = dmcsById.get(id);
  useAdminTitle(dmc?.name ?? 'DMC');

  if (rowsState.status === 'error') {
    return (
      <>
        <PageHeader title="DMC" back={BACK} />
        <ErrorState title="Couldn't load this DMC" error={rowsState.errors[0]} onRetry={retryRows} />
      </>
    );
  }
  if (rowsState.status === 'loading') {
    return (
      <>
        <PageHeader title="DMC" back={BACK} />
        <LoadingState lines={6} label="Loading DMC" />
      </>
    );
  }
  if (!dmc) {
    return (
      <>
        <PageHeader title="DMC" back={BACK} />
        <EmptyState title="DMC not found" action={<ButtonLink to="/admin/dmcs">All DMCs</ButtonLink>}>
          It may have been deleted.
        </EmptyState>
      </>
    );
  }
  return <DmcPage key={dmc.id} dmc={dmc} />;
}

function DmcPage({ dmc }: { dmc: Dmc }) {
  const { rows } = useBookingRows();
  const summary = dmcSummary(rows, dmc.id);
  const [editing, setEditing] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const today = todayIST();
  const list = [...summary.rows].sort((a, b) => b.row.booking.bookingSeq - a.row.booking.bookingSeq);

  const edit = () => {
    setEditing(true);
    detailsRef.current?.scrollIntoView?.({ block: 'nearest' });
  };
  return (
    <>
      <PageHeader
        title={dmc.name}
        back={BACK}
        subtitle={[dmc.region, dmc.contactPerson].filter(Boolean).join(', ') || undefined}
        actions={
          <>
            <ContactButtons phone={dmc.phone} />
            <Button icon={<Pencil aria-hidden />} onClick={edit} disabled={editing}>
              Edit
            </Button>
          </>
        }
      />
      <StatStrip
        label="DMC totals (Pending excluded)"
        items={[
          { label: 'Bookings', value: summary.bookings },
          { label: 'Net cost', value: formatINR(summary.netCost) },
          {
            label: 'You owe',
            value: (
              <>
                <Outstanding value={summary.outstanding} negative="Due back" />
                {summary.nextPayBy ? (
                  <span className={`adm-sub${summary.nextPayBy < today ? ' is-overdue' : ''}`}>next by {formatDate(summary.nextPayBy)}</span>
                ) : null}
              </>
            ),
          },
        ]}
      />
      <div className="adm-dir">
        <Panel title={`Bookings with ${dmc.name}`} padded={false}>
          {list.length === 0 ? (
            <EmptyState title="No bookings yet">Bookings with a service line from {dmc.name} appear here.</EmptyState>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table adm-table--cards">
                <caption className="visually-hidden">Bookings with {dmc.name}</caption>
                <thead>
                  <tr>
                    <th scope="col">Booking</th>
                    <th scope="col">Client</th>
                    <th scope="col">Services</th>
                    <th scope="col">Status</th>
                    <th scope="col">Pay by</th>
                    <th scope="col" className="num">
                      Cost
                    </th>
                    <th scope="col" className="num">
                      Paid
                    </th>
                    <th scope="col" className="num">
                      Outstanding
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const b = r.row.booking;
                    const late = r.outstanding > 0 && !!r.payBy && r.payBy < today;
                    return (
                      <tr key={b.id} className={b.status === 'Cancelled' ? 'is-cancelled' : undefined}>
                        <th scope="row">
                          <Link to={`/admin/bookings/${b.bookingNo}`} className="adm-strong-link">
                            {b.bookingNo}
                          </Link>
                        </th>
                        <td data-label="Client">
                          {r.row.client?.name ?? <span className="adm-muted">Missing Client</span>}
                          <span className="adm-sub">{dateRange(b.travelStart, b.travelEnd)}</span>
                        </td>
                        <td data-label="Services">{r.lines.map((l) => l.type).join(', ') || <span className="adm-muted">Payments only</span>}</td>
                        <td>
                          <StatusBadge status={b.status} />
                        </td>
                        <td data-label="Pay by" className={late ? 'is-overdue' : undefined}>
                          {r.payBy ? formatDate(r.payBy) : NONE}
                        </td>
                        <td data-label="Cost" className="num">
                          {formatINR(r.cost)}
                        </td>
                        <td data-label="Paid" className="num">
                          {formatINR(r.paid)}
                        </td>
                        <td data-label="Outstanding" className="num">
                          <Outstanding value={r.outstanding} negative="Due back" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <div ref={detailsRef}>
          <DmcDetailsPanel dmc={dmc} usedIn={summary.usedIn} editing={editing} setEditing={setEditing} />
        </div>
      </div>
    </>
  );
}

function DmcDetailsPanel({ dmc, usedIn, editing, setEditing }: { dmc: Dmc; usedIn: number; editing: boolean; setEditing: (v: boolean) => void }) {
  const { db } = useAdminData();
  const navigate = useNavigate();
  const toast = useToast();
  const [value, setValue] = useState(() => dmcInputOf(dmc));
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fields = dmcFieldsOf(value);
  const errors = validateDmc(fields);

  const [wasEditing, setWasEditing] = useState(editing);
  if (editing !== wasEditing) {
    // Opening the form (from the head's Edit or the panel's) starts from the saved record.
    setWasEditing(editing);
    if (editing) {
      setValue(dmcInputOf(dmc));
      setTried(false);
      setFailure('');
    }
  }

  const save = async () => {
    setTried(true);
    if (hasErrors(errors)) return;
    setBusy(true);
    setFailure('');
    try {
      await updateDmc(db, dmc.id, fields);
      setEditing(false);
      toast('DMC saved.');
    } catch (err) {
      setFailure(errorMessage(err as Error));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setDeleting(true);
    try {
      await deleteDmc(db, dmc.id);
      toast(`${dmc.name} deleted.`);
      navigate('/admin/dmcs', { replace: true });
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
          <Button size="sm" icon={<Pencil aria-hidden />} onClick={() => setEditing(true)}>
            Edit
          </Button>
        )
      }
    >
      <div className="adm-panel__body">
        {editing ? (
          <form
            className="adm-stack"
            aria-label="Edit DMC details"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <DmcFormFields value={value} onChange={setValue} errors={tried ? errors : {}} />
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
              { label: 'Contact person', value: dmc.contactPerson || NONE },
              { label: 'Phone', value: dmc.phone || NONE },
              { label: 'Email', value: dmc.email || NONE },
              { label: 'Region', value: dmc.region || NONE },
              { label: 'Notes', value: dmc.notes ? <span className="adm-pre">{dmc.notes}</span> : NONE },
            ]}
          />
        )}
      </div>
      <div className="adm-danger-zone">
        <Button size="sm" icon={<Trash2 aria-hidden />} disabled={usedIn > 0} onClick={() => setConfirmDelete(true)}>
          Delete DMC
        </Button>
        {usedIn > 0 ? (
          <span className="adm-muted">
            Used in {usedIn} {usedIn === 1 ? 'booking' : 'bookings'}, so it can't be deleted.
          </span>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${dmc.name}?`}
        confirmLabel="Delete DMC"
        danger
        busy={deleting}
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
      >
        <p>This removes the DMC record. It can't be undone.</p>
      </ConfirmDialog>
    </Panel>
  );
}
