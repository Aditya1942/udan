/**
 * Voucher PDF — "Minimal letter" with the day timeline (prototype Variant D + Timeline, branch
 * prototype/voucher-templates, 34c00c4). Lays out a `VoucherView`, which carries no DMC, cost or payment.
 */
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { base, colour } from './theme';
import type { VoucherItem, VoucherView } from './view';

const s = StyleSheet.create({
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colour.teal, marginTop: 3.5, marginLeft: -15 },
  type: { color: colour.teal, fontWeight: 600 },
  section: { marginTop: 16 },
});

function Confirmation({ item }: { item: VoucherItem }) {
  return item.confirmation.pending ? (
    <Text style={{ color: colour.warn }}>{item.confirmation.text}</Text>
  ) : (
    <Text style={{ fontWeight: 600 }}>{item.confirmation.text}</Text>
  );
}

function DayRow({ day }: { day: VoucherView['days'][number] }) {
  return (
    <View style={[base.row, { marginBottom: 6 }]} wrap={false}>
      <View style={{ width: 62 }}>
        <Text style={base.semi}>{day.label}</Text>
      </View>
      <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: colour.tealSoft, paddingLeft: 12 }}>
        {day.items.map((item, i) => (
          <View key={i} style={[base.row, { gap: 8, marginBottom: 6 }]}>
            <View style={s.dot} />
            <View style={{ flex: 1 }}>
              <Text>
                <Text style={s.type}>{item.type}</Text> · {item.description}
              </Text>
              {item.until ? <Text style={base.muted}>{item.until}</Text> : null}
              {item.notes ? <Text style={[base.muted, { fontSize: 7.5 }]}>{item.notes}</Text> : null}
            </View>
            <View style={{ width: 90, alignItems: 'flex-end' }}>
              <Confirmation item={item} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function BookingsSection({ v }: { v: VoucherView }) {
  const empty = v.days.length === 0 && v.throughout.length === 0;
  const [firstDay, ...remainingDays] = v.days;
  return (
    <View style={s.section}>
      {/* Heading travels with the first day (or the empty note) so it never sits alone at a page foot. */}
      <View wrap={false}>
        <Text style={[base.h, { fontSize: 11, marginBottom: 8 }]}>Your bookings</Text>
        {empty ? <Text style={base.muted}>Services will be added here once booked.</Text> : null}
        {firstDay ? <DayRow day={firstDay} /> : null}
      </View>
      {remainingDays.map((day) => (
        <DayRow key={day.date} day={day} />
      ))}
      {v.throughout.length > 0 && (
        <View style={{ marginTop: 6, backgroundColor: colour.surface, borderRadius: 4, padding: 8 }} wrap={false}>
          <Text style={[base.label, { marginBottom: 4 }]}>Throughout your trip</Text>
          {v.throughout.map((item, i) => (
            <View key={i} style={[base.row, { gap: 8, marginBottom: 3 }]}>
              <View style={{ flex: 1 }}>
                <Text>
                  <Text style={s.type}>{item.type}</Text> · {item.description}
                </Text>
                {item.notes ? <Text style={[base.muted, { fontSize: 7.5 }]}>{item.notes}</Text> : null}
              </View>
              <View style={{ width: 90, alignItems: 'flex-end' }}>
                <Confirmation item={item} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function VoucherDocument({ view: v, wordmark }: { view: VoucherView; wordmark: string }) {
  return (
    <Document title={v.filenameTitle}>
      <Page size="A4" style={base.page}>
        <View style={base.head}>
          <Image src={wordmark} style={base.wordmark} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={base.title}>Travel voucher</Text>
            <Text style={[base.muted, { marginTop: 4 }]}>{v.bookingLine}</Text>
            <Text style={base.muted}>{v.issuedLine}</Text>
          </View>
        </View>
        <View style={[base.rule, { marginVertical: 16 }]} />

        <View style={[base.row, { gap: 24 }]}>
          <View style={{ flex: 1 }}>
            <Text style={base.label}>Guest</Text>
            {v.guest.name ? <Text style={base.semi}>{v.guest.name}</Text> : null}
            {v.guest.lines.map((l, i) => (
              <Text key={i}>{l}</Text>
            ))}
            {v.guest.travellers ? <Text style={base.muted}>{v.guest.travellers}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={base.label}>Trip</Text>
            {v.trip.destination ? <Text style={base.semi}>{v.trip.destination}</Text> : null}
            {v.trip.dates ? <Text>{v.trip.dates}</Text> : null}
            {v.trip.pax ? <Text>{v.trip.pax}</Text> : null}
          </View>
          {v.emergency.length > 0 ? (
            <View style={{ width: 150, borderLeftWidth: 2, borderLeftColor: colour.danger, paddingLeft: 8 }}>
              <Text style={base.label}>Emergency contact</Text>
              {v.emergency.map((p, i) => (
                <Text key={i} style={base.semi}>
                  {p}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <BookingsSection v={v} />

        {v.itinerary.length > 0 && (
          <View style={s.section}>
            <View wrap={false}>
              <Text style={[base.label, { marginBottom: 4 }]}>Itinerary</Text>
              <Text style={{ marginBottom: 2 }}>{v.itinerary[0] || ' '}</Text>
            </View>
            {v.itinerary.slice(1).map((l, i) => (
              <Text key={i} style={{ marginBottom: 2 }}>
                {l || ' '}
              </Text>
            ))}
          </View>
        )}

        {v.goodToKnow.length > 0 && (
          <View wrap={false} style={s.section}>
            <Text style={[base.label, { marginBottom: 3 }]}>Good to know</Text>
            {v.goodToKnow.map((l, i) => (
              <View key={i} style={[base.row, { gap: 6, marginBottom: 2.5 }]}>
                <Text style={[base.muted, { fontSize: 7.5 }]}>•</Text>
                <Text style={[base.muted, { flex: 1, fontSize: 7.5, lineHeight: 1.4 }]}>{l}</Text>
              </View>
            ))}
          </View>
        )}

        {v.signature ? (
          <View wrap={false} style={[s.section, { alignItems: 'flex-end' }]}>
            <Image src={v.signature.image} style={{ width: 110, height: 40, objectFit: 'contain' }} />
            <Text style={[base.muted, { fontSize: 7.5 }]}>{v.signature.caption}</Text>
          </View>
        ) : null}

        {v.footer ? (
          <Text fixed style={base.footer}>
            {v.footer}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}
