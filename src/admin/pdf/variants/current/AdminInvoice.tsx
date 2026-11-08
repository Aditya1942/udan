/**
 * Admin invoice — internal "Booking sheet" in the production "Minimal letter" language (InvoiceDocument.tsx):
 * wordmark left, title right, thin rules, muted 7.5pt labels. Lays out an `AdminInvoiceView`; decides nothing.
 */
import type { ReactNode } from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { PairValue } from '../../InvoiceDocument';
import { base, colour } from '../../theme';
import type { Tone } from '../../view';
import type { AdminInvoiceTemplate } from '../types';

const toneColour: Record<Tone, string> = { danger: colour.danger, action: colour.action, warn: colour.warn };

const s = StyleSheet.create({
  page: { paddingBottom: 56 },
  pill: {
    fontSize: 7.5,
    fontWeight: 600,
    letterSpacing: 0.5,
    lineHeight: 1.1,
    color: colour.danger,
    borderWidth: 1,
    borderColor: colour.danger,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  banner: {
    marginTop: 12,
    marginBottom: 16,
    paddingTop: 4,
    borderTopWidth: 0.75,
    borderTopColor: colour.danger,
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: 0.8,
    color: colour.danger,
  },
  section: { marginTop: 16 },
  sectionLabel: { fontSize: 7.5, color: colour.muted, marginBottom: 4 },
  th: { fontSize: 7.5, color: colour.muted, paddingBottom: 4, borderBottomWidth: 0.75, borderBottomColor: colour.ink },
  td: { paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: colour.border },
  tr: { flexDirection: 'row', fontSize: 8 },
  sub: { fontSize: 7.5, color: colour.muted },
  kpi: { flex: 1 },
  kpiValue: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, lineHeight: 1.25 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  totResult: { borderTopWidth: 1, borderTopColor: colour.ink, marginTop: 3, paddingTop: 4 },
  struck: { textDecoration: 'line-through', color: colour.muted },
  pending: { color: colour.warn },
});

/** Costing column widths (499pt content width; Service takes the rest). */
const W = { no: 18, supplier: 82, conf: 70, net: 62, payBy: 58, dmc: 70 };
/** Money movements column widths. */
const L = { date: 62, dir: 72, mode: 72, ref: 82, amount: 70 };

/** Section label + header + first row never split (no orphaned headers); later rows break between rows. */
function Table({ label, head, rows }: { label: string; head: ReactNode; rows: ReactNode[] }) {
  return (
    <View style={s.section}>
      <View wrap={false}>
        <Text style={s.sectionLabel}>{label}</Text>
        <View style={s.tr}>{head}</View>
        {rows[0]}
      </View>
      {rows.slice(1)}
    </View>
  );
}

/** Label/amount row of a mini totals block. */
const TotRow = ({ label, amount, muted, colour: c }: { label: string; amount: string; muted?: boolean; colour?: string }) => (
  <View style={s.totRow}>
    <Text style={muted ? base.muted : undefined}>{label}</Text>
    <Text style={[base.right, muted ? base.muted : c ? { color: c } : undefined]}>{amount}</Text>
  </View>
);

const TotResult = ({ label, amount, tone }: { label: string; amount: string; tone: Tone }) => (
  <View style={[s.totRow, s.totResult]}>
    <Text style={[base.h, { fontSize: 10, color: toneColour[tone] }]}>{label}</Text>
    <Text style={[base.h, base.right, { fontSize: 10, color: toneColour[tone] }]}>{amount}</Text>
  </View>
);

export const AdminInvoice: AdminInvoiceTemplate = ({ view: v, assets }) => {
  const p = v.profit;
  const cancelled = v.cancelledPill;
  const priceLabel = cancelled ? 'Cancellation charge' : 'Selling price';
  // Cancelled: the view's net cost is the sum of DMC cancellation charges.
  const costLabel = cancelled ? 'DMC cxl. charges' : 'Net cost';
  const tripLines = [v.trip.destination, v.trip.dates, v.trip.pax].filter(Boolean);

  const costRows = v.costLines.map((l) => (
    <View key={l.no} style={s.tr} wrap={false}>
      <Text style={[s.td, base.muted, { width: W.no }]}>{l.no}</Text>
      <View style={[s.td, { flex: 1, paddingRight: 8 }]}>
        <Text>
          <Text style={base.semi}>{l.type}</Text> · {l.description}
        </Text>
        <Text style={s.sub}>{l.dates}</Text>
      </View>
      <Text style={[s.td, { width: W.supplier, paddingRight: 6 }]}>{l.supplier}</Text>
      <Text style={[s.td, { width: W.conf, paddingRight: 6 }, l.confirmation.pending ? s.pending : {}]}>{l.confirmation.text}</Text>
      <View style={[s.td, { width: W.net }]}>
        <Text style={[base.right, l.cancellationCharge ? s.struck : {}]}>{l.netCost}</Text>
        {l.cancellationCharge ? <Text style={[base.right, { color: colour.danger }]}>{l.cancellationCharge}</Text> : null}
      </View>
      <Text style={[s.td, { width: W.payBy, paddingLeft: 8 }, l.payBy ? {} : base.muted]}>
        {l.payBy ? l.payBy.replace(/^Pay by /, '') : '—'}
      </Text>
      <View style={[s.td, { width: W.dmc }]}>
        {l.dmcPaid ? (
          <Text style={base.right}>
            <Text style={base.muted}>paid </Text>
            {l.dmcPaid}
          </Text>
        ) : null}
        {l.dmcOwed ? (
          <Text style={base.right}>
            <Text style={base.muted}>owed </Text>
            {l.dmcOwed}
          </Text>
        ) : null}
        {!l.dmcPaid && !l.dmcOwed ? <Text style={[base.right, base.muted]}>—</Text> : null}
      </View>
    </View>
  ));

  const dmcRows = v.dmcs.map((d, i) => (
    <View key={i} style={s.tr} wrap={false}>
      <View style={[s.td, { flex: 1, paddingRight: 8 }]}>
        <Text style={base.semi}>{d.name}</Text>
        {d.contact ? <Text style={s.sub}>{d.contact}</Text> : null}
      </View>
      <Text style={[s.td, base.right, { width: 80 }]}>{d.cost}</Text>
      <Text style={[s.td, base.right, { width: 80 }]}>{d.paid}</Text>
      <Text style={[s.td, base.right, { width: 110, color: toneColour[d.tone] }]}>
        <Text style={base.semi}>{d.label}</Text>
        {d.label === 'Settled' ? '' : ` ${d.outstanding}`}
      </Text>
    </View>
  ));

  const ledgerRows = v.ledger.map((e, i) => {
    const c = e.direction === 'In' ? colour.action : colour.danger;
    return (
      <View key={i} style={s.tr} wrap={false}>
        <Text style={[s.td, { width: L.date }]}>{e.date}</Text>
        <Text style={[s.td, { flex: 1, paddingRight: 8 }]}>{e.party}</Text>
        <Text style={[s.td, { width: L.dir }]}>
          <Text style={[base.semi, { color: c }]}>{e.direction}</Text>
          <Text style={base.muted}> · {e.kind}</Text>
        </Text>
        <Text style={[s.td, { width: L.mode, paddingRight: 6 }]}>{e.mode}</Text>
        <Text style={[s.td, { width: L.ref, paddingRight: 6 }, e.ref ? {} : base.muted]}>{e.ref || '—'}</Text>
        <Text style={[s.td, base.right, base.semi, { width: L.amount, color: c }]}>
          {e.direction === 'In' ? '+ ' : '− '}
          {e.amount}
        </Text>
      </View>
    );
  });

  return (
    <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
      <Page size="A4" style={[base.page, s.page]}>
        {/* Header */}
        <View style={base.head}>
          <Image src={assets.wordmark} style={base.wordmark} />
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[base.row, { alignItems: 'center', gap: 6 }]}>
              {cancelled && <Text style={s.pill}>CANCELLED</Text>}
              <Text style={s.pill}>INTERNAL</Text>
              <Text style={[base.title, { marginLeft: 2 }]}>Booking sheet</Text>
            </View>
            <Text style={[base.muted, { marginTop: 4 }]}>{v.invoiceNo}</Text>
            {v.dateLine ? <Text style={base.muted}>{v.dateLine}</Text> : null}
            <Text style={base.muted}>{v.bookingLine}</Text>
            <Text style={base.muted}>{v.preparedLine}</Text>
          </View>
        </View>

        <Text style={s.banner}>{v.internalBanner}</Text>

        {/* Client + Trip */}
        <View style={[base.row, { gap: 24 }]}>
          <View style={{ flex: 1 }}>
            <Text style={base.label}>Client</Text>
            {v.billedTo.name ? <Text style={base.semi}>{v.billedTo.name}</Text> : null}
            {v.billedToDetails.map((r, i) => (
              <View key={i} style={base.row}>
                <Text style={[base.muted, { width: 76, fontSize: 7.5, paddingTop: 1 }]}>{r.label}</Text>
                <PairValue text={r.value} />
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={base.label}>Trip</Text>
            <Text style={base.semi}>
              {v.categoryLabel} · {v.status}
            </Text>
            {tripLines.map((l, i) => (
              <Text key={i}>{l}</Text>
            ))}
            {v.trip.travellers.length > 0 && <Text style={[base.muted, { marginTop: 2 }]}>Travellers: {v.trip.travellers.join(', ')}</Text>}
          </View>
        </View>

        {cancelled && (v.cancelledNote || v.cancelReason) ? (
          <View style={{ marginTop: 16 }} wrap={false}>
            {v.cancelledNote ? <Text style={{ color: colour.danger }}>{v.cancelledNote}</Text> : null}
            {v.cancelReason ? (
              <Text style={{ color: colour.danger }}>
                <Text style={base.semi}>Reason: </Text>
                {v.cancelReason}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={[base.rule, { marginVertical: 16 }]} />

        {/* Headline numbers */}
        <View style={[base.row, { gap: 16 }]} wrap={false}>
          <View style={s.kpi}>
            <Text style={base.label}>{priceLabel}</Text>
            <Text style={s.kpiValue}>{p.sellingPrice}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={base.label}>{costLabel}</Text>
            <Text style={s.kpiValue}>{p.netCost}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={base.label}>Commission</Text>
            <Text style={[s.kpiValue, { color: toneColour[p.commissionTone] }]}>{p.commission}</Text>
            <Text style={s.sub}>{p.margin} margin</Text>
          </View>
          <View style={s.kpi}>
            <Text style={base.label}>Cash in hand</Text>
            <Text style={s.kpiValue}>{p.cashInHand}</Text>
          </View>
        </View>

        {costRows.length > 0 && (
          <Table
            label="Costing"
            head={
              <>
                <Text style={[s.th, { width: W.no }]}>No</Text>
                <Text style={[s.th, { flex: 1 }]}>Service</Text>
                <Text style={[s.th, { width: W.supplier }]}>Supplier</Text>
                <Text style={[s.th, { width: W.conf }]}>Conf.</Text>
                <Text style={[s.th, base.right, { width: W.net }]}>{cancelled ? 'Net / cxl.' : 'Net cost'}</Text>
                <Text style={[s.th, { width: W.payBy, paddingLeft: 8 }]}>Pay by</Text>
                <Text style={[s.th, base.right, { width: W.dmc }]}>DMC paid / owed</Text>
              </>
            }
            rows={costRows}
          />
        )}

        {/* Client account + Supplier account */}
        <View style={[base.row, { gap: 32, marginTop: 16 }]} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionLabel}>Client account</Text>
            <TotRow label={priceLabel} amount={p.sellingPrice} />
            <TotRow label="Received (net of refunds)" amount={p.clientReceived} muted />
            <TotResult label="Client outstanding" amount={p.clientOutstanding} tone={p.clientOutstandingTone} />
            {v.totals.result.note ? <Text style={[s.sub, base.right, { marginTop: 2 }]}>{v.totals.result.note}</Text> : null}
          </View>
          {v.dmcs.length > 0 ? (
            <View style={{ flex: 1 }}>
              <Text style={s.sectionLabel}>Supplier account</Text>
              <TotRow label={costLabel} amount={p.netCost} />
              <TotRow label={`Commission (${p.margin})`} amount={p.commission} colour={toneColour[p.commissionTone]} />
              <TotResult label="Owed to DMCs" amount={p.dmcOutstanding} tone={p.dmcOutstandingTone} />
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>

        {dmcRows.length > 0 && (
          <Table
            label="Suppliers"
            head={
              <>
                <Text style={[s.th, { flex: 1 }]}>DMC</Text>
                <Text style={[s.th, base.right, { width: 80 }]}>Cost</Text>
                <Text style={[s.th, base.right, { width: 80 }]}>Paid</Text>
                <Text style={[s.th, base.right, { width: 110 }]}>Outstanding</Text>
              </>
            }
            rows={dmcRows}
          />
        )}

        {ledgerRows.length > 0 && (
          <Table
            label="Money movements"
            head={
              <>
                <Text style={[s.th, { width: L.date }]}>Date</Text>
                <Text style={[s.th, { flex: 1 }]}>Party</Text>
                <Text style={[s.th, { width: L.dir }]}>In / Out</Text>
                <Text style={[s.th, { width: L.mode }]}>Mode</Text>
                <Text style={[s.th, { width: L.ref }]}>Ref</Text>
                <Text style={[s.th, base.right, { width: L.amount }]}>Amount</Text>
              </>
            }
            rows={ledgerRows}
          />
        )}

        {v.internalNotes.length > 0 && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionLabel}>Internal notes</Text>
            {v.internalNotes.map((n, i) => (
              <View key={i} style={[base.row, { gap: 6, marginBottom: 2 }]}>
                <Text style={base.muted}>–</Text>
                <Text style={{ flex: 1 }}>{n}</Text>
              </View>
            ))}
          </View>
        )}

        <View fixed style={base.footer}>
          {v.footer.map((l, i) => (
            <Text key={i}>{l}</Text>
          ))}
        </View>
      </Page>
    </Document>
  );
};
