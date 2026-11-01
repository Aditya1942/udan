/**
 * Booking detail = editor (Variant B, edit in place) and New booking (same page, every section open).
 * Main column: Client, Travel, Price, Service lines, [Client payments, DMC payments], Notes — each with its own
 * Edit / Save / Cancel. Rail: Money (live from unsaved values) + Documents card, or Create booking on New.
 * Under 60rem the rail moves above the sections and stops sticking (CSS).
 */
import { Pencil } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { createBooking, saveBookingSection, useAdminData } from '../../data';
import { formatBookingNo, formatDate, todayIST, travelEndedNotCompleted, type Booking, type Client } from '../../model';
import { Button, errorMessage, Note, PageHeader, Panel, StatusBadge, useToast } from '../../ui';
import { DocumentsCard } from './DocumentsCard';
import { ClientFields, LinesFields, NotesFields, PriceFields, TravelFields } from './fields';
import {
  formFromBooking,
  isValid,
  liveMoneyInput,
  resetSection,
  SECTION_KEYS,
  SECTION_TITLES,
  sectionErrors,
  sectionPatch,
  newClientFields,
  toCreateArgs,
  type BookingForm,
  type SectionErrors,
  type SectionKey,
} from './form';
import { MoneyPanel } from './MoneyRail';
import { PaymentsSection } from './PaymentsSection';
import { StatusControl } from './StatusControl';
import { ClientView, dateRange, LinesTable, NotesView, PriceView, TravelView } from './views';

export const BOOKINGS_BACK = { to: '/admin?view=table&scope=all', label: 'Bookings' };

const NO_ERRORS: SectionErrors = { fields: {}, lines: {} };

/** Conversion context for New booking from an Enquiry. */
export type ConversionContext = { enquiryId: string; mobile: string; matchedClient?: Client };

type EditorState = {
  form: BookingForm;
  set: (patch: Partial<BookingForm>) => void;
  errorsFor: (section: SectionKey) => SectionErrors;
};

function useEditor(initial: () => BookingForm, clients: readonly Client[]) {
  const [form, setForm] = useState(initial);
  const [tried, setTried] = useState<ReadonlySet<SectionKey>>(new Set());
  const set = (patch: Partial<BookingForm>) => setForm((f) => ({ ...f, ...patch }));
  const errorsFor = (section: SectionKey) => (tried.has(section) ? sectionErrors(section, form, clients) : NO_ERRORS);
  return { form, setForm, set, tried, setTried, errorsFor };
}

function SectionFields({
  section,
  editor,
  booking,
  conversion,
}: {
  section: SectionKey;
  editor: EditorState;
  booking?: Booking;
  conversion?: ConversionContext;
}) {
  const { clients, dmcs } = useAdminData();
  const { form, set } = editor;
  const errors = editor.errorsFor(section);
  switch (section) {
    case 'client':
      return <ClientFields form={form} set={set} errors={errors.fields} clients={clients.data} conversion={conversion} />;
    case 'travel':
      return <TravelFields form={form} set={set} errors={errors.fields} />;
    case 'price':
      return <PriceFields form={form} set={set} errors={errors.fields} />;
    case 'lines':
      return <LinesFields form={form} set={set} errors={errors.lines} dmcs={dmcs.data} dmcPayments={booking?.dmcPayments ?? []} />;
    case 'notes':
      return <NotesFields form={form} set={set} />;
  }
}

function SectionView({ section, booking }: { section: SectionKey; booking: Booking }) {
  const { clientsById, dmcsById } = useAdminData();
  switch (section) {
    case 'client':
      return <ClientView client={clientsById.get(booking.clientId)} />;
    case 'travel':
      return <TravelView booking={booking} />;
    case 'price':
      return <PriceView booking={booking} />;
    case 'lines':
      return <LinesTable booking={booking} dmcsById={dmcsById} />;
    case 'notes':
      return <NotesView booking={booking} />;
  }
}

function Layout({ main, rail }: { main: ReactNode; rail: ReactNode }) {
  return (
    <div className="adm-booking">
      <div className="adm-booking__main">{main}</div>
      <aside className="adm-booking__rail" aria-label="Money and documents">
        {rail}
      </aside>
    </div>
  );
}

/* ---------------- Booking detail ---------------- */

export function BookingDetail({ booking }: { booking: Booking }) {
  const { db, clients, clientsById, dmcsById } = useAdminData();
  const toast = useToast();
  const editor = useEditor(() => formFromBooking(booking), clients.data);
  const [open, setOpen] = useState<ReadonlySet<SectionKey>>(new Set());
  const [saving, setSaving] = useState<SectionKey | null>(null);
  const client = clientsById.get(booking.clientId);
  const today = todayIST();

  const toggle = (section: SectionKey, on: boolean) => {
    setOpen((s) => {
      const next = new Set(s);
      if (on) next.add(section);
      else next.delete(section);
      return next;
    });
    editor.setTried((s) => {
      const next = new Set(s);
      next.delete(section);
      return next;
    });
  };
  const edit = (section: SectionKey) => {
    editor.setForm((f) => resetSection(f, booking, section));
    toggle(section, true);
  };
  const cancel = (section: SectionKey) => {
    editor.setForm((f) => resetSection(f, booking, section));
    toggle(section, false);
  };
  const save = async (section: SectionKey) => {
    editor.setTried((s) => new Set(s).add(section));
    if (!isValid(sectionErrors(section, editor.form, clients.data))) return;
    setSaving(section);
    try {
      const newClient = section === 'client' && editor.form.clientMode === 'new' ? newClientFields(editor.form.newClient) : undefined;
      await saveBookingSection(db, booking.id, newClient ? {} : sectionPatch(section, editor.form), { newClient });
      toggle(section, false);
      toast(`${SECTION_TITLES[section]} saved`);
    } catch (err) {
      toast(`Couldn't save ${SECTION_TITLES[section]}. ${errorMessage(err as Error)}`, { tone: 'danger' });
    } finally {
      setSaving(null);
    }
  };

  const section = (key: SectionKey) => {
    const editing = open.has(key);
    const title = SECTION_TITLES[key];
    return (
      <Panel
        key={key}
        title={title}
        padded={false}
        actions={
          editing ? null : (
            <Button size="sm" icon={<Pencil aria-hidden />} onClick={() => edit(key)} aria-label={`Edit ${title}`}>
              Edit
            </Button>
          )
        }
      >
        {editing ? (
          <div className="adm-panel__body">
            <SectionFields section={key} editor={editor} booking={booking} />
            <div className="adm-section-foot">
              <Button variant="primary" busy={saving === key} onClick={() => void save(key)}>
                Save
              </Button>
              <Button onClick={() => cancel(key)} disabled={saving === key}>
                Cancel
              </Button>
            </div>
          </div>
        ) : key === 'lines' ? (
          <SectionView section={key} booking={booking} />
        ) : (
          <div className="adm-panel__body">
            <SectionView section={key} booking={booking} />
          </div>
        )}
      </Panel>
    );
  };

  const subtitle = [client?.name, booking.destination, dateRange(booking.travelStart, booking.travelEnd)].filter(Boolean).join(', ');

  return (
    <>
      <PageHeader
        title={booking.bookingNo}
        titleExtra={<StatusBadge status={booking.status} />}
        subtitle={subtitle}
        back={BOOKINGS_BACK}
        actions={<StatusControl booking={booking} dmcsById={dmcsById} />}
      >
        {booking.status === 'Cancelled' ? (
          <Note tone="danger">
            Cancelled{booking.cancelledAt ? ` ${formatDate(booking.cancelledAt)}` : ''}: {booking.cancelReason}
          </Note>
        ) : null}
        {travelEndedNotCompleted(booking, today) ? (
          <Note tone="warn">Travel ended {formatDate(booking.travelEnd)}. Mark Completed?</Note>
        ) : null}
      </PageHeader>
      <Layout
        main={
          <>
            {section('client')}
            {section('travel')}
            {section('price')}
            {section('lines')}
            <PaymentsSection booking={booking} side="client" dmcsById={dmcsById} />
            <PaymentsSection booking={booking} side="dmc" dmcsById={dmcsById} />
            {section('notes')}
          </>
        }
        rail={
          <>
            <MoneyPanel input={liveMoneyInput(booking, editor.form, open)} />
            <DocumentsCard booking={booking} client={client} />
          </>
        }
      />
    </>
  );
}

/* ---------------- New booking ---------------- */

export function NewBooking({ initial, conversion }: { initial: BookingForm; conversion?: ConversionContext }) {
  const { db, clients, bookings } = useAdminData();
  const toast = useToast();
  const navigate = useNavigate();
  const editor = useEditor(() => initial, clients.data);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const all = useMemo(() => new Set(SECTION_KEYS), []);
  const nextNo = formatBookingNo(bookings.data.reduce((m, b) => Math.max(m, b.bookingSeq), 0) + 1);

  const invalid = editor.tried.size > 0 && SECTION_KEYS.some((k) => !isValid(sectionErrors(k, editor.form, clients.data)));

  const create = async () => {
    editor.setTried(all);
    setFailure('');
    if (SECTION_KEYS.some((k) => !isValid(sectionErrors(k, editor.form, clients.data)))) return;
    setBusy(true);
    try {
      const { draft, newClient } = toCreateArgs(editor.form);
      const created = await createBooking(db, draft, { newClient, enquiryId: conversion?.enquiryId });
      toast(`Created ${created.bookingNo}`);
      navigate(`/admin/bookings/${created.bookingNo}`, { replace: true, state: { created: true } });
    } catch (err) {
      setFailure(errorMessage(err as Error));
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="New booking" subtitle={`Gets ${nextNo} on save. Status starts as Pending.`} back={BOOKINGS_BACK} />
      <Layout
        main={
          <>
            {SECTION_KEYS.map((key) => (
              <Panel key={key} title={SECTION_TITLES[key]}>
                <SectionFields section={key} editor={editor} conversion={key === 'client' ? conversion : undefined} />
              </Panel>
            ))}
            <p className="adm-muted">Client and DMC payments are added on the booking page after it is created.</p>
          </>
        }
        rail={
          <>
            <MoneyPanel input={liveMoneyInput(undefined, editor.form, all)} />
            <Button variant="primary" block busy={busy} onClick={() => void create()}>
              Create booking
            </Button>
            {invalid ? <Note tone="danger">Fix the highlighted fields, then create the booking.</Note> : null}
            {failure ? <Note tone="danger">Couldn't create the booking. {failure}</Note> : null}
          </>
        }
      />
    </>
  );
}
