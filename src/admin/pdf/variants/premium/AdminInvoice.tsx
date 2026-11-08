/** "Premium" internal booking statement: the same stationery, unmistakably marked internal, with the business side. */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import type { AdminInvoiceView } from '../../view';
import type { AdminInvoiceTemplate } from '../types';
import { CancelledMark, CancelledNote, Parties, PricedItem, Totals } from './Invoice';
import { Caps, Footer, Header, SectionHead, Serif } from './parts';
import { c, M, s, toneColour } from './styles';

/** Red small-caps band fixed at the top of every page. */
const InternalBand = ({ text }: { text: string }) => (
  <View fixed style={{ position: 'absolute', top: 20, left: M, right: M }}>
    <View style={{ borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: c.danger, paddingVertical: 2.5, flexDirection: 'row', justifyContent: 'center' }}>
      <Text style={[s.caps, { color: c.danger, fontSize: 6, letterSpacing: 2 }]}>{text}</Text>
    </View>
  </View>
);

const Th = ({ children, w, right }: { children?: string; w?: number; right?: boolean }) => (
  <Text style={[s.caps, { fontSize: 6, paddingBottom: 4, letterSpacing: 1.2 }, w ? { width: w } : { flex: 1 }, right ? s.right : {}]}>{children}</Text>
);

const HeadRow = ({ children }: { children: ReactNode }) => (
  <View style={[s.row, { gap: 8, borderBottomWidth: 0.5, borderBottomColor: c.gold, paddingBottom: 2 }]} minPresenceAhead={48}>
    {children}
  </View>
);

const rowStyle = [s.row, { gap: 8, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: c.hair, alignItems: 'flex-start' as const }];

const Stat = ({ label, value, colour, big, note }: { label: string; value: string; colour?: string; big?: boolean; note?: string }) => (
  <View style={{ flex: big ? 1.3 : 1, paddingHorizontal: 12, paddingVertical: 4 }}>
    {big ? (
      <Serif italic style={{ fontSize: 12.5, color: c.deep }}>
        {label}
      </Serif>
    ) : (
      <Caps style={{ fontSize: 6, letterSpacing: 1.2 }}>{label}</Caps>
    )}
    <Text style={[s.money, { fontSize: big ? 22 : 12.5, color: colour ?? c.ink, marginTop: big ? 1 : 2, lineHeight: 1.2 }, big ? { fontWeight: 700 } : {}]}>{value}</Text>
    {note ? (
      <Serif italic style={{ fontSize: 10, color: c.muted, marginTop: 1 }}>
        {note}
      </Serif>
    ) : null}
  </View>
);

const VRule = () => <View style={{ borderLeftWidth: 0.5, borderLeftColor: c.goldSoft }} />;

function Profitability({ v }: { v: AdminInvoiceView }) {
  const p = v.profit;
  return (
    <View style={s.section} wrap={false}>
      <SectionHead>Profitability</SectionHead>
      <View style={[s.row, { alignItems: 'stretch', backgroundColor: c.cream, borderWidth: 0.5, borderColor: c.goldSoft, paddingVertical: 10 }]}>
        {/* Cancelled: profit.sellingPrice is the client cancellation charge. */}
        <Stat label={v.cancelledPill ? 'Cancellation charge' : 'Selling price'} value={p.sellingPrice} />
        <VRule />
        <Stat label="Net cost" value={p.netCost} />
        <VRule />
        <Stat label="Commission" value={p.commission} colour={toneColour[p.commissionTone]} big note={`${p.margin} margin`} />
      </View>
      <View style={[s.row, { marginTop: 8 }]}>
        <Stat label="Client received" value={p.clientReceived} />
        <VRule />
        <Stat label="Client outstanding" value={p.clientOutstanding} colour={toneColour[p.clientOutstandingTone]} />
        <VRule />
        <Stat label="DMC outstanding" value={p.dmcOutstanding} colour={toneColour[p.dmcOutstandingTone]} />
        <VRule />
        <Stat label="Cash in hand" value={p.cashInHand} />
      </View>
    </View>
  );
}

function Costing({ v }: { v: AdminInvoiceView }) {
  if (v.costLines.length === 0) return null;
  const cancelled = v.costLines.some((l) => l.cancellationCharge !== undefined);
  return (
    <View>
      {/* Spacer first: react-pdf never breaks before a first child, so the head can move with its rows. */}
      <View style={s.gap} />
      <SectionHead minPresenceAhead={90}>Supplier costing</SectionHead>
      <HeadRow>
        <Th w={16}>No.</Th>
        <Th>Service</Th>
        <Th w={96}>Supplier</Th>
        <Th w={58} right>
          Net cost
        </Th>
        {cancelled ? (
          <Th w={58} right>
            Canc. charge
          </Th>
        ) : null}
        <Th w={74} right>
          Paid / owed
        </Th>
      </HeadRow>
      {v.costLines.map((l) => (
        <View key={l.no} style={rowStyle} wrap={false}>
          <Serif style={{ width: 16, fontSize: 9, color: c.goldText }}>{l.no}</Serif>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, lineHeight: 1.4 }}>
              <Text style={[s.caps, { color: c.teal }]}>{l.type}  </Text>
              {l.description}
            </Text>
            <Text style={{ fontSize: 7.5, color: c.muted, lineHeight: 1.35 }}>{l.dates}</Text>
            <Text style={{ fontSize: 7.5, color: l.confirmation.pending ? c.warn : c.ink, fontWeight: l.confirmation.pending ? 600 : 400 }}>
              <Text style={[s.caps, { fontSize: 6, color: l.confirmation.pending ? c.warn : c.faint }]}>Conf.  </Text>
              {l.confirmation.text}
            </Text>
          </View>
          <View style={{ width: 96 }}>
            <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{l.supplier}</Text>
            {l.payBy ? (
              <Serif italic style={{ fontSize: 9, color: c.warn, lineHeight: 1.35 }}>
                {l.payBy}
              </Serif>
            ) : null}
          </View>
          <Text style={[{ width: 58, fontSize: 9 }, s.right, s.money, cancelled ? s.struck : {}]}>{l.netCost}</Text>
          {cancelled ? <Text style={[{ width: 58, fontWeight: 600, fontSize: 9 }, s.right, s.money]}>{l.cancellationCharge ?? ''}</Text> : null}
          <View style={{ width: 74, alignItems: 'flex-end' }}>
            {l.dmcPaid !== undefined ? (
              <Text style={[s.muted, s.right, { fontSize: 9 }]}>
                <Text style={[s.caps, { fontSize: 6 }]}>Paid  </Text>
                <Text style={s.money}>{l.dmcPaid}</Text>
              </Text>
            ) : (
              <Text style={{ color: c.faint, fontSize: 9 }}>—</Text>
            )}
            {l.dmcOwed !== undefined ? (
              <Text style={[s.right, { fontWeight: 600, fontSize: 9 }]}>
                <Text style={[s.caps, { fontSize: 6 }]}>Owed  </Text>
                <Text style={s.money}>{l.dmcOwed}</Text>
              </Text>
            ) : null}
          </View>
        </View>
      ))}
      <View style={[s.row, { gap: 8, paddingTop: 6 }]} wrap={false}>
        <View style={{ width: 16 }} />
        <Serif italic style={{ flex: 1, fontSize: 10.5, color: c.deep }}>
          Total net cost
        </Serif>
        <View style={{ width: 96 }} />
        {/* Cancelled: the total is the sum of cancellation charges, so it sits under that column. */}
        {cancelled ? <View style={{ width: 58 }} /> : null}
        <Text style={[s.money, { width: 58, textAlign: 'right', fontSize: 9.5 }]}>{v.profit.netCost}</Text>
        <View style={{ width: 74 }} />
      </View>
    </View>
  );
}

function Suppliers({ v }: { v: AdminInvoiceView }) {
  if (v.dmcs.length === 0) return null;
  return (
    <View>
      {/* Spacer first: react-pdf never breaks before a first child, so the head can move with its rows. */}
      <View style={s.gap} />
      <SectionHead minPresenceAhead={80}>Supplier position</SectionHead>
      <HeadRow>
        <Th>Supplier</Th>
        <Th w={70} right>
          Cost
        </Th>
        <Th w={70} right>
          Paid
        </Th>
        <Th w={90} right>
          Outstanding
        </Th>
      </HeadRow>
      {v.dmcs.map((d, i) => (
        <View key={i} style={rowStyle} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 600, fontSize: 9, lineHeight: 1.4 }}>{d.name}</Text>
            {d.contact ? <Text style={{ fontSize: 7.5, color: c.muted, lineHeight: 1.35 }}>{d.contact}</Text> : null}
          </View>
          <Text style={[{ width: 70, fontSize: 9 }, s.right, s.money]}>{d.cost}</Text>
          <Text style={[{ width: 70, fontSize: 9 }, s.right, s.muted, s.money]}>{d.paid}</Text>
          <View style={{ width: 90, alignItems: 'flex-end' }}>
            <Text style={[s.money, { fontWeight: 600, fontSize: 9, color: toneColour[d.tone] }]}>{d.outstanding}</Text>
            <Text style={[s.caps, { fontSize: 6, color: toneColour[d.tone] }]}>{d.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Ledger({ v }: { v: AdminInvoiceView }) {
  if (v.ledger.length === 0) return null;
  return (
    <View>
      {/* Spacer first: react-pdf never breaks before a first child, so the head can move with its rows. */}
      <View style={s.gap} />
      <SectionHead minPresenceAhead={70}>Money movements</SectionHead>
      <HeadRow>
        <Th w={60}>Date</Th>
        <Th>Party</Th>
        <Th w={28}>Dir.</Th>
        <Th w={104}>Kind · mode</Th>
        <Th w={70}>Ref.</Th>
        <Th w={64} right>
          Amount
        </Th>
      </HeadRow>
      {v.ledger.map((e, i) => {
        const inbound = e.direction === 'In';
        return (
          <View key={i} style={rowStyle} wrap={false}>
            <Text style={{ width: 60, fontSize: 9 }}>{e.date}</Text>
            <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.4 }}>{e.party}</Text>
            <Text style={[s.caps, { width: 28, paddingTop: 1.5, color: inbound ? c.action : c.warn }]}>{e.direction}</Text>
            <Text style={{ width: 104, color: c.muted, fontSize: 9 }}>{[e.kind, e.mode].filter(Boolean).join(' · ')}</Text>
            <Text style={{ width: 70, color: c.muted, fontSize: 7.5, paddingTop: 0.75 }}>{e.ref}</Text>
            <Text style={[{ width: 64 }, s.right, s.money, { fontSize: 9, fontWeight: 600, color: inbound ? c.ink : c.muted }]}>
              {inbound ? '+ ' : '− '}
              {e.amount}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Notes({ v }: { v: AdminInvoiceView }) {
  if (v.internalNotes.length === 0) return null;
  return (
    <View style={s.section} wrap={false}>
      <SectionHead>Internal notes</SectionHead>
      <View style={{ borderLeftWidth: 1.5, borderLeftColor: c.gold, paddingLeft: 12 }}>
        {v.internalNotes.map((n, i) => (
          <Serif key={i} italic style={{ fontSize: 10.5, lineHeight: 1.45, marginBottom: 2 }}>
            {n}
          </Serif>
        ))}
      </View>
    </View>
  );
}

export const AdminInvoice: AdminInvoiceTemplate = ({ view: v, assets }) => (
  <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
    <Page size="A4" style={[s.page, { paddingTop: 66 }]}>
      <InternalBand text={v.internalBanner} />
      <Header
        mark={assets.mark}
        letterhead={v.letterhead}
        title="Booking Statement — Internal"
        meta={[v.bookingLine, v.invoiceDate ? `Invoice ${v.invoiceNo}` : v.invoiceNo, v.invoiceDate ? `Invoiced ${v.invoiceDate}` : '', v.preparedLine]}
      >
        {v.cancelledPill ? <CancelledMark /> : null}
      </Header>

      <View>
        {/* Spacer first: react-pdf never breaks before a first child, so the head can move with its rows. */}
        <View style={s.gap} />
        <SectionHead>Summary</SectionHead>
        <Parties v={v} top={4} />
      </View>
      <CancelledNote note={v.cancelledNote} reason={v.cancelReason} />
      <View style={{ marginTop: 18 }}>
        <PricedItem v={v} />
      </View>
      <Totals v={v} words={false} />

      <Profitability v={v} />
      <Costing v={v} />
      <Suppliers v={v} />
      <Ledger v={v} />
      <Notes v={v} />

      <Footer lines={v.footer} />
    </Page>
  </Document>
);
