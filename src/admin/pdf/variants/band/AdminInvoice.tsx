/** "Brand band" Admin invoice: same frame on an ink band with an INTERNAL pill, plus the business side. */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { AdminInvoiceTemplate } from '../types';
import type { AdminInvoiceView, Tone } from '../../view';
import { Band, c, ConfChip, Footer, Label, Pairs, Pill, RunningHead, s, SectionTitle, Table, toneBorder, toneColour, toneTint, TypePill, zebra } from './parts';

function Kpi({ label, value, sub, tone, accent }: { label: string; value: string; sub?: string; tone?: Tone; accent: string }) {
  return (
    <View
      style={[
        s.cardSoft,
        {
          flex: 1,
          borderTopWidth: 3,
          borderTopColor: accent,
          paddingVertical: 8,
          paddingHorizontal: 10,
        },
      ]}
    >
      <Label>{label}</Label>
      <Text style={[s.h, { fontSize: 14, color: tone ? toneColour[tone] : c.ink }]}>{value}</Text>
      {sub ? <Text style={[s.small, s.muted, { marginTop: 2 }]}>{sub}</Text> : null}
    </View>
  );
}

function Stat({ label, value, tone, strong }: { label: string; value: string; tone?: Tone; strong?: boolean }) {
  return (
    <View style={[s.row, { justifyContent: 'space-between', paddingVertical: 2.5 }]}>
      <Text style={s.muted}>{label}</Text>
      <Text style={[strong ? s.h : s.semi, s.right, strong ? { fontSize: 11 } : {}, tone ? { color: toneColour[tone] } : {}]}>{value}</Text>
    </View>
  );
}

function PositionCards({ v }: { v: AdminInvoiceView }) {
  const p = v.profit;
  const r = v.totals.result;
  return (
    <View style={[s.row, { gap: 12, marginTop: 12 }]} wrap={false}>
      <View
        style={[
          s.card,
          {
            flex: 1,
            backgroundColor: toneTint[p.clientOutstandingTone],
            borderWidth: 0.75,
            borderColor: toneBorder[p.clientOutstandingTone],
          },
        ]}
      >
        <Label>Client position</Label>
        {v.billedTo.name ? <Text style={[s.h, { fontSize: 10, marginBottom: 3 }]}>{v.billedTo.name}</Text> : null}
        <Stat label={v.totals.lines[0]?.label ?? 'Selling price'} value={p.sellingPrice} />
        <Stat label="Received (net)" value={p.clientReceived} />
        <View
          style={{
            borderTopWidth: 0.75,
            borderTopColor: c.border,
            marginTop: 4,
            paddingTop: 4,
          }}
        >
          <Stat
            label={r.label === 'Refund due to you' ? 'Refund due to client' : r.label}
            value={p.clientOutstanding}
            tone={p.clientOutstandingTone}
            strong
          />
          {r.note ? <Text style={[s.small, s.right, { color: toneColour[r.tone] }]}>{r.note}</Text> : null}
        </View>
      </View>
      <View
        style={[
          s.card,
          {
            flex: 1,
            backgroundColor: toneTint[p.dmcOutstandingTone],
            borderWidth: 0.75,
            borderColor: toneBorder[p.dmcOutstandingTone],
          },
        ]}
      >
        <Label>DMC position</Label>
        <Text style={[s.h, { fontSize: 10, marginBottom: 3 }]}>{v.dmcs.length ? v.dmcs.map((d) => d.name).join(', ') : 'In-house only'}</Text>
        <Stat label="Net cost" value={p.netCost} />
        <Stat label="Cash in hand" value={p.cashInHand} />
        <View
          style={{
            borderTopWidth: 0.75,
            borderTopColor: c.border,
            marginTop: 4,
            paddingTop: 4,
          }}
        >
          <Stat label="DMC outstanding" value={p.dmcOutstanding} tone={p.dmcOutstandingTone} strong />
        </View>
      </View>
    </View>
  );
}

/** Customer-side summary: what the client sees, condensed. */
function CustomerSide({ v }: { v: AdminInvoiceView }) {
  const tripRows = [
    ...(v.trip.destination ? [{ label: 'Trip', value: v.trip.destination }] : []),
    ...(v.trip.dates ? [{ label: 'Dates', value: v.trip.dates }] : []),
    ...(v.trip.pax ? [{ label: 'Guests', value: v.trip.pax }] : []),
    ...(v.trip.travellers.length ? [{ label: 'Travellers', value: v.trip.travellers.join(', ') }] : []),
  ];
  return (
    <View wrap={false}>
      <SectionTitle>Customer side</SectionTitle>
      <View style={[s.row, { gap: 12 }]}>
        <View style={[s.card, { flex: 1 }]}>
          <Label>Billed to</Label>
          {v.billedTo.name ? <Text style={[s.h, { fontSize: 11, marginBottom: 4 }]}>{v.billedTo.name}</Text> : null}
          <Pairs rows={[...v.billedToDetails, ...tripRows]} />
        </View>
        <View style={[s.card, { flex: 1 }]}>
          <Label>Invoice</Label>
          <Text style={[s.h, { fontSize: 10, marginBottom: 2 }]}>{v.item.title}</Text>
          {v.item.detail ? <Text style={[s.small, s.muted, { marginBottom: 4 }]}>{v.item.detail}</Text> : null}
          {v.originalPrice ? (
            <View style={[s.row, { justifyContent: 'space-between', paddingVertical: 1.5 }]}>
              <Text style={[s.small, s.muted, { flex: 1, paddingRight: 6 }]}>{v.originalPrice.label}</Text>
              <Text style={[s.small, s.struck, s.right]}>{v.originalPrice.amount}</Text>
            </View>
          ) : null}
          {v.totals.lines.map((l, i) => (
            <View key={i} style={[s.row, { justifyContent: 'space-between', paddingVertical: 1.5 }]}>
              <Text style={[l.muted ? s.muted : s.semi, s.small, { flex: 1, paddingRight: 6 }]}>{l.label}</Text>
              <Text style={[l.muted ? s.muted : s.semi, s.small, s.right]}>{l.amount}</Text>
            </View>
          ))}
          <View
            style={[
              s.row,
              {
                justifyContent: 'space-between',
                borderTopWidth: 0.75,
                borderTopColor: c.border,
                marginTop: 4,
                paddingTop: 4,
              },
            ]}
          >
            <Text style={[s.semi, { color: toneColour[v.totals.result.tone] }]}>{v.totals.result.label}</Text>
            <Text style={[s.semi, s.right, { color: toneColour[v.totals.result.tone] }]}>{v.totals.result.amount}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function CostTable({ v }: { v: AdminInvoiceView }) {
  if (!v.costLines.length) return null;
  const cancelled = v.costLines.some((l) => l.cancellationCharge !== undefined);
  return (
    <Table
      title="Costs by service"
      header={
        <View style={s.thRow}>
          <Text style={[s.th, { width: 18 }]}>#</Text>
          <Text style={[s.th, { flex: 1 }]}>Service · supplier</Text>
          <Text style={[s.th, { width: 74, textAlign: 'right' }]}>{cancelled ? 'Cancel charge' : 'Net cost'}</Text>
          <Text style={[s.th, { width: 96, textAlign: 'right' }]}>Confirmation</Text>
          <Text style={[s.th, { width: 92, textAlign: 'right' }]}>DMC paid / owed</Text>
        </View>
      }
      rows={v.costLines.map((l, i) => (
        <View key={l.no} style={[s.tr, zebra(i), { alignItems: 'flex-start' }]} wrap={false}>
          <Text style={{ width: 18, color: c.faint }}>{l.no}</Text>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={[s.row, { gap: 5, alignItems: 'center', marginBottom: 2 }]}>
              <TypePill type={l.type} />
              <Text style={[s.small, s.muted]}>{l.dates}</Text>
            </View>
            <Text>{l.description}</Text>
            <Text style={[s.small, s.semi, { color: c.teal, marginTop: 1 }]}>{l.supplier}</Text>
          </View>
          <View style={{ width: 74, alignItems: 'flex-end' }}>
            {l.cancellationCharge !== undefined ? (
              <>
                <Text style={[s.semi, s.right]}>{l.cancellationCharge}</Text>
                <Text style={[s.small, s.struck, s.right]}>{l.netCost}</Text>
              </>
            ) : (
              <Text style={[s.semi, s.right]}>{l.netCost}</Text>
            )}
          </View>
          <View style={{ width: 96, paddingLeft: 6 }}>
            <ConfChip confirmation={l.confirmation} />
          </View>
          <View style={{ width: 92, alignItems: 'flex-end' }}>
            {l.dmcPaid ? <Text style={[s.small, s.right, { color: c.action }]}>Paid {l.dmcPaid}</Text> : null}
            {l.dmcOwed ? <Text style={[s.small, s.semi, s.right]}>Owed {l.dmcOwed}</Text> : null}
            {l.payBy ? <Text style={[s.small, s.muted, s.right]}>{l.payBy}</Text> : null}
          </View>
        </View>
      ))}
    />
  );
}

function DmcTable({ v }: { v: AdminInvoiceView }) {
  if (!v.dmcs.length) return null;
  return (
    <Table
      title="DMCs"
      header={
        <View style={s.thRow}>
          <Text style={[s.th, { flex: 1 }]}>Supplier</Text>
          <Text style={[s.th, { width: 76, textAlign: 'right' }]}>Cost</Text>
          <Text style={[s.th, { width: 76, textAlign: 'right' }]}>Paid</Text>
          <Text style={[s.th, { width: 96, textAlign: 'right' }]}>Outstanding</Text>
        </View>
      }
      rows={v.dmcs.map((d, i) => (
        <View key={i} style={[s.tr, zebra(i)]} wrap={false}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={s.semi}>{d.name}</Text>
            {d.contact ? <Text style={[s.small, s.muted]}>{d.contact}</Text> : null}
          </View>
          <Text style={[{ width: 76 }, s.right]}>{d.cost}</Text>
          <Text style={[{ width: 76 }, s.right]}>{d.paid}</Text>
          <View style={{ width: 96, alignItems: 'flex-end' }}>
            <Text style={[s.semi, s.right, { color: toneColour[d.tone] }]}>{d.outstanding}</Text>
            <Text style={[s.small, s.right, { color: toneColour[d.tone] }]}>{d.label}</Text>
          </View>
        </View>
      ))}
    />
  );
}

function LedgerTable({ v }: { v: AdminInvoiceView }) {
  if (!v.ledger.length) return null;
  return (
    <Table
      title="Money ledger"
      header={
        <View style={s.thRow}>
          <Text style={[s.th, { width: 64 }]}>Date</Text>
          <Text style={[s.th, { width: 44 }]}>Flow</Text>
          <Text style={[s.th, { flex: 1 }]}>Party</Text>
          <Text style={[s.th, { width: 50 }]}>Kind</Text>
          <Text style={[s.th, { width: 66 }]}>Mode</Text>
          <Text style={[s.th, { width: 72 }]}>Ref</Text>
          <Text style={[s.th, { width: 66, textAlign: 'right' }]}>Amount</Text>
        </View>
      }
      rows={v.ledger.map((e, i) => {
        const col = e.direction === 'In' ? c.action : c.danger;
        return (
          <View key={i} style={[s.tr, zebra(i)]} wrap={false}>
            <Text style={{ width: 64 }}>{e.date}</Text>
            <Text style={[s.semi, { width: 44, color: col }]}>{e.direction === 'In' ? '↓ In' : '↑ Out'}</Text>
            <Text style={{ flex: 1, paddingRight: 6 }}>{e.party}</Text>
            <Text style={{ width: 50 }}>{e.kind}</Text>
            <Text style={{ width: 66 }}>{e.mode}</Text>
            <Text style={[s.muted, { width: 72, paddingRight: 4 }]}>{e.ref}</Text>
            <Text style={[s.semi, { width: 66, textAlign: 'right', color: col }]}>{e.amount}</Text>
          </View>
        );
      })}
    />
  );
}

export const AdminInvoice: AdminInvoiceTemplate = ({ view: v, assets }) => {
  const p = v.profit;
  return (
    <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
      <Page size="A4" style={s.page}>
        <RunningHead colour={c.ink} text={`${v.internalBanner}  ·  Admin invoice  ·  ${v.bookingLine}`} />
        <View style={s.body}>
          <Band
            colour={c.ink}
            wordmark={assets.wordmark}
            title="Admin invoice"
            pills={
              <>
                {v.cancelledPill ? (
                  <Pill bg={c.ink} fg="#ffb4ab" border="#ffb4ab">
                    CANCELLED
                  </Pill>
                ) : null}
                <Pill bg={c.danger}>{v.internalBanner}</Pill>
              </>
            }
            meta={[v.invoiceNo, v.dateLine, v.bookingLine, v.preparedLine]}
            letterhead={v.letterhead}
          />

          {v.cancelledNote || v.cancelReason ? (
            <View
              wrap={false}
              style={{
                marginBottom: 12,
                borderRadius: 8,
                backgroundColor: c.dangerTint,
                borderWidth: 0.75,
                borderColor: toneBorder.danger,
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              {v.cancelReason ? <Text style={[s.semi, { color: c.danger }]}>Cancel reason: {v.cancelReason}</Text> : null}
              {v.cancelledNote ? <Text style={{ color: c.danger, marginTop: v.cancelReason ? 2 : 0 }}>{v.cancelledNote}</Text> : null}
            </View>
          ) : null}

          <View style={[s.row, { gap: 8 }]} wrap={false}>
            <Kpi label={v.totals.lines[0]?.label ?? 'Selling price'} value={p.sellingPrice} accent={c.teal} />
            <Kpi label="Net cost" value={p.netCost} accent={c.sky} />
            <Kpi label="Commission" value={p.commission} sub={`Margin ${p.margin}`} tone={p.commissionTone} accent={toneColour[p.commissionTone]} />
            <Kpi label="Cash in hand" value={p.cashInHand} accent={c.lime} />
          </View>

          <PositionCards v={v} />
          {v.internalNotes.length > 0 && (
            <View
              wrap={false}
              style={{
                marginTop: 12,
                borderRadius: 8,
                backgroundColor: c.note,
                borderWidth: 0.75,
                borderColor: '#f1df9c',
                padding: 12,
              }}
            >
              <Label style={{ color: c.warn }}>Internal notes</Label>
              {v.internalNotes.map((n, i) => (
                <View key={i} style={[s.row, { marginTop: i ? 4 : 0 }]}>
                  <Text style={{ width: 9, color: c.warn }}>–</Text>
                  <Text style={{ flex: 1 }}>{n}</Text>
                </View>
              ))}
            </View>
          )}
          <CustomerSide v={v} />
          <CostTable v={v} />
          <DmcTable v={v} />
          <LedgerTable v={v} />
        </View>

        <Footer lines={v.footer} />
      </Page>
    </Document>
  );
};
