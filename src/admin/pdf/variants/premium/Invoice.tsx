/** "Premium" customer Invoice: luxury stationery. Never prints DMC, net cost or commission (InvoiceView has none). */
import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import type { AdminInvoiceView, InvoiceView } from '../../view';
import type { InvoiceTemplate } from '../types';
import { Caps, Diamond, Footer, Header, Ornament, RunningHead, SectionHead, Serif } from './parts';
import { c, s, toneColour } from './styles';

type Common = InvoiceView | AdminInvoiceView;

/** Refined red small-caps "Cancelled" between short red rules. */
export const CancelledMark = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
    <View style={{ width: 22, borderBottomWidth: 0.5, borderBottomColor: c.danger }} />
    <Text style={[s.caps, { color: c.danger, fontSize: 7.5, letterSpacing: 2 }]}>Cancelled</Text>
    <View style={{ width: 22, borderBottomWidth: 0.5, borderBottomColor: c.danger }} />
  </View>
);

/** "Prepared for" and "Journey" side by side. */
export function Parties({ v, top = 16 }: { v: Common; top?: number }) {
  const t = v.trip;
  const hasJourney = Boolean(t.destination || t.dates);
  const journeyTitle = t.destination || v.categoryLabel;
  return (
    <View style={[s.row, { gap: 24, marginTop: top }]} wrap={false}>
      <View style={{ flex: 1 }}>
        <Caps gold>Prepared for</Caps>
        {v.billedTo.name ? <Serif style={{ fontSize: 18, color: c.ink, lineHeight: 1.25, marginTop: 4, marginBottom: 4 }}>{v.billedTo.name}</Serif> : null}
        {v.billedToDetails.map((p, i) => (
          <View key={i} style={[s.row, { marginTop: 2 }]}>
            <Text style={[s.caps, { width: 54, fontSize: 6, paddingTop: 1.5 }]}>{p.label}</Text>
            <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.45 }}>{p.value}</Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Caps gold>{hasJourney ? 'Journey' : 'Service'}</Caps>
        <Serif italic style={{ fontSize: 15, color: c.deep, lineHeight: 1.25, marginTop: 4, marginBottom: 4 }}>
          {journeyTitle}
        </Serif>
        {t.destination ? <Caps style={{ marginBottom: 3 }}>{v.categoryLabel}</Caps> : null}
        {t.dates ? <Text style={{ fontSize: 9, lineHeight: 1.45 }}>{t.dates}</Text> : null}
        {t.pax ? <Text style={[s.muted, { fontSize: 9, lineHeight: 1.45 }]}>{t.pax}</Text> : null}
        {t.travellers.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <Caps style={{ fontSize: 6 }}>Travellers</Caps>
            <Text style={{ fontSize: 9, lineHeight: 1.45 }}>{t.travellers.join(', ')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** Cancelled note (italic) and, for the admin copy, the reason. */
export function CancelledNote({ note, reason }: { note?: string; reason?: string }) {
  if (!note && !reason) return null;
  return (
    <View style={{ marginTop: 16, borderLeftWidth: 1.5, borderLeftColor: c.danger, paddingLeft: 10 }} wrap={false}>
      {note ? (
        <Serif italic style={{ fontSize: 10.5, color: c.danger, lineHeight: 1.4 }}>
          {note}
        </Serif>
      ) : null}
      {reason ? (
        <Text style={{ marginTop: note ? 4 : 0, fontSize: 9, lineHeight: 1.4 }}>
          <Text style={[s.caps, { color: c.danger }]}>Reason  </Text>
          {reason}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Flexible column with a dotted leader across its first line; the first child is white-backed so the dots show
 * only between the end of its text and the column's right edge (robust to wrapping, unlike a flex leader).
 */
function LeaderCol({ top, dots = true, children }: { top: number; dots?: boolean; children: ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: 'flex-start' }}>
      {dots ? <View style={[s.leader, { position: 'absolute', left: 0, right: 0, top }]} /> : null}
      {children}
    </View>
  );
}

/** The one priced row: serif title, dotted leader, amount. */
export function PricedItem({ v }: { v: Common }) {
  return (
    <View style={[s.row, { alignItems: 'flex-start' }]} wrap={false}>
      <LeaderCol top={12}>
        <Serif style={{ fontSize: 12.5, lineHeight: 1.3, backgroundColor: '#ffffff', paddingRight: 6 }}>{v.item.title}</Serif>
        {v.item.detail ? <Text style={[s.muted, { fontSize: 9, lineHeight: 1.4, marginTop: 2 }]}>{v.item.detail}</Text> : null}
      </LeaderCol>
      <Text style={[s.money, { fontSize: 12.5, marginTop: 1, paddingLeft: 6 }]}>{v.item.amount}</Text>
    </View>
  );
}

/** Included services: numbered list with dotted leaders to the dates. */
export function Included({ v }: { v: InvoiceView }) {
  if (v.lineItems.length === 0) return null;
  const struck = v.servicesStruck;
  return (
    <View style={{ marginTop: 12 }}>
      <Caps gold style={{ marginBottom: 4 }}>
        Included in your {v.category === 'Package' ? 'package' : 'booking'}
      </Caps>
      {v.lineItems.map((l) => (
        <View key={l.no} style={[s.row, { alignItems: 'flex-start', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: c.hair }]} wrap={false}>
          <Serif style={{ width: 18, fontSize: 9, color: c.goldText, paddingTop: 0.5 }}>{l.no}</Serif>
          <Text style={[s.caps, { width: 66, color: c.teal, paddingTop: 2 }, struck ? s.struck : {}]}>{l.type}</Text>
          <LeaderCol top={8.5} dots={Boolean(l.dates)}>
            <Text style={[{ fontSize: 9, lineHeight: 1.4, backgroundColor: '#ffffff', paddingRight: 6 }, struck ? s.struck : {}]}>{l.description}</Text>
            {l.detail ? <Text style={[{ fontSize: 7.5, color: c.muted, lineHeight: 1.35 }, struck ? s.struck : {}]}>{l.detail}</Text> : null}
          </LeaderCol>
          {l.dates ? <Text style={[{ fontSize: 7.5, color: c.muted, paddingLeft: 6, paddingTop: 0.5 }, struck ? s.struck : {}]}>{l.dates}</Text> : null}
        </View>
      ))}
      {v.originalPrice && (
        <View style={[s.row, { alignItems: 'flex-start', marginTop: 6 }]} wrap={false}>
          <LeaderCol top={10}>
            <Serif italic style={{ fontSize: 10.5, color: c.muted, backgroundColor: '#ffffff', paddingRight: 6 }}>
              {v.originalPrice.label}
            </Serif>
          </LeaderCol>
          <Text style={[s.money, s.struck, { fontSize: 9.5, paddingLeft: 6, paddingTop: 1 }]}>{v.originalPrice.amount}</Text>
        </View>
      )}
    </View>
  );
}

/** Amount in words (left) and the totals (right), result framed by gold hairlines. */
export function Totals({ v, words = true }: { v: Common; words?: boolean }) {
  const r = v.totals.result;
  return (
    <View style={[s.row, { marginTop: 12, gap: 24, alignItems: 'flex-start' }]} wrap={false}>
      <View style={{ flex: 1, paddingTop: 2 }}>
        {words && v.summary.inWords ? (
          <>
            <Caps style={{ fontSize: 6 }}>Amount in words</Caps>
            <Serif italic style={{ fontSize: 10.5, color: c.ink, marginTop: 2, lineHeight: 1.4 }}>
              {v.summary.inWords}
            </Serif>
          </>
        ) : null}
      </View>
      <View style={{ width: 236 }}>
        {v.totals.lines.map((l, i) => (
          <View key={i} style={[s.row, { justifyContent: 'space-between', paddingVertical: 2, gap: 8 }]}>
            <Text style={[{ flexShrink: 1, fontSize: 9, lineHeight: 1.45 }, l.muted ? s.muted : {}]}>{l.label}</Text>
            <Text style={[s.money, s.right, { fontSize: 9 }, l.muted ? s.muted : { fontWeight: 600 }]}>{l.amount}</Text>
          </View>
        ))}
        <View style={{ marginTop: 4, borderTopWidth: 0.5, borderTopColor: c.gold, paddingTop: 1.5 }}>
          <View style={{ borderTopWidth: 0.5, borderTopColor: c.gold }} />
        </View>
        <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }]}>
          <View style={[s.row, { alignItems: 'center', gap: 6 }]}>
            <Diamond size={4} />
            <Serif italic style={{ fontSize: 15, color: c.deep }}>
              {r.label}
            </Serif>
          </View>
          <Text style={[s.money, { fontWeight: 700, fontSize: 15, color: toneColour[r.tone] }]}>{r.amount}</Text>
        </View>
        <View style={{ borderTopWidth: 0.5, borderTopColor: c.gold }} />
        {r.note ? (
          <Serif italic style={{ fontSize: 9, color: c.muted, textAlign: 'right', marginTop: 2 }}>
            {r.note}
          </Serif>
        ) : null}
      </View>
    </View>
  );
}

function Payment({ v, qr }: { v: InvoiceView; qr?: string }) {
  const p = v.payment;
  if (!p) return null;
  return (
    <View style={{ marginTop: 16, borderWidth: 0.5, borderColor: c.gold, backgroundColor: c.cream, paddingVertical: 12, paddingHorizontal: 14 }} wrap={false}>
      <View style={[s.row, { gap: 20, alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Caps gold>Payment details</Caps>
          <View style={{ height: 4 }} />
          {p.bank.map((l, i) => (
            <Text key={i} style={{ fontSize: 9, lineHeight: 1.45 }}>{l}</Text>
          ))}
          {p.upiId ? (
            <Text style={{ marginTop: p.bank.length ? 4 : 0, fontSize: 9, lineHeight: 1.45 }}>
              <Text style={s.caps}>UPI  </Text>
              <Text style={{ fontWeight: 600 }}>{p.upiId}</Text>
            </Text>
          ) : null}
        </View>
        {qr && p.qr ? (
          <View style={{ alignItems: 'center', width: 120 }}>
            <View style={{ backgroundColor: '#ffffff', padding: 4, borderWidth: 0.5, borderColor: c.goldSoft }}>
              <Image src={qr} style={{ width: 72, height: 72 }} />
            </View>
            <Text style={[s.caps, { fontSize: 6, marginTop: 4, textAlign: 'center' }]}>{p.qr.caption}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Terms (small, muted) and the signature with the italic "For …" line. */
export function TermsAndSignature({ terms, signature }: { terms: string[]; signature?: { image: string; caption: string } }) {
  if (terms.length === 0 && !signature) return null;
  return (
    <View style={[s.row, { marginTop: 16, gap: 24, alignItems: 'flex-end' }]} wrap={false}>
      <View style={{ flex: 1 }}>
        {terms.length > 0 && (
          <>
            <Caps style={{ marginBottom: 4 }}>Terms</Caps>
            {terms.map((t, i) => (
              <View key={i} style={[s.row, { gap: 6, marginBottom: 1.5 }]}>
                <Text style={{ fontSize: 7.5, color: c.gold }}>—</Text>
                <Text style={{ flex: 1, fontSize: 7.5, color: c.muted, lineHeight: 1.4 }}>{t}</Text>
              </View>
            ))}
          </>
        )}
      </View>
      {signature ? (
        <View style={{ alignItems: 'center', width: 160 }}>
          <Image src={signature.image} style={{ height: 40, width: 120, objectFit: 'contain' }} />
          <View style={{ width: 130, borderBottomWidth: 0.5, borderBottomColor: c.gold, marginTop: 4, marginBottom: 4 }} />
          <Serif italic style={{ fontSize: 9.5, color: c.ink, textAlign: 'center' }}>
            {signature.caption}
          </Serif>
        </View>
      ) : null}
    </View>
  );
}

export const Invoice: InvoiceTemplate = ({ view: v, assets }) => (
  <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
    <Page size="A4" style={s.page}>
      <RunningHead left={`${v.letterhead.name ?? ''}`} right={`Invoice ${v.invoiceNo}`} />
      <Header mark={assets.mark} letterhead={v.letterhead} title="Invoice" meta={[`No. ${v.invoiceNo}`, v.invoiceDate, v.bookingLine]}>
        {v.cancelledPill ? <CancelledMark /> : null}
      </Header>

      <Parties v={v} />
      <CancelledNote note={v.cancelledNote} />

      <View>
        {/* Spacer first: react-pdf never breaks before a first child, so the head can move with its rows. */}
        <View style={s.gap} />
        <SectionHead minPresenceAhead={80}>Particulars</SectionHead>
        <PricedItem v={v} />
        <Included v={v} />
      </View>

      <Totals v={v} />
      <Payment v={v} qr={assets.qr} />
      <TermsAndSignature terms={v.terms} signature={v.signature} />
      {!v.terms.length && !v.signature ? <Ornament width={28} style={{ marginTop: 24 }} /> : null}

      <Footer lines={v.footer} />
    </Page>
  </Document>
);
