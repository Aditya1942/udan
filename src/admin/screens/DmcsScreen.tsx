import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAdminData, useBookingRows } from '../data';
import { dmcSummary, formatDate, formatINR, todayIST } from '../model';
import { Button, Checkbox, DataRegion, EmptyState, PageHeader, useAdminTitle, useToast } from '../ui';
import { DmcDialog } from './shared/DmcDialog';
import { matchesText, NONE, Outstanding, SearchBox, useRetryRows, useSearchParam } from './directory/shared';

/** `/admin/dmcs` — search + "Only with money owed"; table with Net cost, You owe, Next pay by; New DMC dialog. */
export function DmcsScreen() {
  useAdminTitle('DMCs');
  const { dmcs } = useAdminData();
  const rowsState = useBookingRows();
  const retryRows = useRetryRows();
  const [q] = useSearchParam('q');
  const [owing, setOwing] = useSearchParam('owing');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const today = todayIST();

  const list = useMemo(
    () =>
      dmcs.data
        .filter((d) => matchesText(q, d.name, d.region, d.contactPerson, d.phone, d.email))
        .map((d) => ({ dmc: d, summary: dmcSummary(rowsState.rows, d.id) }))
        .filter(({ summary }) => !owing || summary.outstanding > 0),
    [dmcs.data, rowsState.rows, q, owing],
  );

  const newButton = (
    <Button variant="primary" icon={<Plus aria-hidden />} onClick={() => setCreating(true)}>
      New DMC
    </Button>
  );
  return (
    <>
      <PageHeader title="DMCs" subtitle="Payments to DMCs are recorded on each booking." actions={newButton} />
      <DataRegion
        status={rowsState.status}
        error={rowsState.errors[0]}
        onRetry={retryRows}
        errorTitle="Couldn't load DMCs"
        isEmpty={dmcs.data.length === 0}
        empty={
          <EmptyState title="No DMCs yet" action={newButton}>
            DMCs are added here or from a booking's service lines.
          </EmptyState>
        }
      >
        <div className="adm-table-tools">
          <SearchBox label="Search DMCs" placeholder="Search name, region, contact" />
          <Checkbox label="Only with money owed" checked={!!owing} onChange={(e) => setOwing(e.target.checked ? '1' : '')} />
        </div>
        {list.length === 0 ? (
          <EmptyState title={owing ? 'No DMCs are owed money' : 'No DMCs match'}>
            {owing ? 'Every DMC is paid up.' : 'Try a different name, region or contact.'}
          </EmptyState>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--dir adm-table--cards">
              <thead>
                <tr>
                  <th scope="col">DMC</th>
                  <th scope="col">Region</th>
                  <th scope="col">Contact</th>
                  <th scope="col" className="num">
                    Bookings
                  </th>
                  <th scope="col" className="num">
                    Net cost
                  </th>
                  <th scope="col" className="num">
                    You owe
                  </th>
                  <th scope="col">Next pay by</th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ dmc: d, summary: s }) => (
                  <tr key={d.id}>
                    <th scope="row">
                      <Link to={`/admin/dmcs/${d.id}`} className="adm-strong-link">
                        {d.name}
                      </Link>
                    </th>
                    <td data-label="Region" data-hide-sm={d.region ? undefined : ''}>
                      {d.region}
                    </td>
                    <td data-label="Contact" data-hide-sm={d.contactPerson || d.phone ? undefined : ''}>
                      {d.contactPerson}
                      {d.phone ? <span className="adm-sub">{d.phone}</span> : null}
                    </td>
                    <td data-label="Bookings" className="num">
                      {s.bookings}
                    </td>
                    <td data-label="Net cost" className="num" data-hide-sm="">
                      {formatINR(s.netCost)}
                    </td>
                    <td data-label="You owe" className="num">
                      <Outstanding value={s.outstanding} negative="Due back" />
                    </td>
                    <td data-label="Next pay by" className={s.nextPayBy && s.nextPayBy < today ? 'is-overdue' : undefined}>
                      {s.nextPayBy ? formatDate(s.nextPayBy) : NONE}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataRegion>
      <DmcDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          toast('DMC created.');
          navigate(`/admin/dmcs/${id}`);
        }}
      />
    </>
  );
}
