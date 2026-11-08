/**
 * Settings → Data (own buttons, not part of the profile Save): JSON Backup (+ last backup on this device),
 * Payments Ledger CSV (date range + side), Clients CSV, DMCs CSV.
 */
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { projectIdOf, readBackupCollections, useAdminData, useBookingRows } from '../../data';
import {
  backupFilename,
  backupJson,
  clientCsvRows,
  clientsCsv,
  clientsFilename,
  CSV_MIME,
  dmcCsvRows,
  dmcsCsv,
  dmcsFilename,
  downloadText,
  JSON_MIME,
  LEDGER_PRESETS,
  ledgerCsv,
  ledgerFilename,
  ledgerPeriod,
  ledgerRows,
  recordBackup,
  useLastBackup,
  type LedgerPreset,
  type LedgerSide,
} from '../../export';
import { formatDate, isBackupOverdue, isISODate, todayIST } from '../../model';
import { Button, errorMessage, Field, Note, Panel, useToast } from '../../ui';

const PRESET_LABELS: Record<LedgerPreset, string> = { thisFy: 'This FY', lastFy: 'Last FY', thisMonth: 'This month', custom: 'Custom' };
const SIDE_LABELS: Record<LedgerSide, string> = { both: 'Both', client: 'Client', dmc: 'DMC' };

export function DataCard() {
  return (
    <Panel id="data" title="Data">
      <div className="adm-stack">
        <BackupRow />
        <LedgerRow />
        <DirectoryRow />
      </div>
    </Panel>
  );
}

function BackupRow() {
  const { db } = useAdminData();
  const toast = useToast();
  const lastBackup = useLastBackup();
  const [busy, setBusy] = useState(false);
  const today = todayIST();

  const download = async () => {
    setBusy(true);
    try {
      const collections = await readBackupCollections(db);
      downloadText(backupFilename(today), backupJson({ projectId: projectIdOf(db), exportedAt: new Date(), collections }), JSON_MIME);
      recordBackup(today);
      toast('Backup downloaded');
    } catch (err) {
      toast(`Couldn't download the backup. ${errorMessage(err as Error)}`, { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="adm-stack adm-data-block" aria-labelledby="backup-h">
      <h3 id="backup-h" className="adm-h3">
        Backup
      </h3>
      <p className="adm-muted">
        A complete copy of Clients, DMCs, Bookings, Enquiries, counters and the Business profile as one JSON file. There is no restore
        in the app: keep the file safe; it holds everything needed to rebuild the data with a script if it is ever lost.
      </p>
      <div className="adm-data-row">
        <Button variant="primary" icon={<Download aria-hidden />} busy={busy} onClick={() => void download()}>
          Download backup
        </Button>
        <span className="adm-muted" role="status">
          Last backup on this device: {lastBackup ? formatDate(lastBackup) : 'never'}
        </span>
      </div>
      {isBackupOverdue(lastBackup, today) ? (
        <Note tone="warn">{lastBackup ? 'The last backup is more than 30 days old.' : 'No backup has been taken on this device yet.'} Download one now.</Note>
      ) : null}
    </section>
  );
}

function LedgerRow() {
  const { bookings, clientsById, dmcsById } = useAdminData();
  const rowsState = useBookingRows();
  const today = todayIST();
  const [preset, setPreset] = useState<LedgerPreset>('thisFy');
  const [side, setSide] = useState<LedgerSide>('both');
  const fy = ledgerPeriod('thisFy', today);
  const [custom, setCustom] = useState({ from: fy.from, to: today });
  const customValid = isISODate(custom.from) && isISODate(custom.to) && custom.from <= custom.to;
  const period = preset === 'custom' ? custom : ledgerPeriod(preset, today);
  const ready = rowsState.status === 'ready' && (preset !== 'custom' || customValid);

  const { from, to } = period;
  const rows = useMemo(
    () => (ready ? ledgerRows(bookings.data, clientsById, dmcsById, { from, to, side }) : []),
    [ready, bookings.data, clientsById, dmcsById, from, to, side],
  );

  return (
    <section className="adm-stack adm-data-block" aria-labelledby="ledger-h">
      <h3 id="ledger-h" className="adm-h3">
        Payments ledger
      </h3>
      <p className="adm-muted">
        Every Client Payment, DMC Payment and Refund by payment date, including Cancelled bookings. Signed amount: money in +, money out −.
      </p>
      <div className="adm-filters">
        <Field label="Period">
          <select value={preset} onChange={(e) => setPreset(e.target.value as LedgerPreset)}>
            {LEDGER_PRESETS.map((p) => (
              <option key={p} value={p}>
                {PRESET_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
        {preset === 'custom' ? (
          <>
            <Field label="From">
              <input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
            </Field>
            <Field label="To" error={customValid ? undefined : 'End on or after the start.'}>
              <input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
            </Field>
          </>
        ) : null}
        <Field label="Side">
          <select value={side} onChange={(e) => setSide(e.target.value as LedgerSide)}>
            {(['both', 'client', 'dmc'] as const).map((s) => (
              <option key={s} value={s}>
                {SIDE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Button
          icon={<Download aria-hidden />}
          disabled={!ready}
          onClick={() => downloadText(ledgerFilename(period), ledgerCsv(rows), CSV_MIME)}
        >
          Export payments CSV
        </Button>
      </div>
      <span className="adm-muted" role="status">
        {rowsState.status === 'loading'
          ? 'Loading bookings…'
          : rowsState.status === 'error'
            ? "Couldn't load Bookings, so the ledger can't be exported. Reload the page and try again."
            : ready
              ? `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}, ${formatDate(period.from)} – ${formatDate(period.to)}`
              : ''}
      </span>
    </section>
  );
}

function DirectoryRow() {
  const { clients, dmcs } = useAdminData();
  const rowsState = useBookingRows();
  const ready = rowsState.status === 'ready';
  const today = todayIST();
  return (
    <section className="adm-stack adm-data-block" aria-labelledby="dir-h">
      <h3 id="dir-h" className="adm-h3">
        Clients and DMCs
      </h3>
      <p className="adm-muted">Every field of each record, plus its Bookings count.</p>
      <div className="adm-actions">
        <Button
          icon={<Download aria-hidden />}
          disabled={!ready}
          onClick={() => downloadText(clientsFilename(today), clientsCsv(clientCsvRows(clients.data, rowsState.rows)), CSV_MIME)}
        >
          Export Clients CSV
        </Button>
        <Button
          icon={<Download aria-hidden />}
          disabled={!ready}
          onClick={() => downloadText(dmcsFilename(today), dmcsCsv(dmcCsvRows(dmcs.data, rowsState.rows)), CSV_MIME)}
        >
          Export DMCs CSV
        </Button>
      </div>
    </section>
  );
}
