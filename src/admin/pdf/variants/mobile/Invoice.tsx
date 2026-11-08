/** Phone-first customer Invoice: the balance as a hero card, then stacked cards. No DMC, cost or commission. */
import { Document, Image, Text, View } from '@react-pdf/renderer';
import type { AdminInvoiceView, InvoiceView } from '../../view';
import type { InvoiceTemplate } from '../types';
import { c, Card, Closing, Header, IssuedBy, MoneyRow, Pairs, PhonePage, Pill, s, toneColour } from './parts';

type AnyInvoice = InvoiceView | AdminInvoiceView;

/** Red banner for a cancelled booking. */
export function CancelledBanner({ note, reason }: { note?: string; reason?: string }) {
  return (
    <View
      wrap={false}
      style={{
        backgroundColor: c.dangerSoft,
        borderLeftWidth: 4,
        borderLeftColor: c.danger,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <Text style={[s.h, { fontSize: 12.5, color: c.danger }]}>Booking cancelled</Text>
      {note ? <Text style={[s.body, { color: c.danger, marginTop: 4 }]}>{note}</Text> : null}
      {reason ? <Text style={{ color: c.danger, marginTop: 4, fontWeight: 600 }}>Reason: {reason}</Text> : null}
    </View>
  );
}

/** The one fact that matters: balance due / paid in full / refund due. */
function Hero({ v }: { v: InvoiceView }) {
  const r = v.totals.result;
  const paid = v.balance === 0;
  return (
    <View
      wrap={false}
      style={{
        backgroundColor: toneColour[r.tone],
        borderRadius: 14,
        padding: 16,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          color: c.white,
          fontSize: 10.5,
          fontWeight: 600,
        }}
      >
        {paid ? 'Thank you' : r.label}
      </Text>
      <Text
        style={[
          s.h,
          {
            color: c.white,
            fontSize: paid ? 26 : 30,
            lineHeight: 1.15,
            marginTop: 4,
          },
        ]}
      >
        {paid ? r.label : r.amount}
      </Text>
      {r.note ? <Text style={[s.h, { color: c.white, fontSize: 12.5, marginTop: 4 }]}>Pay {r.note}</Text> : null}
      <View
        style={{
          borderTopWidth: 0.75,
          borderTopColor: 'rgba(255,255,255,0.35)',
          marginTop: 12,
          paddingTop: 8,
        }}
      >
        <View style={s.between}>
          <Text style={{ color: c.white }}>Invoice total</Text>
          <Text style={{ color: c.white, fontWeight: 600 }}>{v.summary.total}</Text>
        </View>
      </View>
    </View>
  );
}

export function BilledTo({ v, compact }: { v: AnyInvoice; compact?: boolean }) {
  if (!v.billedTo.name && !v.billedToDetails.length) return null;
  return (
    <Card label="Billed to">
      {v.billedTo.name ? (
        <Text
          style={[
            s.h,
            {
              fontSize: compact ? 12.5 : 14,
              marginBottom: v.billedToDetails.length ? 8 : 0,
            },
          ]}
        >
          {v.billedTo.name}
        </Text>
      ) : null}
      <Pairs rows={v.billedToDetails} />
    </Card>
  );
}

export function Trip({ v }: { v: AnyInvoice }) {
  const t = v.trip;
  const facts = [t.dates, t.pax].filter(Boolean);
  if (!t.destination && !facts.length && !t.travellers.length) return null;
  return (
    <Card label="Trip">
      <Pill>{v.categoryLabel}</Pill>
      {t.destination ? <Text style={[s.h, { fontSize: 14, marginTop: 4 }]}>{t.destination}</Text> : null}
      {facts.map((f, i) => (
        <Text key={i} style={{ marginTop: i ? 0 : 4 }}>
          {f}
        </Text>
      ))}
      {t.travellers.length ? (
        <View style={{ marginTop: 6 }}>
          <Text style={s.small}>Travellers</Text>
          {t.travellers.map((n, i) => (
            <Text key={i}>{n}</Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

export function Payments({ v, words = true }: { v: AnyInvoice; words?: boolean }) {
  const r = v.totals.result;
  return (
    <Card label="Payments">
      {v.totals.lines.map((l, i) => (
        <MoneyRow key={i} first={i === 0} label={l.label} amount={l.amount} muted={l.muted} />
      ))}
      <View style={{ borderTopWidth: 1.25, borderTopColor: c.ink, marginTop: 2 }}>
        <MoneyRow first label={r.label} amount={r.amount} colour={toneColour[r.tone]} bold />
        {r.note ? <Text style={[s.small, { textAlign: 'right', marginTop: -4 }]}>{r.note}</Text> : null}
      </View>
      {words && v.summary.inWords ? (
        <Text style={[s.small, s.para, { marginTop: 6 }]}>Invoice total in words: {v.summary.inWords}</Text>
      ) : null}
    </Card>
  );
}

function Included({ v }: { v: InvoiceView }) {
  const struck = v.servicesStruck ? s.struck : {};
  return (
    <Card label="What’s included" wrap={v.lineItems.length > 5}>
      <View style={[s.between, { gap: 12, paddingBottom: v.lineItems.length ? 10 : 0 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.h, { fontSize: 12.5 }]}>{v.item.title}</Text>
          {v.item.detail ? <Text style={s.small}>{v.item.detail}</Text> : null}
        </View>
        <Text style={[s.h, { fontSize: 12.5 }]}>{v.item.amount}</Text>
      </View>
      {v.lineItems.map((li, i) => {
        const meta = [li.dates, li.detail].filter(Boolean).join(' · ');
        return (
          <View key={i} wrap={false} style={[s.row, s.divider, { paddingVertical: 8, gap: 8 }]}>
            <View style={{ width: 70 }}>
              <Pill>{li.type}</Pill>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.body, struck]}>{li.description}</Text>
              {meta ? <Text style={[s.small, struck]}>{meta}</Text> : null}
            </View>
          </View>
        );
      })}
      {v.originalPrice ? (
        <View wrap={false} style={[s.between, s.divider, { paddingTop: 8, gap: 8 }]}>
          <Text style={[s.small, { flex: 1 }]}>{v.originalPrice.label}</Text>
          <Text style={s.struck}>{v.originalPrice.amount}</Text>
        </View>
      ) : null}
    </Card>
  );
}

function PayNow({ v, qr }: { v: InvoiceView; qr?: string }) {
  const p = v.payment;
  if (!p) return null;
  const bank = v.bankRows.filter((r) => !(p.upiId && r.label === 'UPI'));
  return (
    <Card label="Pay now" style={{ borderColor: c.action, borderWidth: 1.5 }}>
      {qr && p.qr ? (
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <Image src={qr} style={{ width: 150, height: 150 }} />
          <Text style={[s.h, { fontSize: 12.5, color: c.action, marginTop: 4 }]}>{p.qr.caption}</Text>
          <Text style={s.small}>with any UPI app</Text>
        </View>
      ) : null}
      {p.upiId ? (
        <View
          style={{
            backgroundColor: c.actionSoft,
            borderRadius: 8,
            padding: 8,
            marginBottom: bank.length ? 8 : 0,
          }}
        >
          <Text style={s.small}>UPI ID</Text>
          <Text style={[s.h, { fontSize: 14 }]}>{p.upiId}</Text>
        </View>
      ) : null}
      {bank.length ? (
        <View>
          <Text style={[s.small, { fontWeight: 600, marginBottom: 4 }]}>Bank transfer</Text>
          {bank.map((r, i) => (
            <View key={i} style={[s.between, i ? s.divider : {}, { paddingVertical: 5, gap: 8 }]}>
              <Text style={[s.muted, { width: 90 }]}>{r.label}</Text>
              <Text style={[s.semi, { flex: 1, textAlign: 'right' }]}>{r.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function Terms({ terms }: { terms: string[] }) {
  if (!terms.length) return null;
  return (
    <Card label="Terms">
      {terms.map((t, i) => (
        <View key={i} style={[s.row, { gap: 6, marginTop: i ? 4 : 0 }]}>
          <Text style={{ fontSize: 8.5, lineHeight: 1.45, width: 8 }}>•</Text>
          <Text style={[s.small, s.para, { flex: 1 }]}>{t}</Text>
        </View>
      ))}
    </Card>
  );
}

export const Invoice: InvoiceTemplate = ({ view: v, assets }) => (
  <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
    <PhonePage footerLeft={[v.letterhead.name, `Invoice ${v.invoiceNo}`].filter(Boolean).join(' · ')}>
      <Header
        wordmark={assets.wordmark}
        title="Invoice"
        lines={[v.invoiceNo, `${v.dateLine} · ${v.bookingLine}`]}
        pill={
          v.cancelledPill ? (
            <Pill colour={c.danger} bg={c.dangerSoft}>
              Cancelled
            </Pill>
          ) : undefined
        }
      />
      {v.cancelledPill ? <CancelledBanner note={v.cancelledNote} /> : null}
      <Hero v={v} />
      <BilledTo v={v} />
      <Trip v={v} />
      <Included v={v} />
      <Payments v={v} />
      <PayNow v={v} qr={assets.qr} />
      <Terms terms={v.terms} />
      <IssuedBy letterhead={v.letterhead} signature={v.signature} label="Issued by" />
      <Closing lines={v.footer} />
    </PhonePage>
  </Document>
);
