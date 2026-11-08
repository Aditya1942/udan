/**
 * Invoice PDF — "Minimal letter" (prototype Variant A) + Included services and the cancelled strike-through
 * from Variant C (branch prototype/invoice-templates, 90a45b6). Lays out an `InvoiceView`; decides nothing.
 */
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { base, colour } from './theme';
import type { InvoiceView, Tone } from './view';

const toneColour: Record<Tone, string> = { danger: colour.danger, action: colour.action, warn: colour.warn };

const s = StyleSheet.create({
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
  th: { fontSize: 7.5, color: colour.muted, paddingBottom: 5, borderBottomWidth: 0.75, borderBottomColor: colour.ink },
  td: { paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colour.border },
  sth: { fontSize: 7.5, color: colour.muted, paddingVertical: 4, borderBottomWidth: 0.75, borderBottomColor: colour.border },
  std: { paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: colour.border },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  struck: { textDecoration: 'line-through', color: colour.muted },
  pairLabel: { width: 76, fontSize: 7.5, paddingTop: 1 },
});

/** A label/value value that may break after "@" (react-pdf breaks only at spaces, or hyphenates, which would corrupt an e-mail). */
export function PairValue({ text }: { text: string }) {
  const parts = text.split(/(?<=@)/);
  if (parts.length < 2) return <Text style={{ flex: 1 }}>{text}</Text>;
  return (
    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
      {parts.map((p, i) => (
        <Text key={i}>{p}</Text>
      ))}
    </View>
  );
}

function ServiceRow({ row, struck }: { row: InvoiceView['services'][number]; struck: boolean }) {
  const st = struck ? s.struck : {};
  return (
    <View style={base.row} wrap={false}>
      <Text style={[s.std, { width: 78 }, st]}>{row.type}</Text>
      <Text style={[s.std, { flex: 1, paddingRight: 8 }, st]}>{row.description}</Text>
      <Text style={[s.std, { width: 140 }, st]}>{row.dates}</Text>
    </View>
  );
}

export function InvoiceDocument({ view: v, wordmark, qr }: { view: InvoiceView; wordmark: string; qr?: string }) {
  const resultColour = toneColour[v.totals.result.tone];
  return (
    <Document title={v.filenameTitle} author={v.from.name} creator={v.from.name} producer={v.from.name}>
      <Page size="A4" style={base.page}>
        <View style={base.head}>
          <Image src={wordmark} style={base.wordmark} />
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[base.row, { alignItems: 'center', gap: 8 }]}>
              {v.cancelledPill && <Text style={s.pill}>CANCELLED</Text>}
              <Text style={base.title}>Invoice</Text>
            </View>
            <Text style={[base.muted, { marginTop: 4 }]}>{v.invoiceNo}</Text>
            <Text style={base.muted}>{v.dateLine}</Text>
            <Text style={base.muted}>{v.bookingLine}</Text>
          </View>
        </View>

        <View style={[base.rule, { marginVertical: 16 }]} />

        <View style={[base.row, { gap: 24 }]}>
          {v.billedTo.name || v.billedToDetails.length ? (
            <View style={{ flex: 1 }}>
              <Text style={base.label}>Billed to</Text>
              {v.billedTo.name ? <Text style={base.semi}>{v.billedTo.name}</Text> : null}
              {/* Mobile, WhatsApp, email, address, GSTIN, PAN, contact person: filled rows only. */}
              {v.billedToDetails.map((r, i) => (
                <View key={i} style={base.row}>
                  <Text style={[base.muted, s.pairLabel]}>{r.label}</Text>
                  <PairValue text={r.value} />
                </View>
              ))}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {v.from.name || v.from.lines.length ? (
            <View style={{ flex: 1 }}>
              <Text style={base.label}>From</Text>
              {v.from.name ? <Text style={base.semi}>{v.from.name}</Text> : null}
              {v.from.lines.map((l, i) => (
                <Text key={i}>{l}</Text>
              ))}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>

        {v.cancelledNote ? <Text style={{ marginTop: 16, color: colour.danger }}>{v.cancelledNote}</Text> : null}

        <View style={{ marginTop: 16 }} wrap={false}>
          <View style={base.row}>
            <Text style={[s.th, { flex: 1 }]}>Description</Text>
            <Text style={[s.th, base.right, { width: 100 }]}>Amount</Text>
          </View>
          <View style={base.row}>
            <View style={[s.td, { flex: 1 }]}>
              <Text style={base.semi}>{v.item.title}</Text>
              {v.item.detail ? <Text style={base.muted}>{v.item.detail}</Text> : null}
              {v.trip.travellers.length > 0 ? <Text style={base.muted}>Travellers: {v.trip.travellers.join(', ')}</Text> : null}
            </View>
            <Text style={[s.td, base.right, { width: 100 }]}>{v.item.amount}</Text>
          </View>
        </View>

        {v.services.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <View wrap={false}>
              <Text style={[base.label, { marginBottom: 4 }]}>Included services</Text>
              <View style={base.row}>
                <Text style={[s.sth, { width: 78 }]}>Service</Text>
                <Text style={[s.sth, { flex: 1 }]}>Description</Text>
                <Text style={[s.sth, { width: 140 }]}>Dates</Text>
              </View>
              {/* First row travels with the heading so it never sits alone at a page foot. */}
              <ServiceRow row={v.services[0]} struck={v.servicesStruck} />
            </View>
            {v.services.slice(1).map((row, i) => (
              <ServiceRow key={i} row={row} struck={v.servicesStruck} />
            ))}
            {v.originalPrice && (
              <View wrap={false} style={[base.row, { justifyContent: 'space-between', paddingVertical: 4 }]}>
                <Text style={base.muted}>{v.originalPrice.label}</Text>
                <Text style={[s.struck, base.right]}>{v.originalPrice.amount}</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ alignSelf: 'flex-end', width: 230, marginTop: 12 }} wrap={false}>
          {v.totals.lines.map((l, i) => (
            <View key={i} style={s.totRow}>
              <Text style={l.muted ? base.muted : undefined}>{l.label}</Text>
              <Text style={[base.right, l.muted ? base.muted : undefined]}>{l.amount}</Text>
            </View>
          ))}
          <View style={[s.totRow, { borderTopWidth: 1, borderTopColor: colour.ink, marginTop: 4, paddingTop: 4 }]}>
            <Text style={[base.h, { fontSize: 11, color: resultColour }]}>{v.totals.result.label}</Text>
            <Text style={[base.h, base.right, { fontSize: 11, color: resultColour }]}>{v.totals.result.amount}</Text>
          </View>
          {v.totals.result.note ? (
            <Text style={[base.muted, base.right, { fontSize: 7.5, marginTop: 2 }]}>{v.totals.result.note}</Text>
          ) : null}
        </View>

        {v.payment && (
          <View wrap={false} style={[base.row, { marginTop: 16, gap: 24, alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <Text style={base.label}>Payment details</Text>
              {v.payment.bank.map((l, i) => (
                <Text key={i}>{l}</Text>
              ))}
              {v.payment.upiId ? <Text style={{ marginTop: v.payment.bank.length ? 4 : 0 }}>UPI {v.payment.upiId}</Text> : null}
            </View>
            {qr && v.payment.qr ? (
              <View style={{ alignItems: 'center' }}>
                <Image src={qr} style={{ width: 78, height: 78 }} />
                <Text style={[base.muted, { fontSize: 7, marginTop: 2 }]}>{v.payment.qr.caption}</Text>
              </View>
            ) : null}
          </View>
        )}

        {v.terms.length > 0 || v.signature ? (
          <View wrap={false} style={[base.row, { marginTop: 16, gap: 24, alignItems: 'flex-end' }]}>
            <View style={{ flex: 1 }}>
              {v.terms.length > 0 && (
                <>
                  <Text style={[base.label, { marginBottom: 3 }]}>Terms</Text>
                  {v.terms.map((t, i) => (
                    <Text key={i} style={[base.muted, { fontSize: 7.5, marginBottom: 2 }]}>
                      {t}
                    </Text>
                  ))}
                </>
              )}
            </View>
            {v.signature ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Image src={v.signature.image} style={{ width: 110, height: 40, objectFit: 'contain' }} />
                <Text style={[base.muted, { fontSize: 7.5 }]}>{v.signature.caption}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View fixed style={base.footer}>
          {v.footer.map((l, i) => (
            <Text key={i}>{l}</Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}
