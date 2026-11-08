/** "Brand band" Voucher: calendar-tile day cards. The view carries no price, DMC or payment. */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { VoucherTemplate } from '../types';
import type { VoucherItem, VoucherView } from '../../view';
import { Band, c, CheckIcon, ConfChip, Footer, Label, Pairs, Pill, RunningHead, s, SectionTitle, Signature, Table, toneBorder, TypePill } from './parts';

function ItemRow({ item, first }: { item: VoucherItem; first: boolean }) {
  return (
    <View
      style={[
        s.row,
        {
          alignItems: 'flex-start',
          paddingTop: first ? 0 : 8,
          marginTop: first ? 0 : 8,
          borderTopWidth: first ? 0 : 0.75,
          borderTopColor: c.border,
        },
      ]}
    >
      <View style={{ width: 70, paddingTop: 1 }}>
        <TypePill type={item.type} />
      </View>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text>{item.description}</Text>
        {item.until ? <Text style={[s.small, s.muted, { marginTop: 1 }]}>{item.until}</Text> : null}
        {item.notes ? <Text style={[s.small, s.muted, { marginTop: 1 }]}>{item.notes}</Text> : null}
      </View>
      <View style={{ width: 104 }}>
        <ConfChip confirmation={item.confirmation} />
      </View>
    </View>
  );
}

function DayCard({ day }: { day: VoucherView['days'][number] }) {
  const [num, month] = day.label.split(' ');
  return (
    <View
      wrap={false}
      style={[
        s.card,
        {
          flexDirection: 'row',
          padding: 0,
          marginBottom: 8,
          overflow: 'hidden',
        },
      ]}
    >
      <View
        style={{
          width: 56,
          backgroundColor: c.teal,
          borderTopLeftRadius: 7.25,
          borderBottomLeftRadius: 7.25,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 12,
        }}
      >
        <Text style={[s.h, { color: c.white, fontSize: 20, lineHeight: 1 }]}>{num}</Text>
        {month ? (
          <Text
            style={{
              color: c.tealSoft,
              fontSize: 7.5,
              fontWeight: 600,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginTop: 3,
            }}
          >
            {month}
          </Text>
        ) : null}
      </View>
      <View style={{ flex: 1, padding: 12, justifyContent: 'center' }}>
        {day.items.map((it, i) => (
          <ItemRow key={i} item={it} first={i === 0} />
        ))}
      </View>
    </View>
  );
}

export const Voucher: VoucherTemplate = ({ view: v, assets }) => {
  const tripRows = [
    ...(v.trip.dates ? [{ label: 'Dates', value: v.trip.dates }] : []),
    ...(v.trip.pax ? [{ label: 'Guests', value: v.trip.pax }] : []),
  ];
  return (
    <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
      <Page size="A4" style={s.page}>
        <RunningHead colour={c.teal} text={`Travel voucher  ·  ${v.bookingLine}`} />
        <View style={s.body}>
          <Band
            colour={c.teal}
            wordmark={assets.wordmark}
            title="Travel voucher"
            pills={
              <>
                <Pill bg={c.lime} fg={c.ink}>
                  {v.status.toUpperCase()}
                </Pill>
                {v.pendingCount > 0 ? (
                  <Pill bg={c.warnTint} fg={c.warn} border={toneBorder.warn}>
                    {`${v.pendingCount} TO BE CONFIRMED`}
                  </Pill>
                ) : null}
              </>
            }
            meta={[`Voucher ${v.voucherNo}`, v.issuedLine]}
            letterhead={v.letterhead}
          />

          <View style={[s.row, { gap: 12 }]} wrap={false}>
            {v.guestRows.length > 0 && (
              <View style={[s.card, { flex: 1 }]}>
                <Label>Guest</Label>
                {v.guest.name ? <Text style={[s.h, { fontSize: 11, marginBottom: 4 }]}>{v.guest.name}</Text> : null}
                <Pairs rows={v.guestRows.filter((r) => r.label !== 'Lead guest' && !(r.label === 'Guests' && v.trip.pax))} />
              </View>
            )}
            <View style={[s.card, { flex: 1.15, backgroundColor: c.visa, borderColor: '#d2e5ed' }]}>
              <Label>{v.trip.destination || v.trip.dates ? 'Trip' : 'Service'}</Label>
              <Text style={[s.h, { fontSize: 11, marginBottom: 4 }]}>{v.trip.destination || v.categoryLabel}</Text>
              {v.trip.destination ? <Text style={[s.muted, { marginBottom: 2 }]}>{v.categoryLabel}</Text> : null}
              <Pairs rows={tripRows} labelWidth={40} />
            </View>
            {v.emergency.length > 0 && (
              <View
                style={[
                  s.card,
                  {
                    width: 156,
                    backgroundColor: c.dangerTint,
                    borderWidth: 0.75,
                    borderColor: toneBorder.danger,
                  },
                ]}
              >
                <Label style={{ color: c.danger }}>Emergency contact</Label>
                {v.emergency.map((p, i) => (
                  <Text key={i} style={[s.semi, { color: c.danger, marginTop: i ? 2 : 0 }]}>
                    {p}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {v.days.length > 0 && (
            <Table
              title="Your bookings"
              header={null}
              rows={v.days.map((d) => (
                <DayCard key={d.date} day={d} />
              ))}
            />
          )}
          {v.throughout.length > 0 && (
            <View wrap={false}>
              {v.days.length === 0 ? <SectionTitle>Your bookings</SectionTitle> : null}
              <View style={[s.card, { backgroundColor: c.travel, borderWidth: 0.75, borderColor: toneBorder.action, marginBottom: 8, padding: 12 }]}>
                {v.days.length > 0 ? <Label style={{ color: c.action }}>Throughout your trip</Label> : null}
                {v.throughout.map((it, i) => (
                  <ItemRow key={i} item={it} first={i === 0} />
                ))}
              </View>
            </View>
          )}

          {v.itinerary.length > 0 && (
            <View>
              {/* Title stays with the first lines; the rest of the card continues seamlessly (and may break across pages). */}
              <View wrap={false}>
                <SectionTitle>Itinerary</SectionTitle>
                <View
                  style={[
                    s.itin,
                    {
                      paddingBottom: v.itinerary.length > 3 ? 0 : 12,
                      borderBottomLeftRadius: v.itinerary.length > 3 ? 0 : 8,
                      borderBottomRightRadius: v.itinerary.length > 3 ? 0 : 8,
                    },
                  ]}
                >
                  {v.itinerary.slice(0, 3).map((l, i) => (
                    <Text key={i} style={{ marginBottom: 3 }}>
                      {l || ' '}
                    </Text>
                  ))}
                </View>
              </View>
              {v.itinerary.length > 3 && (
                <View style={[s.itin, { paddingTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
                  {v.itinerary.slice(3).map((l, i) => (
                    <Text key={i} style={{ marginBottom: 3 }} wrap={false}>
                      {l || ' '}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {v.goodToKnow.length > 0 && (
            <View wrap={false}>
              <SectionTitle>Good to know</SectionTitle>
              <View style={[s.card]}>
                {v.goodToKnow.map((l, i) => (
                  <View key={i} style={[s.row, { gap: 8, marginTop: i ? 6 : 0 }]}>
                    <View style={{ paddingTop: 1 }}>
                      <CheckIcon />
                    </View>
                    <Text style={{ flex: 1 }}>{l}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {v.signature ? (
            <View wrap={false} style={{ marginTop: 16 }}>
              <Signature signature={v.signature} />
            </View>
          ) : null}
        </View>

        <Footer lines={v.footer ? [v.footer] : []} />
      </Page>
    </Document>
  );
};
