/** Phone-first internal booking sheet: dark INTERNAL header with commission, KPI grid, cost/DMC/ledger cards. */
import { Document, Text, View } from '@react-pdf/renderer';
import type { AdminInvoiceView } from '../../view';
import type { AdminInvoiceTemplate } from '../types';
import { BilledTo, CancelledBanner, Payments, Trip } from './Invoice';
import { c, Card, Closing, Header, MoneyRow, onDark, PhonePage, Pill, s, Section, toneColour, toneSoft } from './parts';

function InternalHero({ v }: { v: AdminInvoiceView }) {
  const p = v.profit;
  const ids = [v.invoiceNo, v.bookingNo, v.status].filter(Boolean).join(' · ');
  return (
    <View
      wrap={false}
      style={{
        backgroundColor: c.ink,
        borderRadius: 14,
        padding: 16,
        marginBottom: 8,
      }}
    >
      <View style={[s.between, { gap: 8 }]}>
        <Text
          style={{
            color: c.lime,
            fontSize: 8.5,
            fontWeight: 600,
            letterSpacing: 0.5,
            flex: 1,
          }}
        >
          {v.internalBanner}
        </Text>
        <Text style={{ color: c.white, opacity: 0.7, fontSize: 8.5 }}>{v.preparedLine}</Text>
      </View>
      <Text style={{ color: c.white, opacity: 0.75, marginTop: 10 }}>Commission</Text>
      <Text style={[s.h, { color: onDark[p.commissionTone], fontSize: 30, lineHeight: 1.15 }]}>{p.commission}</Text>
      <Text style={{ color: c.white, marginTop: 2 }}>
        {p.margin} margin on {v.cancelledPill ? `the ${p.sellingPrice} cancellation charge` : p.sellingPrice}
      </Text>
      <Text style={{ color: c.white, opacity: 0.7, fontSize: 8.5, marginTop: 8 }}>{ids}</Text>
    </View>
  );
}

function Kpi({ label, value, sub, colour }: { label: string; value: string; sub?: string; colour?: string }) {
  return (
    <View style={[s.card, { width: 156, marginBottom: 0, padding: 12 }]}>
      <Text style={s.small}>{label}</Text>
      <Text style={[s.h, { fontSize: 15, color: colour ?? c.ink, marginTop: 2 }]}>{value}</Text>
      {sub ? <Text style={s.small}>{sub}</Text> : null}
    </View>
  );
}

function KpiGrid({ v }: { v: AdminInvoiceView }) {
  const p = v.profit;
  return (
    <View
      wrap={false}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
      }}
    >
      {/* Cancelled: profit.sellingPrice is the client cancellation charge. */}
      <Kpi label={v.cancelledPill ? 'Cancellation charge' : 'Selling price'} value={p.sellingPrice} />
      <Kpi label="Net cost" value={p.netCost} />
      <Kpi label="Commission" value={p.commission} sub={`${p.margin} margin`} colour={toneColour[p.commissionTone]} />
      <Kpi label="Cash in hand" value={p.cashInHand} sub="Client in − DMC out" />
    </View>
  );
}

function Position({ v }: { v: AdminInvoiceView }) {
  const p = v.profit;
  return (
    <Card label="Money position">
      <MoneyRow first label="Received from client" amount={p.clientReceived} />
      <MoneyRow label="Client outstanding" amount={p.clientOutstanding} colour={toneColour[p.clientOutstandingTone]} bold />
      <MoneyRow label="Owed to DMCs" amount={p.dmcOutstanding} colour={toneColour[p.dmcOutstandingTone]} bold />
    </Card>
  );
}

function Cell({ label, value, colour, wide }: { label: string; value: string; colour?: string; wide?: boolean }) {
  return (
    <View style={{ width: wide ? '100%' : '50%', paddingRight: 6, marginTop: 8 }}>
      <Text style={s.small}>{label}</Text>
      <Text style={[s.semi, colour ? { color: colour } : {}]}>{value}</Text>
    </View>
  );
}

function CostLines({ v }: { v: AdminInvoiceView }) {
  if (!v.costLines.length) return null;
  return (
    <>
      <Section>Cost lines</Section>
      {v.costLines.map((l) => {
        const confirmation = <Cell label="Confirmation" value={l.confirmation.text} colour={l.confirmation.pending ? c.warn : undefined} />;
        return (
          <Card key={l.no}>
            <View style={[s.between, { gap: 8, alignItems: 'center' }]}>
              <View style={[s.row, { gap: 6, alignItems: 'center' }]}>
                <Text style={[s.small, { fontWeight: 600 }]}>{l.no}</Text>
                <Pill>{l.type}</Pill>
              </View>
              <Text style={[s.small, { flex: 1, textAlign: 'right' }]}>{l.dates}</Text>
            </View>
            <Text style={[s.h, { fontSize: 12.5, marginTop: 6 }]}>{l.description}</Text>
            <Text style={[s.semi, { color: c.teal, marginTop: 2 }]}>{l.supplier}</Text>
            <View style={[s.row, { flexWrap: 'wrap', marginTop: 2 }]}>
              <Cell label="Net cost" value={l.netCost} colour={l.cancellationCharge ? c.muted : undefined} />
              {l.cancellationCharge ? <Cell label="Cancellation charge" value={l.cancellationCharge} colour={c.danger} /> : confirmation}
              {l.dmcPaid ? <Cell label="DMC paid" value={l.dmcPaid} /> : null}
              {l.dmcOwed ? <Cell label="DMC owed" value={l.dmcOwed} /> : null}
              {l.cancellationCharge ? confirmation : null}
            </View>
            {l.payBy ? (
              <View style={{ marginTop: 8 }}>
                <Pill colour={c.warn} bg={c.warnSoft} size={8.5}>
                  {l.payBy}
                </Pill>
              </View>
            ) : null}
          </Card>
        );
      })}
    </>
  );
}

function Dmcs({ v }: { v: AdminInvoiceView }) {
  if (!v.dmcs.length) return null;
  return (
    <>
      <Section>DMC position</Section>
      {v.dmcs.map((d, i) => (
        <Card key={i}>
          <View style={[s.between, { gap: 8 }]}>
            <Text style={[s.h, { fontSize: 12.5, flex: 1 }]}>{d.name}</Text>
            <Pill colour={toneColour[d.tone]} bg={toneSoft[d.tone]}>
              {d.label}
            </Pill>
          </View>
          {d.contact ? <Text style={s.small}>{d.contact}</Text> : null}
          <View style={[s.row, { marginTop: 4 }]}>
            <View style={{ flex: 1, marginTop: 6 }}>
              <Text style={s.small}>Cost</Text>
              <Text style={s.semi}>{d.cost}</Text>
            </View>
            <View style={{ flex: 1, marginTop: 6 }}>
              <Text style={s.small}>Paid</Text>
              <Text style={s.semi}>{d.paid}</Text>
            </View>
            <View style={{ flex: 1, marginTop: 6 }}>
              <Text style={s.small}>{d.label === 'Settled' ? 'Outstanding' : d.label}</Text>
              <Text style={[s.semi, { color: toneColour[d.tone] }]}>{d.outstanding}</Text>
            </View>
          </View>
        </Card>
      ))}
    </>
  );
}

function Ledger({ v }: { v: AdminInvoiceView }) {
  if (!v.ledger.length) return null;
  return (
    <>
      <Section>Ledger</Section>
      <View style={[s.card, { paddingVertical: 4 }]}>
        {v.ledger.map((e, i) => {
          const isIn = e.direction === 'In';
          const colour = isIn ? c.action : c.danger;
          return (
            <View key={i} wrap={false} style={[s.row, i ? s.divider : {}, { paddingVertical: 8, gap: 10, alignItems: 'flex-start' }]}>
              <View style={{ width: 30, alignItems: 'center', paddingTop: 1 }}>
                <Pill colour={colour} bg={isIn ? c.actionSoft : c.dangerSoft} size={7.5}>
                  {isIn ? 'IN' : 'OUT'}
                </Pill>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.semi}>{e.party}</Text>
                <Text style={s.small}>{[e.date, e.kind, e.mode, e.ref].filter(Boolean).join(' · ')}</Text>
              </View>
              <Text style={[s.h, { fontSize: 12, color: colour, textAlign: 'right', flexShrink: 0 }]}>
                {isIn ? '+' : '−'} {e.amount}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

function Notes({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <Card label="Internal notes" style={{ backgroundColor: c.warnSoft, borderColor: c.warnBorder }}>
      {notes.map((n, i) => (
        <View key={i} style={[s.row, { gap: 6, marginTop: i ? 4 : 0 }]}>
          <Text style={{ color: c.warn, fontSize: 10.5, lineHeight: 1.45, width: 8 }}>•</Text>
          <Text style={[s.body, { flex: 1 }]}>{n}</Text>
        </View>
      ))}
    </Card>
  );
}

export const AdminInvoice: AdminInvoiceTemplate = ({ view: v, assets }) => (
  <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
    <PhonePage footerLeft={`INTERNAL · ${v.bookingNo} · not for customer`}>
      <Header
        wordmark={assets.wordmark}
        title="Booking sheet"
        lines={[v.invoiceNo, [v.dateLine, v.bookingLine].filter(Boolean).join(' · ')]}
        pill={
          v.cancelledPill ? (
            <Pill colour={c.danger} bg={c.dangerSoft}>
              Cancelled
            </Pill>
          ) : undefined
        }
      />
      <InternalHero v={v} />
      {v.cancelledPill ? <CancelledBanner note={v.cancelledNote} reason={v.cancelReason} /> : null}
      <KpiGrid v={v} />
      <Position v={v} />
      <Notes notes={v.internalNotes} />
      <CostLines v={v} />
      <Dmcs v={v} />
      <Ledger v={v} />
      <Section>Customer copy</Section>
      <BilledTo v={v} compact />
      <Trip v={v} />
      <Payments v={v} words={false} />
      <Closing lines={v.footer} />
    </PhonePage>
  </Document>
);
