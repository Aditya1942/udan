/** "Brand band" customer Invoice. Never prints DMC, net cost or commission (the view carries none). */
import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import type { InvoiceTemplate } from '../types';
import type { InvoiceView } from '../../view';
import { Band, c, Footer, Label, Pairs, Pill, RunningHead, s, Signature, Table, toneBorder, toneColour, toneTint, TypePill, zebra } from './parts';

/** Billed-to and Trip cards side by side. */
export function PartyCards({ v }: { v: InvoiceView }) {
  const hasTrip = Boolean(v.trip.destination || v.trip.dates);
  return (
    <View style={[s.row, { gap: 12 }]} wrap={false}>
      <View style={[s.card, { flex: 1 }]}>
        <Label>Billed to</Label>
        {v.billedTo.name ? <Text style={[s.h, { fontSize: 11, marginBottom: 4 }]}>{v.billedTo.name}</Text> : null}
        <Pairs rows={v.billedToDetails} />
      </View>
      <View style={[s.card, { flex: 1, backgroundColor: c.visa, borderColor: '#d2e5ed' }]}>
        <Label>{hasTrip ? 'Trip' : 'Service'}</Label>
        <Text style={[s.h, { fontSize: 11, marginBottom: 4 }]}>{v.trip.destination || v.categoryLabel}</Text>
        {v.trip.destination ? <Text style={[s.muted, { marginBottom: 2 }]}>{v.categoryLabel}</Text> : null}
        <Pairs
          rows={[
            ...(v.trip.dates ? [{ label: 'Dates', value: v.trip.dates }] : []),
            ...(v.trip.pax ? [{ label: 'Guests', value: v.trip.pax }] : []),
            ...(v.trip.travellers.length ? [{ label: 'Travellers', value: v.trip.travellers.join(', ') }] : []),
          ]}
        />
      </View>
    </View>
  );
}

/** Priced row + itemised services (zebra), struck through when cancelled. */
export function LineTable({ v }: { v: InvoiceView }) {
  const st = v.servicesStruck ? s.struck : {};
  /** No line has dates (e.g. Visa): drop the column instead of printing an empty "Dates" header. */
  const hasDates = v.lineItems.some((l) => l.dates);
  return (
    <View>
      <View
        style={[
          s.card,
          {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 6,
            paddingVertical: 7,
            paddingHorizontal: 10,
          },
        ]}
        wrap={false}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={[s.h, { fontSize: 10 }]}>{v.item.title}</Text>
          {v.item.detail ? <Text style={[s.muted, { marginTop: 1.5 }]}>{v.item.detail}</Text> : null}
          <Text style={[s.small, s.muted, { marginTop: 2.5 }]}>{v.summary.inWords}</Text>
        </View>
        <Text style={[s.h, { fontSize: 14 }]}>{v.item.amount}</Text>
      </View>
      {v.lineItems.length > 0 && (
        <View>
          <Table
            header={
              <View style={s.thRow}>
                <Text style={[s.th, { width: 20 }]}>#</Text>
                <Text style={[s.th, { width: 70 }]}>Service</Text>
                <Text style={[s.th, { flex: 1 }]}>Included</Text>
                {hasDates ? <Text style={[s.th, { width: 128, textAlign: 'right' }]}>Dates</Text> : null}
              </View>
            }
            rows={v.lineItems.map((l, i) => (
              <View key={l.no} style={[s.tr, zebra(i)]} wrap={false}>
                <Text style={[{ width: 20, color: c.faint }, st]}>{l.no}</Text>
                <View style={{ width: 70, paddingTop: 1 }}>
                  <TypePill type={l.type} faded={v.servicesStruck} />
                </View>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={st}>{l.description}</Text>
                  {l.detail ? <Text style={[s.small, s.muted, st]}>{l.detail}</Text> : null}
                </View>
                {hasDates ? <Text style={[{ width: 128, textAlign: 'right' }, s.muted, st]}>{l.dates}</Text> : null}
              </View>
            ))}
          />
        </View>
      )}
      {v.originalPrice && (
        <View
          style={[
            s.row,
            {
              justifyContent: 'space-between',
              paddingHorizontal: 8,
              paddingTop: 5,
            },
          ]}
          wrap={false}
        >
          <Text style={s.muted}>{v.originalPrice.label}</Text>
          <Text style={[s.struck, s.semi, s.right]}>{v.originalPrice.amount}</Text>
        </View>
      )}
    </View>
  );
}

/** Hero card: the one number that matters (coloured by tone) + the payments as a mini timeline. */
export function Hero({ v }: { v: InvoiceView }) {
  const r = v.totals.result;
  const lines = v.totals.lines;
  return (
    <View
      wrap={false}
      style={{
        marginTop: 8,
        borderRadius: 8,
        backgroundColor: toneTint[r.tone],
        borderWidth: 0.75,
        borderColor: toneBorder[r.tone],
        borderLeftWidth: 4,
        borderLeftColor: toneColour[r.tone],
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[s.label, { color: toneColour[r.tone], marginBottom: 2 }]}>{r.label}</Text>
        <Text style={[s.h, { fontSize: 24, color: toneColour[r.tone], lineHeight: 1.15 }]}>
          {/* Paid in full: the result amount is ₹0, so the hero shows the amount settled instead. */}
          {r.label === 'Paid in full' ? v.summary.total : r.amount}
        </Text>
        {r.note ? <Text style={[s.semi, { color: toneColour[r.tone], marginTop: 2 }]}>{r.note}</Text> : null}
      </View>
      {lines.length > 0 ? (
        <View
          style={{
            width: 262,
            backgroundColor: c.white,
            borderRadius: 6,
            borderWidth: 0.75,
            borderColor: c.border,
            paddingVertical: 6,
            paddingHorizontal: 10,
          }}
        >
          {lines.map((e, i) => {
            const refund = e.amount.startsWith('+');
            const dot = i === 0 ? c.teal : refund ? c.warn : c.action;
            const last = i === lines.length - 1;
            return (
              <View key={i} style={[s.row, { alignItems: 'stretch' }]}>
                <View style={{ width: 12, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 3.5,
                      backgroundColor: dot,
                      marginTop: 3,
                    }}
                  />
                  {!last ? (
                    <View
                      style={{
                        width: 1,
                        flexGrow: 1,
                        backgroundColor: c.border,
                        marginTop: 1.5,
                      }}
                    />
                  ) : null}
                </View>
                <Text
                  style={[
                    {
                      flex: 1,
                      paddingLeft: 5,
                      paddingRight: 6,
                      paddingBottom: last ? 0 : 5,
                    },
                    i === 0 ? s.semi : s.muted,
                  ]}
                >
                  {e.label}
                </Text>
                <Text style={[s.semi, s.right, { color: i === 0 ? c.ink : refund ? c.warn : c.action }]}>{e.amount}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** Pay-now card: bank lines + UPI + QR on travel tint. */
export function PayNow({ v, qr }: { v: InvoiceView; qr?: string }) {
  const p = v.payment;
  if (!p) return null;
  const showQr = Boolean(qr && p.qr);
  const r = v.totals.result;
  return (
    <View
      wrap={false}
      style={{
        marginTop: 8,
        borderRadius: 8,
        backgroundColor: c.travel,
        borderWidth: 0.75,
        borderColor: toneBorder.action,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={[s.row, { alignItems: 'baseline', gap: 8, marginBottom: 4 }]}>
          <Text style={[s.h, { fontSize: 11, color: c.action }]}>Pay now</Text>
          <Text style={s.muted}>
            {r.label} {r.amount}
            {r.note ? ` ${r.note}` : ''}
          </Text>
        </View>
        <View style={[s.row, { gap: 14 }]}>
          {p.bank.length > 0 && (
            <View style={{ flex: 1.4 }}>
              <Label>Bank transfer</Label>
              {p.bank.map((l, i) => (
                <Text key={i} style={i === 0 ? s.semi : undefined}>
                  {l}
                </Text>
              ))}
            </View>
          )}
          {p.upiId ? (
            <View style={{ flex: 1 }}>
              <Label>UPI</Label>
              <Text style={s.semi}>{p.upiId}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {showQr ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: c.white,
            borderRadius: 6,
            borderWidth: 0.75,
            borderColor: toneBorder.action,
            padding: 5,
          }}
        >
          <Image src={qr!} style={{ width: 68, height: 68 }} />
          <Text style={[s.small, s.semi, { marginTop: 2, color: c.action }]}>{p.qr!.caption}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function TermsAndSignature({ v }: { v: InvoiceView }) {
  if (!v.terms.length && !v.signature) return null;
  return (
    <View wrap={false} style={[s.row, { marginTop: 10, gap: 20, alignItems: 'flex-end' }]}>
      <View style={{ flex: 1 }}>
        {v.terms.length > 0 && (
          <>
            <Label>Terms</Label>
            {v.terms.map((t, i) => (
              <View key={i} style={[s.row, { marginBottom: 1.5 }]}>
                <Text style={{ width: 8, fontSize: 7, lineHeight: 1.35, color: c.lime }}>●</Text>
                <Text style={[s.muted, { fontSize: 7, lineHeight: 1.35, flex: 1 }]}>{t}</Text>
              </View>
            ))}
          </>
        )}
      </View>
      <Signature signature={v.signature} />
    </View>
  );
}

export const Invoice: InvoiceTemplate = ({ view: v, assets }) => (
  <Document title={v.filenameTitle} author={v.from.name} creator={v.from.name} producer={v.from.name}>
    <Page size="A4" style={s.page}>
      <RunningHead colour={c.tealDeep} text={`Invoice ${v.invoiceNo}  ·  ${v.bookingLine}`} />
      <View style={s.body}>
        <Band
          colour={c.tealDeep}
          wordmark={assets.wordmark}
          title="Invoice"
          pills={v.cancelledPill ? <Pill bg={c.danger}>CANCELLED</Pill> : undefined}
          meta={[v.invoiceNo, v.dateLine, v.bookingLine]}
          letterhead={v.letterhead}
        />
        <PartyCards v={v} />
        {v.cancelledNote ? (
          <View
            wrap={false}
            style={{
              marginTop: 10,
              borderRadius: 8,
              backgroundColor: c.dangerTint,
              borderWidth: 0.75,
              borderColor: toneBorder.danger,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: c.danger }}>{v.cancelledNote}</Text>
          </View>
        ) : null}
        <Hero v={v} />
        <View style={{ height: 6 }} />
        <LineTable v={v} />
        <PayNow v={v} qr={assets.qr} />
        <TermsAndSignature v={v} />
      </View>
      <Footer lines={v.footer} />
    </Page>
  </Document>
);
