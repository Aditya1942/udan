/** Phone-first Voucher: trip hero, one card per service with a big confirmation code. Never prices, DMCs or payments. */
import { Document, Text, View } from '@react-pdf/renderer';
import type { VoucherView } from '../../view';
import type { VoucherTemplate } from '../types';
import { c, Card, Header, IssuedBy, Pairs, PhonePage, Pill, s, Section } from './parts';

function Hero({ v }: { v: VoucherView }) {
  const n = v.services.length;
  const title = v.trip.destination || v.categoryLabel;
  const who = [v.guest.name, v.trip.pax].filter(Boolean).join(' · ');
  return (
    <View
      wrap={false}
      style={{
        backgroundColor: c.teal,
        borderRadius: 14,
        padding: 16,
        marginBottom: 8,
      }}
    >
      {v.trip.destination ? (
        <Text
          style={{
            color: c.tealSoft,
            fontSize: 8.5,
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {v.categoryLabel}
        </Text>
      ) : null}
      <Text style={[s.h, { color: c.white, fontSize: 18, marginTop: 2 }]}>{title}</Text>
      {v.trip.dates ? <Text style={[s.h, { color: c.white, fontSize: 12.5, marginTop: 4, fontWeight: 600 }]}>{v.trip.dates}</Text> : null}
      {who ? <Text style={{ color: c.white, opacity: 0.85, marginTop: 4 }}>{who}</Text> : null}
      {n > 0 ? (
        <View style={{ marginTop: 12 }}>
          {v.pendingCount === 0 ? (
            <Pill colour={c.ink} bg={c.lime} size={8.5}>
              All services confirmed
            </Pill>
          ) : (
            <Pill colour={c.ink} bg={c.amber} size={8.5}>
              {`${v.pendingCount} of ${n} pending confirmation`}
            </Pill>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.small}>{label}</Text>
      <Text style={s.semi}>{value}</Text>
    </View>
  );
}

function ServiceCard({ sv }: { sv: VoucherView['services'][number] }) {
  const stay = sv.type === 'Hotel' && sv.start && sv.end;
  const pending = sv.confirmation.pending;
  return (
    <Card>
      <View style={[s.between, { gap: 8, alignItems: 'center' }]}>
        <Pill>{sv.type}</Pill>
        {!stay ? <Text style={[s.small, { flex: 1, textAlign: 'right', fontWeight: 600 }]}>{sv.dates}</Text> : null}
      </View>
      <Text style={[s.h, { fontSize: 12.5, marginTop: 6 }]}>{sv.description}</Text>
      {stay ? (
        <View style={[s.row, { marginTop: 8, gap: 8 }]}>
          <Stat label="Check-in" value={sv.start} />
          <Stat label="Check-out" value={sv.end} />
          {sv.nights ? <Stat label="Nights" value={String(sv.nights)} /> : null}
        </View>
      ) : null}
      {sv.notes ? <Text style={[s.small, s.para, { marginTop: 6 }]}>{sv.notes}</Text> : null}
      <View
        style={{
          backgroundColor: pending ? c.warnSoft : c.tealSoft,
          borderRadius: 8,
          padding: 8,
          marginTop: 8,
        }}
      >
        <Text style={[s.small, { color: pending ? c.warn : c.muted }]}>Confirmation</Text>
        <Text style={[s.h, { fontSize: pending ? 13 : 15, color: pending ? c.warn : c.teal }]}>{sv.confirmation.text}</Text>
      </View>
    </Card>
  );
}

function Itinerary({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <>
      <Section>Itinerary</Section>
      <View style={[s.card, { paddingBottom: 8 }]}>
        {lines.map((l, i) =>
          l ? (
            <Text key={i} style={[s.body, { marginBottom: 6 }]}>
              {l}
            </Text>
          ) : (
            <View key={i} style={{ height: 6 }} />
          ),
        )}
      </View>
    </>
  );
}

function GoodToKnow({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <Card label="Good to know">
      {lines.map((l, i) => (
        <View key={i} style={[s.row, { gap: 6, marginTop: i ? 4 : 0 }]}>
          <Text style={{ color: c.teal, fontSize: 10.5, lineHeight: 1.45, width: 8 }}>•</Text>
          <Text style={[s.body, { flex: 1 }]}>{l}</Text>
        </View>
      ))}
    </Card>
  );
}

function Emergency({ phones }: { phones: string[] }) {
  if (!phones.length) return null;
  return (
    <View wrap={false} style={[s.card, { borderColor: c.danger, borderWidth: 0.75, borderLeftWidth: 4 }]}>
      <Text style={[s.label, { color: c.danger }]}>Emergency contact</Text>
      {phones.map((p, i) => (
        <Text key={i} style={[s.h, { fontSize: 15, marginTop: i ? 4 : 0 }]}>
          {p}
        </Text>
      ))}
    </View>
  );
}

export const Voucher: VoucherTemplate = ({ view: v, assets }) => (
  <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
    <PhonePage footerLeft={[v.letterhead.name, `Voucher ${v.voucherNo}`].filter(Boolean).join(' · ')}>
      <Header wordmark={assets.wordmark} title="Travel voucher" lines={[`Voucher ${v.voucherNo}`, v.issuedLine]} />
      <Hero v={v} />
      {v.guestRows.length ? (
        <Card label="Guest">
          <Pairs rows={v.guestRows} />
        </Card>
      ) : null}
      {v.services.length ? <Section>Your services</Section> : null}
      {v.services.map((sv, i) => (
        <ServiceCard key={i} sv={sv} />
      ))}
      <Itinerary lines={v.itinerary} />
      <GoodToKnow lines={v.goodToKnow} />
      <Emergency phones={v.emergency} />
      <IssuedBy letterhead={v.letterhead} signature={v.signature} />
    </PhonePage>
  </Document>
);
