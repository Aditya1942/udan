/** Clients / DMCs CSV: every record field + a Bookings count (same count as the directory lists). No filters. */
import { clientSummary, dmcSummary, toISTDate, type BookingRow, type Client, type Dmc, type ISODate } from '../model';
import { csvFrom, type CsvColumn } from './csv';

const day = (d?: Date) => (d ? toISTDate(d) : '');

export type ClientCsvRow = { client: Client; bookings: number };
export type DmcCsvRow = { dmc: Dmc; bookings: number };

/** Bookings = counted Bookings (excl. Pending / Cancelled), as on the Clients list. */
export function clientCsvRows(clients: readonly Client[], rows: readonly BookingRow[]): ClientCsvRow[] {
  return clients.map((client) => ({ client, bookings: clientSummary(rows, client.id).bookings }));
}

export function dmcCsvRows(dmcs: readonly Dmc[], rows: readonly BookingRow[]): DmcCsvRow[] {
  return dmcs.map((dmc) => ({ dmc, bookings: dmcSummary(rows, dmc.id).bookings }));
}

export const CLIENT_COLUMNS: CsvColumn<ClientCsvRow>[] = [
  { header: 'Client ID', value: (r) => r.client.id },
  { header: 'Name', value: (r) => r.client.name },
  { header: 'Mobile', value: (r) => r.client.mobile },
  { header: 'Email', value: (r) => r.client.email },
  { header: 'City', value: (r) => r.client.city },
  { header: 'Notes', value: (r) => r.client.notes },
  { header: 'Bookings', value: (r) => r.bookings },
  { header: 'Created', value: (r) => day(r.client.createdAt) },
  { header: 'Updated', value: (r) => day(r.client.updatedAt) },
];

export const DMC_COLUMNS: CsvColumn<DmcCsvRow>[] = [
  { header: 'DMC ID', value: (r) => r.dmc.id },
  { header: 'Name', value: (r) => r.dmc.name },
  { header: 'Contact person', value: (r) => r.dmc.contactPerson },
  { header: 'Phone', value: (r) => r.dmc.phone },
  { header: 'Email', value: (r) => r.dmc.email },
  { header: 'Region', value: (r) => r.dmc.region },
  { header: 'Notes', value: (r) => r.dmc.notes },
  { header: 'Bookings', value: (r) => r.bookings },
  { header: 'Created', value: (r) => day(r.dmc.createdAt) },
  { header: 'Updated', value: (r) => day(r.dmc.updatedAt) },
];

export const clientsCsv = (rows: readonly ClientCsvRow[]) => csvFrom(CLIENT_COLUMNS, rows);
export const dmcsCsv = (rows: readonly DmcCsvRow[]) => csvFrom(DMC_COLUMNS, rows);

export const clientsFilename = (today: ISODate) => `udan-clients-${today}.csv`;
export const dmcsFilename = (today: ISODate) => `udan-dmcs-${today}.csv`;
