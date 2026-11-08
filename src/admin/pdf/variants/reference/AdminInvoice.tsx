/**
 * "Reference" admin invoice: the invoice #402 letterhead language turned into an internal booking sheet. Red
 * internal banner on every page, then customer side and business side (costs, profit, DMCs, ledger, notes).
 */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import type { Pair } from '../../view';
import type { AdminInvoiceTemplate } from '../types';
import { contactLines, Field, Footer, TitleBlock, ToBlock, Totals } from './Invoice';
import { C, s, toneColour } from './styles';

const cell = {
  borderRightWidth: 0.75,
  borderBottomWidth: 0.75,
  borderColor: C.rule,
  paddingVertical: 3.5,
  paddingHorizontal: 5,
} as const;

/** Heading that never sits alone at the foot of a page: needs room for the table header + first row after it. */
const H = ({ children }: { children: string }) => (
  <Text style={s.aH} minPresenceAhead={80}>
    {children}
  </Text>
);

function PairTable({ rows }: { rows: Pair[] }) {
  return (
    <View style={s.bankTable}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row' }} wrap={false}>
          <Text style={[s.bankLabel, { width: '34%' }]}>{r.label}</Text>
          <Text style={[s.bankValue, { fontWeight: 400 }]}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

type Col = {
  label: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
};

function Grid({ cols, rows }: { cols: Col[]; rows: ReactNode[][] }) {
  const colStyle = (c: Col) => (c.width ? { width: c.width } : { flex: 1 });
  return (
    <View>
      {/* Header repeats on every page the table spans; borders live on rows so a split table stays closed. */}
      <View
        fixed
        style={{ flexDirection: 'row', backgroundColor: C.tint, borderTopWidth: 0.75, borderLeftWidth: 0.75, borderColor: C.rule }}
        wrap={false}
      >
        {cols.map((c, i) => (
          <Text key={i} style={[cell, colStyle(c), s.th, { textAlign: c.align ?? 'left' }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={{ flexDirection: 'row', borderLeftWidth: 0.75, borderColor: C.rule }} wrap={false}>
          {r.map((content, ci) => (
            <View
              key={ci}
              style={[
                cell,
                colStyle(cols[ci]),
                {
                  alignItems: cols[ci].align === 'right' ? 'flex-end' : cols[ci].align === 'center' ? 'center' : 'flex-start',
                },
              ]}
            >
              {typeof content === 'string' ? <Text style={{ textAlign: cols[ci].align ?? 'left' }}>{content}</Text> : content}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Stat({ label, value, colour, last }: { label: string; value: string; colour?: string; last?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRightWidth: last ? 0 : 0.75,
        borderColor: C.frame,
      }}
    >
      <Text style={[s.iLabel, { fontSize: 7 }]}>{label}</Text>
      <Text
        style={{
          fontFamily: 'Manrope',
          fontWeight: 700,
          fontSize: 11,
          color: colour ?? C.ink,
          marginTop: 2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const small = { fontSize: 7.5, color: C.muted } as const;

/** Rows a table may have and still move to the next page whole with its heading (minPresenceAhead ignores fixed headers). */
const KEEP_WHOLE = 8;

export const AdminInvoice: AdminInvoiceTemplate = ({ view: v }) => {
  const lh = v.letterhead;
  const p = v.profit;
  const cancelled = v.cancelledPill;
  // Same Service line (both numbered from booking.lines): visa type/country, hotel nights.
  const lineDetail = (no: string) => v.lineItems.find((li) => li.no === no)?.detail ?? '';
  const summary: Pair[] = [
    { label: 'Category', value: v.categoryLabel },
    { label: 'Status', value: v.status },
    ...(v.trip.destination ? [{ label: 'Destination', value: v.trip.destination }] : []),
    ...(v.trip.dates ? [{ label: 'Travel dates', value: v.trip.dates }] : []),
    ...(v.trip.pax ? [{ label: 'Guests', value: v.trip.pax }] : []),
    ...(v.trip.travellers.length ? [{ label: 'Travellers', value: v.trip.travellers.join(', ') }] : []),
  ];

  return (
    <Document title={v.filenameTitle} author={lh.name} creator={lh.name} producer={lh.name}>
      <Page size="A4" style={[s.iPage, { paddingTop: 44, paddingBottom: 70 }]}>
        <View fixed style={s.banner}>
          <Text>{v.internalBanner}</Text>
          <Text>
            {v.bookingNo} · {v.preparedLine}
          </Text>
        </View>

        <View style={s.body}>
          <TitleBlock title="INTERNAL BOOKING SHEET" name={lh.name} cancelled={cancelled} size={24} />

          <View style={{ flexDirection: 'row', gap: 24, paddingHorizontal: 6 }}>
            <View style={{ flex: 1 }}>
              <Field label="INVOICE #" value={v.invoiceNo} />
              <Field label="INVOICE DATE:" value={v.invoiceDate} />
              <Field label="BOOKING #" value={v.bookingNo} />
              <Field label="CONTACT PERSON & NUMBER" value={contactLines(v)} accent />
            </View>
            <View style={{ flex: 1 }}>
              <ToBlock v={v} />
            </View>
          </View>

          {cancelled && (v.cancelledNote || v.cancelReason) ? (
            <View
              style={{
                borderWidth: 0.75,
                borderColor: C.danger,
                backgroundColor: '#fdf1f0',
                padding: 7,
                marginTop: 6,
              }}
              wrap={false}
            >
              {v.cancelReason ? <Text style={{ color: C.danger, fontWeight: 600 }}>Cancellation reason: {v.cancelReason}</Text> : null}
              {v.cancelledNote ? <Text style={{ color: C.danger }}>{v.cancelledNote}</Text> : null}
            </View>
          ) : null}

          <H>BOOKING SUMMARY</H>
          <PairTable rows={summary} />

          <View wrap={false}>
            <H>CUSTOMER BILLING SUMMARY</H>
            <View
              style={{
                flexDirection: 'row',
                gap: 16,
                alignItems: 'flex-start',
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderWidth: 0.75,
                  borderColor: C.rule,
                  padding: 7,
                }}
              >
                <Text style={s.iLabel}>BILLED ITEM</Text>
                <Text style={{ fontWeight: 600, marginTop: 2 }}>{v.item.title}</Text>
                {v.item.detail ? <Text style={{ color: C.muted }}>{v.item.detail}</Text> : null}
                <Text style={{ fontWeight: 600, color: C.indigo, marginTop: 3 }}>{v.item.amount}</Text>
                {v.originalPrice ? (
                  <Text style={[small, { marginTop: 3 }]}>
                    {v.originalPrice.label}: <Text style={s.struck}>{v.originalPrice.amount}</Text>
                  </Text>
                ) : null}
                <Text style={[small, { marginTop: 3 }]}>{v.summary.inWords}</Text>
              </View>
              <Totals v={v} />
            </View>
          </View>

          {v.costLines.length > 0 && (
            <View wrap={v.costLines.length > KEEP_WHOLE}>
              <H>COST &amp; SUPPLIER LINES</H>
              <Grid
                cols={[
                  { label: 'NO', width: 24 },
                  { label: 'SERVICE' },
                  { label: 'SUPPLIER', width: 88 },
                  { label: 'CONFIRMATION', width: 72 },
                  {
                    label: cancelled ? 'NET / CANCEL' : 'NET COST',
                    width: 70,
                    align: 'right',
                  },
                  { label: 'PAY BY / DMC', width: 86 },
                ]}
                rows={v.costLines.map((l) => [
                  <Text style={{ fontWeight: 600 }}>{l.no}</Text>,
                  <View>
                    <Text>
                      <Text style={{ fontWeight: 600 }}>{l.type}</Text> — {l.description}
                    </Text>
                    <Text style={small}>{[l.dates, lineDetail(l.no)].filter(Boolean).join(' · ')}</Text>
                  </View>,
                  l.supplier,
                  <Text style={l.confirmation.pending ? { color: C.warn, fontWeight: 600 } : { fontWeight: 600 }}>
                    {l.confirmation.text}
                  </Text>,
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={l.cancellationCharge !== undefined ? s.struck : { fontWeight: 600 }}>{l.netCost}</Text>
                    {l.cancellationCharge !== undefined ? (
                      <Text style={{ color: C.danger, fontWeight: 600 }}>{l.cancellationCharge}</Text>
                    ) : null}
                  </View>,
                  <View>
                    {l.payBy ? <Text style={{ fontWeight: 600 }}>{l.payBy}</Text> : null}
                    {l.dmcPaid ? <Text style={small}>Paid {l.dmcPaid}</Text> : null}
                    {l.dmcOwed ? <Text style={small}>Owed {l.dmcOwed}</Text> : null}
                    {!l.payBy && !l.dmcPaid && !l.dmcOwed ? <Text style={small}>—</Text> : null}
                  </View>,
                ])}
              />
            </View>
          )}

          <View wrap={false}>
            <H>PROFIT</H>
            <View style={{ borderWidth: 0.75, borderColor: C.frame }}>
              <View
                style={{
                  flexDirection: 'row',
                  borderBottomWidth: 0.75,
                  borderColor: C.frame,
                  backgroundColor: C.tint,
                }}
              >
                <Stat label={cancelled ? 'CANCELLATION CHARGE' : 'SELLING PRICE'} value={p.sellingPrice} />
                <Stat label={cancelled ? 'DMC CANCELLATION' : 'NET COST'} value={p.netCost} />
                <Stat label="COMMISSION" value={p.commission} colour={toneColour[p.commissionTone]} />
                <Stat label="MARGIN" value={p.margin} colour={toneColour[p.commissionTone]} last />
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Stat label="CLIENT RECEIVED" value={p.clientReceived} />
                <Stat label="CLIENT OUTSTANDING" value={p.clientOutstanding} colour={toneColour[p.clientOutstandingTone]} />
                <Stat label="DMC OUTSTANDING" value={p.dmcOutstanding} colour={toneColour[p.dmcOutstandingTone]} />
                <Stat label="CASH IN HAND" value={p.cashInHand} last />
              </View>
            </View>
          </View>

          {v.dmcs.length > 0 && (
            <View wrap={false}>
              <H>DMC POSITION</H>
              <Grid
                cols={[
                  { label: 'DMC' },
                  { label: cancelled ? 'CHARGE' : 'COST', width: 80, align: 'right' },
                  { label: 'PAID', width: 80, align: 'right' },
                  { label: 'OUTSTANDING', width: 110, align: 'right' },
                ]}
                rows={v.dmcs.map((d) => [
                  <View>
                    <Text style={{ fontWeight: 600 }}>{d.name}</Text>
                    {d.contact ? <Text style={small}>{d.contact}</Text> : null}
                  </View>,
                  d.cost,
                  d.paid,
                  <Text
                    style={{
                      color: toneColour[d.tone],
                      fontWeight: 600,
                      textAlign: 'right',
                    }}
                  >
                    {d.label}{'\u00a0'}{d.outstanding}
                  </Text>,
                ])}
              />
            </View>
          )}

          {v.ledger.length > 0 && (
            <View wrap={v.ledger.length > KEEP_WHOLE}>
              <H>MONEY LEDGER</H>
              <Grid
                cols={[
                  { label: 'DATE', width: 64 },
                  { label: 'PARTY' },
                  { label: 'IN/OUT', width: 38, align: 'center' },
                  { label: 'KIND', width: 44 },
                  { label: 'MODE', width: 74 },
                  { label: 'REF', width: 60 },
                  { label: 'AMOUNT', width: 68, align: 'right' },
                ]}
                rows={v.ledger.map((e) => {
                  const col = e.direction === 'In' ? C.action : C.danger;
                  return [
                    e.date,
                    e.party,
                    <Text style={{ color: col, fontWeight: 600 }}>{e.direction}</Text>,
                    e.kind,
                    e.mode,
                    e.ref || '—',
                    <Text
                      style={{
                        color: col,
                        fontWeight: 600,
                        textAlign: 'right',
                      }}
                    >
                      {e.direction === 'In' ? '+' : '−'}{'\u00a0'}{e.amount}
                    </Text>,
                  ];
                })}
              />
            </View>
          )}

          {v.internalNotes.length > 0 && (
            <View wrap={false}>
              <H>INTERNAL NOTES</H>
              <View
                style={{
                  borderWidth: 0.75,
                  borderColor: C.frame,
                  padding: 7,
                  backgroundColor: '#fbf7ec',
                }}
              >
                {v.internalNotes.map((n, i) => (
                  <View key={i} style={{ flexDirection: 'row', marginBottom: 2 }}>
                    <Text style={{ width: 10, color: C.indigo, fontWeight: 600 }}>•</Text>
                    <Text style={{ flex: 1 }}>{n}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <Footer lh={lh} lines={v.footer} />
      </Page>
    </Document>
  );
};
