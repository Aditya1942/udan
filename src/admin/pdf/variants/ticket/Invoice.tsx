/**
 * "Ticket" customer Invoice: a receipt ticket. One long ticket card (fare, services, totals) ending in a perforated
 * tear-off "Payment slip" whose face follows the result: balance due + UPI QR, PAID stamp, or REFUND DUE.
 * Never prints DMC, net cost or commission (the InvoiceView carries none).
 */
import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import type { Style } from '@react-pdf/types';
import type { InvoiceTemplate } from '../types';
import type { InvoiceView, Pair } from '../../view';
import { Badge, c, Footer, HeaderStrip, Label, s, Stamp, toneColour, Wrappable } from './styles';

const RAD = 9;

/** One segment of the long ticket: side borders always, top/bottom only at the ends. */
export function Seg({ children, first, last, bg, style, wrap = false }: { children: ReactNode; first?: boolean; last?: boolean; bg?: string; style?: Style; wrap?: boolean }) {
  return (
    <View
      wrap={wrap}
      style={[
        {
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: bg && first ? bg : c.line,
          paddingHorizontal: 16,
          paddingVertical: 11,
          backgroundColor: bg,
        },
        first ? { borderTopWidth: 1, borderTopLeftRadius: RAD, borderTopRightRadius: RAD } : {},
        last ? { borderBottomWidth: 1, borderBottomLeftRadius: RAD, borderBottomRightRadius: RAD } : {},
        style ?? {},
      ]}
    >
      {children}
    </View>
  );
}

/** Horizontal perforation across the ticket with side notches and a tear label. */
export function Perforation({ label }: { label: string }) {
  const R = 7;
  const notch = (side: 'left' | 'right'): Style => ({
    position: 'absolute',
    top: -R + 0.5,
    ...(side === 'left' ? { left: -R - 0.5 } : { right: -R - 0.5 }),
    width: 2 * R,
    height: 2 * R,
    borderRadius: R,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.white,
  });
  const cover = (side: 'left' | 'right'): Style => ({ position: 'absolute', top: -R - 1, ...(side === 'left' ? { left: -R - 3 } : { right: -R - 3 }), width: R + 2.5, height: 2 * R + 3, backgroundColor: c.white });
  return (
    <View style={{ height: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.line }}>
      <View style={{ position: 'absolute', left: 10, right: 10, top: 0, borderTopWidth: 1, borderTopStyle: 'dashed', borderTopColor: c.faint }} />
      <View style={{ position: 'absolute', top: -5, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={[s.monoB, { fontSize: 6.5, color: c.faint, backgroundColor: c.white, paddingHorizontal: 6, letterSpacing: 1.5 }]}>{label}</Text>
      </View>
      <View style={notch('left')} />
      <View style={cover('left')} />
      <View style={notch('right')} />
      <View style={cover('right')} />
    </View>
  );
}

function PairRows({ rows, labelWidth = 52 }: { rows: Pair[]; labelWidth?: number }) {
  return (
    <>
      {rows.map((r, i) => (
        <View key={i} style={[s.row, { marginTop: 1.5 }]}>
          <Text style={[s.label, { width: labelWidth, fontSize: 6.5, paddingTop: 1.5 }]}>{r.label}</Text>
          <Wrappable text={r.value} style={{ fontSize: 8.5 }} />
        </View>
      ))}
    </>
  );
}

function Column({ label, children, flex = 1 }: { label: string; children: ReactNode; flex?: number }) {
  return (
    <View style={{ flex }}>
      <Label style={{ marginBottom: 4 }}>{label}</Label>
      {children}
    </View>
  );
}

/** Head band + addresses + fare + services: shared by the customer and admin invoices. */
export function InvoiceBody({ v }: { v: Pick<InvoiceView, 'categoryLabel' | 'item' | 'bookingNo' | 'invoiceDate' | 'status' | 'billedTo' | 'billedToDetails' | 'trip' | 'letterhead' | 'cancelledNote' | 'lineItems' | 'servicesStruck' | 'originalPrice'> & { invoiceDate: string }; compact?: boolean }) {
  const lh = v.letterhead;
  const fromLines = [lh.address.join(', '), lh.phones.join(' · '), lh.email, lh.website].filter((l): l is string => Boolean(l));
  const headline = v.trip.destination || v.item.title;
  const hasDates = v.lineItems.some((li) => li.dates);
  const struck = v.servicesStruck ? s.struck : {};
  return (
    <>
      <Seg first bg={c.teal} style={{ paddingVertical: 11 }}>
        <View style={[s.row, { gap: 16, alignItems: 'flex-start' }]}>
          <View style={{ flex: 1 }}>
            <Label color="#bfe3ef">{v.categoryLabel}</Label>
            <Text style={[s.h, { fontSize: 14, color: c.white, marginTop: 3 }]}>{headline}</Text>
            {v.item.detail ? <Text style={[s.semi, { color: '#dff0f5', marginTop: 2 }]}>{v.item.detail}</Text> : null}
          </View>
          <View style={[s.row, { gap: 16 }]}>
            <View>
              <Label color="#bfe3ef">Booking</Label>
              <Text style={[s.monoB, { fontSize: 11, color: c.white, marginTop: 2 }]}>{v.bookingNo}</Text>
            </View>
            {v.invoiceDate ? (
              <View>
                <Label color="#bfe3ef">Issued</Label>
                <Text style={[s.semi, { color: c.white, marginTop: 2 }]}>{v.invoiceDate}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Seg>

      <Seg>
        <View style={[s.row, { gap: 16 }]}>
          <Column label="Billed to" flex={1.3}>
            {v.billedTo.name ? <Text style={[s.semi, { fontSize: 9.5 }]}>{v.billedTo.name}</Text> : null}
            <PairRows rows={v.billedToDetails} />
          </Column>
          {v.trip.travellers.length ? (
            <Column label="Travellers">
              {v.trip.travellers.map((tr, i) => (
                <View key={i} style={[s.row, { gap: 6, marginTop: i ? 1.5 : 0 }]}>
                  <Text style={[s.monoB, { fontSize: 7.5, color: c.teal, paddingTop: 0.5 }]}>{String(i + 1).padStart(2, '0')}</Text>
                  <Text style={{ flex: 1, fontSize: 8.5 }}>{tr}</Text>
                </View>
              ))}
            </Column>
          ) : null}
          {lh.name || fromLines.length ? (
            <Column label="Issued by">
              {lh.name ? <Text style={[s.semi, { fontSize: 9.5 }]}>{lh.name}</Text> : null}
              {fromLines.map((l, i) => (
                <Text key={i} style={{ color: c.muted }}>
                  {l}
                </Text>
              ))}
            </Column>
          ) : null}
        </View>
      </Seg>

      {v.cancelledNote ? (
        <Seg bg={c.dangerSoft} style={{ paddingVertical: 8 }}>
          <Text style={{ color: c.danger, fontWeight: 600 }}>{v.cancelledNote}</Text>
        </Seg>
      ) : null}

      <Seg wrap style={{ paddingTop: 10, paddingBottom: 10 }}>
        <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: c.ink, paddingBottom: 4 }]}>
          <Label style={{ flex: 1 }}>Fare</Label>
          <Label style={{ width: 110, textAlign: 'right' }}>Amount</Label>
        </View>
        <View wrap={false} style={[s.row, { paddingVertical: 8, borderBottomWidth: 0.75, borderBottomColor: c.hair }]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[s.semi, { fontSize: 9.5 }]}>{v.item.title}</Text>
            {v.item.detail ? <Text style={s.muted}>{v.item.detail}</Text> : null}
          </View>
          <Text style={[s.h, s.right, { width: 110, fontSize: 11 }]}>{v.item.amount}</Text>
        </View>

        {v.lineItems.length > 0 ? (
          <View style={{ marginTop: 10 }}>
            <View style={[s.row, { paddingBottom: 4, borderBottomWidth: 0.75, borderBottomColor: c.line }]} minPresenceAhead={40}>
              <Label style={{ width: 26 }}>No.</Label>
              <Label style={{ width: 70 }}>Service</Label>
              <Label style={{ flex: 1 }}>{v.servicesStruck ? 'Included services (cancelled)' : 'Included services'}</Label>
              {hasDates ? <Label style={{ width: 130, textAlign: 'right' }}>Dates</Label> : null}
            </View>
            {v.lineItems.map((li) => (
              <View key={li.no} wrap={false} style={[s.row, { paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: c.hair }]}>
                <Text style={[s.monoB, { width: 26, fontSize: 8.5, color: v.servicesStruck ? c.faint : c.teal }]}>{li.no}</Text>
                <Text style={[s.semi, { width: 70 }, struck]}>{li.type}</Text>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={struck}>{li.description}</Text>
                  {li.detail ? <Text style={[{ fontSize: 7.5, color: c.muted }, struck]}>{li.detail}</Text> : null}
                </View>
                {hasDates ? <Text style={[{ width: 130, textAlign: 'right', color: c.muted, fontSize: 8.5 }, struck]}>{li.dates}</Text> : null}
              </View>
            ))}
            {v.servicesStruck ? (
              <View style={{ position: 'absolute', top: 26, left: 0, right: 0, alignItems: 'center' }}>
                <Stamp text="VOID · CANCELLED" colour={c.danger} size={16} rotate={-8} style={{ backgroundColor: 'rgba(255,255,255,0.75)' }} />
              </View>
            ) : null}
          </View>
        ) : null}
        {v.originalPrice ? (
          <View wrap={false} style={[s.row, { justifyContent: 'space-between', paddingTop: 6 }]}>
            <Text style={s.muted}>{v.originalPrice.label}</Text>
            <Text style={[s.semi, s.struck, s.right]}>{v.originalPrice.amount}</Text>
          </View>
        ) : null}
      </Seg>
    </>
  );
}

/** Totals block: lines, then the coloured result. */
export function Totals({ v }: { v: Pick<InvoiceView, 'totals'> }) {
  const tone = toneColour[v.totals.result.tone];
  return (
    <View>
      {v.totals.lines.map((l, i) => (
        <View key={i} style={[s.row, { justifyContent: 'space-between', paddingVertical: 2, gap: 10 }]}>
          <Text style={[{ flex: 1 }, l.muted ? s.muted : s.semi]}>{l.label}</Text>
          <Text style={[l.muted ? s.muted : s.semi, s.right]}>{l.amount}</Text>
        </View>
      ))}
      <View style={[s.row, { justifyContent: 'space-between', borderTopWidth: 1.25, borderTopColor: c.ink, marginTop: 4, paddingTop: 5 }]}>
        <Text style={[s.h, { fontSize: 11, color: tone }]}>{v.totals.result.label}</Text>
        <Text style={[s.h, s.right, { fontSize: 11, color: tone }]}>{v.totals.result.amount}</Text>
      </View>
      {v.totals.result.note ? <Text style={[s.muted, s.right, { marginTop: 2 }]}>{v.totals.result.note}</Text> : null}
    </View>
  );
}

function SlipMeta({ v }: { v: InvoiceView }) {
  return (
    <View style={[s.row, { gap: 16, marginTop: 8, flexWrap: 'wrap' }]}>
      <View>
        <Label>Invoice no.</Label>
        <Text style={[s.monoB, { fontSize: 9.5 }]}>{v.invoiceNo}</Text>
      </View>
      <View>
        <Label>Booking</Label>
        <Text style={[s.monoB, { fontSize: 9.5 }]}>{v.bookingNo}</Text>
      </View>
      {v.billedTo.name ? (
        <View style={{ flexShrink: 1 }}>
          <Label>Name</Label>
          <Text style={s.semi}>{v.billedTo.name}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** The tear-off stub. */
function PaymentSlip({ v, qr }: { v: InvoiceView; qr?: string }) {
  const r = v.totals.result;
  const tone = toneColour[r.tone];
  if (r.label === 'Balance due') {
    const bank = v.payment ? v.bankRows : [];
    return (
      <Seg last style={{ paddingTop: 12, paddingBottom: 11 }}>
        <View style={[s.row, { gap: 16, alignItems: 'flex-start' }]}>
          <View style={{ flex: 1 }}>
            <Label color={c.teal}>Payment slip</Label>
            <Label style={{ marginTop: 6 }}>{r.label}</Label>
            <Text style={[s.h, { fontSize: 22, color: tone }]}>{r.amount}</Text>
            {r.note ? <Text style={[s.semi, { color: tone, marginTop: 1 }]}>{`Pay ${r.note}`}</Text> : null}
            <SlipMeta v={v} />
          </View>
          {bank.length ? (
            <View style={{ width: 176, borderLeftWidth: 0.75, borderLeftColor: c.hair, paddingLeft: 12 }}>
              <Label style={{ marginBottom: 4 }}>Pay to</Label>
              {bank.map((b, i) => (
                <View key={i} style={{ marginBottom: 3 }}>
                  <Text style={[s.label, { fontSize: 6.5 }]}>{b.label}</Text>
                  <Text style={[b.label === 'Account no.' || b.label === 'IFSC' || b.label === 'UPI' ? s.monoB : s.semi, { fontSize: 8.5 }]}>{b.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {qr && v.payment?.qr ? (
            <View style={{ alignItems: 'center', width: 96 }}>
              <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 5, padding: 3 }}>
                <Image src={qr} style={{ width: 84, height: 84 }} />
              </View>
              <Text style={{ fontSize: 7.5, color: c.muted, marginTop: 4, textAlign: 'center' }}>{v.payment.qr.caption}</Text>
            </View>
          ) : null}
        </View>
      </Seg>
    );
  }
  const paid = r.label === 'Paid in full';
  return (
    <Seg last bg={paid ? undefined : c.warnSoft} style={{ paddingTop: 14, paddingBottom: 13 }}>
      <View style={[s.row, { gap: 16, alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Label color={c.teal}>
            {paid ? 'Payment receipt' : 'Refund slip'}
          </Label>
          {/* Paid in full: net received = the total (summary.received is gross, before refunds). */}
          <Label style={{ marginTop: 6 }}>{paid ? 'Amount paid' : r.label}</Label>
          <Text style={[s.h, { fontSize: 20, color: paid ? c.ink : tone }]}>{paid ? v.summary.total : r.amount}</Text>
          {paid ? <Text style={[s.semi, { color: tone, marginTop: 2 }]}>{r.label}</Text> : null}
          <SlipMeta v={v} />
        </View>
        <View style={{ width: 170, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
          <Stamp text={paid ? 'PAID' : 'REFUND DUE'} colour={tone} size={paid ? 28 : 16} />
        </View>
      </View>
    </Seg>
  );
}

export const Invoice: InvoiceTemplate = ({ view: v, assets }) => (
  <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
    <Page size="A4" style={[s.page, { paddingTop: 78 }]}>
      <HeaderStrip
        wordmark={assets.wordmark}
        title="INVOICE"
        code={v.invoiceNo}
        meta={[v.dateLine, v.bookingLine]}
        badge={v.cancelledPill ? <Badge color={c.danger}>CANCELLED</Badge> : undefined}
      />

      <InvoiceBody v={v} />

      <Seg wrap={false} style={{ paddingTop: 10, paddingBottom: 10 }}>
        <View style={[s.row, { gap: 20, alignItems: 'flex-start' }]}>
          <View style={{ flex: 1 }}>
            <Label>Total in words</Label>
            <Text style={[s.semi, { marginTop: 2 }]}>{v.summary.inWords}</Text>
            {v.signature ? (
              <View style={{ marginTop: 8, alignSelf: 'flex-start', alignItems: 'center' }}>
                <Image src={v.signature.image} style={{ width: 90, height: 28, objectFit: 'contain' }} />
                <Text style={{ fontSize: 7.5, color: c.muted, borderTopWidth: 0.75, borderTopColor: c.line, paddingTop: 2, marginTop: 2 }}>{v.signature.caption}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ width: 240 }}>
            <Totals v={v} />
          </View>
        </View>
      </Seg>
      <View wrap={false}>
        <Perforation label={v.totals.result.label === 'Balance due' ? 'TEAR HERE · PAYMENT SLIP' : 'TEAR HERE'} />
        <PaymentSlip v={v} qr={assets.qr} />
      </View>

      {v.terms.length ? (
        <View wrap={false} style={{ marginTop: 9, paddingHorizontal: 4 }}>
          <Label style={{ marginBottom: 3 }}>Terms</Label>
          {v.terms.map((t, i) => (
            <Text key={i} style={{ fontSize: 7.5, color: c.muted, lineHeight: 1.35 }}>
              {`${i + 1}. ${t}`}
            </Text>
          ))}
        </View>
      ) : null}

      <Footer lines={v.footer} />
    </Page>
  </Document>
);
