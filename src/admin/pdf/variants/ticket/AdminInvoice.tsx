/**
 * "Ticket" Admin invoice: the OPS MANIFEST. Customer side in brief, then the business side as tickets: one per cost
 * line (supplier, net cost, pay-by; conf. and paid/owed on the stub), a profit stub with the commission, DMC position
 * stubs, the ledger as a mono table and internal notes. INTERNAL on every page.
 */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import type { AdminInvoiceTemplate } from '../types';
import type { AdminInvoiceView } from '../../view';
import { Badge, c, ConfCode, Footer, HeaderStrip, Label, s, Ticket, toneColour, toneSoft, Wrappable } from './styles';
import { Totals } from './Invoice';

type V = AdminInvoiceView;

function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={[s.sectionHead, { marginTop: 16 }]} minPresenceAhead={70}>
      <View style={[s.row, { alignItems: 'center', gap: 6 }]}>
        <View style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: c.teal }} />
        <Text style={[s.h, { fontSize: 11 }]}>{children}</Text>
      </View>
      {right}
    </View>
  );
}

function Stat({ label, value, colour, big }: { label: string; value: string; colour?: string; big?: boolean }) {
  return (
    <View style={{ width: '33.33%', paddingVertical: 4, paddingRight: 8 }}>
      <Label>{label}</Label>
      <Text style={[s.h, { fontSize: big ? 14 : 11, color: colour ?? c.ink, marginTop: 1 }]}>{value}</Text>
    </View>
  );
}

function CustomerSide({ v }: { v: V }) {
  const details = v.billedToDetails;
  return (
    <Ticket
      stubWidth={230}
      stub={<Totals v={v} />}
    >
      <Label>Customer side</Label>
      <Text style={[s.h, { fontSize: 11, marginTop: 3 }]}>{v.item.title}</Text>
      {v.item.detail ? <Text style={s.muted}>{v.item.detail}</Text> : null}
      <View style={[s.row, { marginTop: 6, gap: 6, flexWrap: 'wrap' }]}>
        <Badge color={v.cancelledPill ? c.danger : c.teal}>{v.status.toUpperCase()}</Badge>
        <Badge color={c.muted}>{v.category.toUpperCase()}</Badge>
      </View>
      {v.billedTo.name || details.length ? (
        <View style={{ marginTop: 8 }}>
          <Label>Client</Label>
          {v.billedTo.name ? <Text style={[s.semi, { fontSize: 9.5 }]}>{v.billedTo.name}</Text> : null}
          {details.map((d, i) => (
            <View key={i} style={[s.row, { marginTop: 1.5 }]}>
              <Text style={[s.label, { width: 52, fontSize: 6.5, paddingTop: 1.5 }]}>{d.label}</Text>
              <Wrappable text={d.value} style={{ fontSize: 8.5, color: c.muted }} />
            </View>
          ))}
        </View>
      ) : null}
      {v.trip.travellers.length ? (
        <View style={{ marginTop: 6 }}>
          <Label>Travellers</Label>
          <Text style={{ color: c.muted, fontSize: 8.5 }}>{v.trip.travellers.join(', ')}</Text>
        </View>
      ) : null}
    </Ticket>
  );
}

function ProfitStub({ v }: { v: V }) {
  const p = v.profit;
  const r = v.totals.result;
  return (
    <Ticket
      stubWidth={170}
      stubBg={toneSoft[p.commissionTone]}
      accent={toneColour[p.commissionTone]}
      stub={
        <View>
          <Label>Commission</Label>
          <Text style={[s.h, { fontSize: 20, color: toneColour[p.commissionTone], marginTop: 2 }]}>{p.commission}</Text>
          <View style={[s.row, { alignItems: 'center', gap: 5, marginTop: 4 }]}>
            <Label>Margin</Label>
            <Text style={[s.monoB, { fontSize: 11, color: toneColour[p.commissionTone] }]}>{p.margin}</Text>
          </View>
        </View>
      }
    >
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        {/* Once cancelled, profit.sellingPrice is the cancellation charge (totals.lines[0] carries that label). */}
        <Stat label={v.cancelledPill ? (v.totals.lines[0]?.label ?? 'Cancellation charge') : 'Selling price'} value={p.sellingPrice} />
        <Stat label="Net cost" value={p.netCost} />
        <Stat label="Cash in hand" value={p.cashInHand} />
        <Stat label="Client received" value={p.clientReceived} />
        <Stat label={r.label === 'Refund due to you' ? 'Refund due to client' : 'Client outstanding'} value={r.amount} colour={toneColour[p.clientOutstandingTone]} />
        <Stat label="DMC outstanding" value={p.dmcOutstanding} colour={toneColour[p.dmcOutstandingTone]} />
      </View>
    </Ticket>
  );
}

function CostLine({ line, cancelled }: { line: V['costLines'][number]; cancelled: boolean }) {
  return (
    <Ticket
      stubWidth={160}
      pad={8}
      accent={line.type === 'Flight' ? c.sky : c.teal}
      stubBg={line.confirmation.pending ? c.warnSoft : c.surface}
      style={{ marginBottom: 8 }}
      stub={
        <View>
          <Label>Conf. no.</Label>
          <View style={{ marginTop: 3 }}>
            <ConfCode text={line.confirmation.text} pending={line.confirmation.pending} width={134} />
          </View>
          {line.dmcPaid !== undefined || line.dmcOwed !== undefined ? (
            <View style={[s.row, { marginTop: 7, gap: 12 }]}>
              {line.dmcPaid !== undefined ? (
                <View>
                  <Label>DMC paid</Label>
                  <Text style={[s.semi, { fontSize: 8.5 }]}>{line.dmcPaid}</Text>
                </View>
              ) : null}
              {line.dmcOwed !== undefined ? (
                <View>
                  <Label>Owed</Label>
                  {/* No tone in the view for dmcOwed (view.ts gap): neutral ink, no string-compare on money text. */}
                  <Text style={[s.semi, { fontSize: 8.5 }]}>{line.dmcOwed}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      }
    >
      <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center', gap: 8 }]}>
        <View style={[s.row, { gap: 6, alignItems: 'center' }]}>
          <Text style={[s.monoB, { fontSize: 9, color: c.muted }]}>{line.no}</Text>
          <Label color={line.type === 'Flight' ? c.sky : c.teal} style={{ fontSize: 7 }}>
            {line.type}
          </Label>
        </View>
        <Text style={[s.semi, { fontSize: 8.5, color: c.muted }]}>{line.dates}</Text>
      </View>
      <Text style={[s.h, { fontSize: 11, marginTop: 2 }, cancelled ? { color: c.muted } : {}]}>{line.description}</Text>
      <View style={[s.row, { marginTop: 6, gap: 16, flexWrap: 'wrap' }]}>
        <View style={{ flexShrink: 1 }}>
          <Label>Supplier</Label>
          <Text style={[s.semi, { fontSize: 8.5 }]}>{line.supplier}</Text>
        </View>
        <View>
          <Label>Net cost</Label>
          <Text style={[s.semi, { fontSize: 8.5 }, line.cancellationCharge !== undefined ? s.struck : {}]}>{line.netCost}</Text>
        </View>
        {line.cancellationCharge !== undefined ? (
          <View>
            <Label color={c.danger}>Cancellation charge</Label>
            <Text style={[s.semi, { fontSize: 8.5, color: c.danger }]}>{line.cancellationCharge}</Text>
          </View>
        ) : null}
        {line.payBy ? (
          <View style={{ alignSelf: 'flex-end', backgroundColor: c.warnSoft, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 }}>
            <Text style={{ fontSize: 7.5, fontWeight: 600, color: c.warn }}>{line.payBy}</Text>
          </View>
        ) : null}
      </View>
    </Ticket>
  );
}

function DmcStubs({ dmcs }: { dmcs: V['dmcs'] }) {
  return (
    <View style={[s.row, { flexWrap: 'wrap', marginHorizontal: -4 }]}>
      {dmcs.map((d, i) => (
        <View key={i} style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }} wrap={false}>
          <Ticket
            stubWidth={86}
            pad={8}
            stubBg={toneSoft[d.tone]}
            stub={
              <View>
                <Label color={toneColour[d.tone]}>{d.label}</Label>
                <Text style={[s.h, s.right, { fontSize: 11, color: toneColour[d.tone], marginTop: 1 }]}>{d.outstanding}</Text>
              </View>
            }
          >
            <Text style={[s.semi, { fontSize: 9.5 }]}>{d.name}</Text>
            {d.contact ? <Text style={{ fontSize: 7.5, color: c.muted }}>{d.contact}</Text> : null}
            <View style={[s.row, { gap: 12, marginTop: 4 }]}>
              <View>
                <Label>Cost</Label>
                <Text style={[s.semi, { fontSize: 8.5 }]}>{d.cost}</Text>
              </View>
              <View>
                <Label>Paid</Label>
                <Text style={[s.semi, { fontSize: 8.5 }]}>{d.paid}</Text>
              </View>
            </View>
          </Ticket>
        </View>
      ))}
    </View>
  );
}

const LEDGER_COLS = { date: 58, dir: 26, kind: 44, mode: 62, ref: 72, amount: 70 };

function Ledger({ rows }: { rows: V['ledger'] }) {
  const th = { ...s.label, fontSize: 6.5 } as const;
  return (
    <View style={[s.card, { paddingHorizontal: 12, paddingVertical: 8 }]}>
      <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: c.ink, paddingBottom: 4 }]} minPresenceAhead={40}>
        <Text style={[th, { width: LEDGER_COLS.date }]}>Date</Text>
        <Text style={[th, { width: LEDGER_COLS.dir }]}>Dir</Text>
        <Text style={[th, { flex: 1 }]}>Party</Text>
        <Text style={[th, { width: LEDGER_COLS.kind }]}>Kind</Text>
        <Text style={[th, { width: LEDGER_COLS.mode }]}>Mode</Text>
        <Text style={[th, { width: LEDGER_COLS.ref }]}>Ref</Text>
        <Text style={[th, { width: LEDGER_COLS.amount, textAlign: 'right' }]}>Amount</Text>
      </View>
      {rows.map((r, i) => {
        const inbound = r.direction === 'In';
        return (
          <View key={i} wrap={false} style={[s.row, { paddingVertical: 3.5, borderBottomWidth: i === rows.length - 1 ? 0 : 0.5, borderBottomColor: c.hair, alignItems: 'flex-start' }]}>
            <Text style={[s.mono, { width: LEDGER_COLS.date, fontSize: 7.5 }]}>{r.date}</Text>
            <Text style={[s.monoB, { width: LEDGER_COLS.dir, fontSize: 7.5, color: inbound ? c.action : c.danger }]}>{inbound ? 'IN' : 'OUT'}</Text>
            <Text style={{ flex: 1, paddingRight: 6, fontSize: 8.5 }}>{r.party}</Text>
            <Text style={{ width: LEDGER_COLS.kind, fontSize: 8.5 }}>{r.kind}</Text>
            <Text style={{ width: LEDGER_COLS.mode, fontSize: 8.5, color: c.muted }}>{r.mode}</Text>
            <Text style={[s.mono, { width: LEDGER_COLS.ref, fontSize: 7.5, color: c.muted }]}>{r.ref}</Text>
            <Text style={[s.semi, { width: LEDGER_COLS.amount, textAlign: 'right', fontSize: 8.5, color: inbound ? c.action : c.danger }]}>{`${inbound ? '+' : '−'} ${r.amount}`}</Text>
          </View>
        );
      })}
    </View>
  );
}

export const AdminInvoice: AdminInvoiceTemplate = ({ view: v, assets }) => {
  const cancelled = v.cancelledPill;
  return (
    <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
      <Page size="A4" style={[s.page, { paddingTop: 80 }]}>
        <View fixed style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 15, backgroundColor: c.danger, justifyContent: 'center' }}>
          <Text style={{ color: c.white, fontSize: 7.5, fontWeight: 600, letterSpacing: 1.6, textAlign: 'center' }}>{v.internalBanner}</Text>
        </View>
        <HeaderStrip
          top={24}
          wordmark={assets.wordmark}
          title="OPS MANIFEST"
          code={v.bookingNo}
          accent={c.ink}
          meta={[v.preparedLine, v.invoiceNo === 'Not invoiced yet' ? v.invoiceNo : `Invoice ${v.invoiceNo}`, v.dateLine]}
          badge={<Badge color={c.danger} filled>INTERNAL</Badge>}
        />

        {cancelled ? (
          <Ticket accent={c.danger} border={c.danger} style={{ marginBottom: 10, backgroundColor: c.dangerSoft }}>
            <View style={[s.row, { alignItems: 'center', gap: 10 }]}>
              <Badge color={c.danger} filled>
                CANCELLED
              </Badge>
              {v.cancelReason ? (
                <Text style={[s.semi, { color: c.danger, flex: 1 }]}>
                  <Text style={[s.label, { color: c.danger }]}>Reason </Text>
                  {v.cancelReason}
                </Text>
              ) : null}
            </View>
            {v.cancelledNote ? <Text style={{ marginTop: 4, color: c.danger }}>{v.cancelledNote}</Text> : null}
          </Ticket>
        ) : null}

        <ProfitStub v={v} />

        {v.internalNotes.length ? (
          <View wrap={false} style={{ marginTop: 10 }}>
            <Ticket accent={c.warn} pad={8}>
              <Label color={c.warn} style={{ marginBottom: 3 }}>
                Internal notes
              </Label>
              {v.internalNotes.map((n, i) => (
                <View key={i} style={[s.row, { gap: 6, marginTop: i ? 2 : 0 }]}>
                  <Text style={[s.monoB, { fontSize: 8, color: c.warn }]}>{'>'}</Text>
                  <Text style={{ flex: 1 }}>{n}</Text>
                </View>
              ))}
            </Ticket>
          </View>
        ) : null}

        <View style={{ marginTop: 10 }}>
          <CustomerSide v={v} />
        </View>

        {v.costLines.length ? (
          <>
            <SectionTitle right={<Text style={[s.mono, { fontSize: 8, color: c.muted }]}>{`${v.costLines.length} LINE${v.costLines.length === 1 ? '' : 'S'}`}</Text>}>
              Cost lines
            </SectionTitle>
            {v.costLines.map((l) => (
              <CostLine key={l.no} line={l} cancelled={cancelled} />
            ))}
          </>
        ) : null}

        {v.dmcs.length ? (
          <View minPresenceAhead={130}>
            <SectionTitle>DMC position</SectionTitle>
            <DmcStubs dmcs={v.dmcs} />
          </View>
        ) : null}

        {v.ledger.length ? (
          <>
            <SectionTitle>Ledger</SectionTitle>
            <Ledger rows={v.ledger} />
          </>
        ) : null}

        <Footer lines={v.footer} />
      </Page>
    </Document>
  );
};
