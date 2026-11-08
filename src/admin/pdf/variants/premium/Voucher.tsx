/** "Premium" Travel Voucher: a cover-like top and an elegant day-by-day. VoucherView carries no price, DMC or payment. */
import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import type { VoucherItem, VoucherView } from '../../view';
import type { VoucherTemplate } from '../types';
import { Caps, Diamond, Footer, Header, Ornament, RunningHead, SectionHead, Serif } from './parts';
import { c, s } from './styles';

const Confirmation = ({ conf }: { conf: VoucherItem['confirmation'] }) => (
  <View style={{ alignItems: 'flex-end' }}>
    <Text style={[s.caps, { fontSize: 6, color: conf.pending ? c.warn : c.muted }]}>{conf.pending ? 'Status' : 'Confirmation'}</Text>
    <Text style={[s.caps, { fontSize: 7.5, letterSpacing: 1.2, color: conf.pending ? c.warn : c.ink, textAlign: 'right' }]}>{conf.text}</Text>
  </View>
);

/** Guest name and destination large, then the journey at a glance. */
function Cover({ v }: { v: VoucherView }) {
  const glance = [
    { label: 'Travel dates', value: v.trip.dates },
    { label: 'Guests', value: v.trip.pax },
    { label: 'Status', value: v.status },
  ].filter((g) => g.value);
  const travellers = v.travellers.filter((t) => t !== v.guest.name);
  return (
    <View style={{ alignItems: 'center', marginTop: 20 }} wrap={false}>
      <Caps gold>Prepared for</Caps>
      {v.guest.name ? <Serif style={{ fontSize: 22, color: c.ink, textAlign: 'center', lineHeight: 1.15, marginTop: 4 }}>{v.guest.name}</Serif> : null}
      {v.guest.lines.length > 0 ? <Text style={[s.muted, { fontSize: 7.5, marginTop: 2, lineHeight: 1.35 }]}>{v.guest.lines.join('  ·  ')}</Text> : null}
      {v.trip.destination ? (
        <Serif italic style={{ fontSize: 18, color: c.deep, textAlign: 'center', lineHeight: 1.25, marginTop: 8, maxWidth: 420 }}>
          {v.trip.destination}
        </Serif>
      ) : (
        <Serif italic style={{ fontSize: 15, color: c.deep, textAlign: 'center', marginTop: 8 }}>
          {v.categoryLabel}
        </Serif>
      )}
      {travellers.length > 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 4, maxWidth: 420, color: c.muted, fontSize: 7.5 }}>
          <Text style={s.caps}>Travelling  </Text>
          {travellers.join(', ')}
        </Text>
      ) : null}

      {glance.length > 0 && (
        <View style={{ alignSelf: 'stretch', marginTop: 14 }}>
          <Serif italic style={{ fontSize: 10.5, color: c.goldText, textAlign: 'center', marginBottom: 4 }}>
            Your journey at a glance
          </Serif>
          <View style={[s.row, { borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: c.gold, paddingVertical: 8 }]}>
            {glance.map((g, i) => (
              <View key={g.label} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6, borderLeftWidth: i ? 0.5 : 0, borderLeftColor: c.goldSoft }}>
                <Caps style={{ fontSize: 6 }}>{g.label}</Caps>
                <Text style={{ fontSize: 9, fontWeight: 600, textAlign: 'center', marginTop: 2 }}>{g.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function Emergency({ v }: { v: VoucherView }) {
  if (v.emergency.length === 0) return null;
  return (
    <View style={{ marginTop: 12, borderWidth: 0.5, borderColor: c.gold, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' }} wrap={false}>
      <Caps gold>In case of emergency</Caps>
      <Text style={[s.money, { fontSize: 9.5, textAlign: 'center', marginTop: 2, color: c.deep }]}>{v.emergency.join('  ·  ')}</Text>
    </View>
  );
}

function Stays({ v }: { v: VoucherView }) {
  if (v.stays.length === 0) return null;
  return (
    <View>
      {/* Spacer first: react-pdf never breaks before a first child, so the head can move with its rows. */}
      <View style={s.gap} />
      <SectionHead minPresenceAhead={80}>Where you will stay</SectionHead>
      {v.stays.map((st, i) => (
        <View key={i} wrap={false} style={{ backgroundColor: c.cream, borderLeftWidth: 1.5, borderLeftColor: c.gold, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8 }}>
          <View style={[s.row, { gap: 16, alignItems: 'flex-start' }]}>
            <Serif style={{ flex: 1, fontSize: 12.5, color: c.ink, lineHeight: 1.25 }}>{st.name}</Serif>
            <Confirmation conf={st.confirmation} />
          </View>
          {st.checkIn || st.checkOut || st.nights ? (
            <View style={[s.row, { gap: 20, marginTop: 4 }]}>
              {st.checkIn ? (
                <View>
                  <Caps style={{ fontSize: 6 }}>Check-in</Caps>
                  <Text style={{ fontSize: 9, fontWeight: 600 }}>{st.checkIn}</Text>
                </View>
              ) : null}
              {st.checkOut ? (
                <View>
                  <Caps style={{ fontSize: 6 }}>Check-out</Caps>
                  <Text style={{ fontSize: 9, fontWeight: 600 }}>{st.checkOut}</Text>
                </View>
              ) : null}
              {st.nights ? (
                <View>
                  <Caps style={{ fontSize: 6 }}>Nights</Caps>
                  <Text style={{ fontSize: 9, fontWeight: 600 }}>{st.nights}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {st.notes ? (
            <Serif italic style={{ fontSize: 10.5, color: c.muted, marginTop: 4, lineHeight: 1.4 }}>
              {st.notes}
            </Serif>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** `hideNotes`: hotel notes already print in the stay card above. */
function Item({ item, hideNotes }: { item: VoucherItem; hideNotes?: boolean }) {
  return (
    <View style={[s.row, { gap: 14, paddingVertical: 4, alignItems: 'flex-start' }]} wrap={false}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, lineHeight: 1.4 }}>
          <Text style={[s.caps, { color: c.teal }]}>{item.type}  </Text>
          {item.description}
        </Text>
        {item.until ? (
          <Serif italic style={{ fontSize: 10.5, color: c.muted, lineHeight: 1.35 }}>
            {item.until}
          </Serif>
        ) : null}
        {item.notes && !hideNotes ? <Text style={{ fontSize: 7.5, color: c.muted, lineHeight: 1.35 }}>{item.notes}</Text> : null}
      </View>
      <View style={{ width: 110 }}>
        <Confirmation conf={item.confirmation} />
      </View>
    </View>
  );
}

function Days({ v }: { v: VoucherView }) {
  if (v.days.length === 0 && v.throughout.length === 0) return null;
  return (
    <View>
      {/* Spacer first: react-pdf never breaks before a first child, so the head can move with its rows. */}
      <View style={s.gap} />
      <SectionHead minPresenceAhead={70}>{v.days.length ? 'Day by day' : 'Your services'}</SectionHead>
      {v.days.map((d) => (
        <View key={d.date} style={[s.row, { alignItems: 'flex-start', borderBottomWidth: 0.5, borderBottomColor: c.hair, paddingVertical: 4 }]} wrap={false}>
          <View style={{ width: 64, paddingTop: 4.5, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Diamond size={3.5} />
            <Text style={[s.caps, { color: c.goldText, fontSize: 7.5, letterSpacing: 1.4 }]}>{d.label}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {d.items.map((it, i) => (
              <Item key={i} item={it} hideNotes={it.type === 'Hotel' && v.stays.length > 0} />
            ))}
          </View>
        </View>
      ))}
      {v.throughout.length > 0 && (
        <View style={[s.row, { paddingVertical: 4 }]} wrap={false}>
          <View style={{ width: 64, paddingTop: 4 }}>
            <Text style={[s.caps, { color: c.goldText, fontSize: 6, letterSpacing: 1.2 }]}>Throughout</Text>
            <Text style={[s.caps, { color: c.goldText, fontSize: 6, letterSpacing: 1.2 }]}>your trip</Text>
          </View>
          <View style={{ flex: 1 }}>
            {v.throughout.map((it, i) => (
              <Item key={i} item={it} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function Itinerary({ v }: { v: VoucherView }) {
  if (v.itinerary.length === 0) return null;
  return (
    <View>
      {/* Spacer first: react-pdf never breaks before a first child, so the head can move with its rows. */}
      <View style={s.gap} />
      <SectionHead>Your itinerary</SectionHead>
      {v.itinerary.map((l, i) =>
        l ? (
          <Serif key={i} style={{ fontSize: 10.5, lineHeight: 1.45, marginBottom: 2 }}>
            {l}
          </Serif>
        ) : (
          <View key={i} style={{ height: 6 }} />
        ),
      )}
    </View>
  );
}

function GoodToKnow({ v }: { v: VoucherView }) {
  if (v.goodToKnow.length === 0) return null;
  return (
    <View style={s.section}>
      <SectionHead>Good to know</SectionHead>
      {v.goodToKnow.map((g, i) => (
        <View key={i} style={[s.row, { gap: 8, marginBottom: 3, alignItems: 'flex-start' }]}>
          <View style={{ paddingTop: 3.5 }}>
            <Diamond size={3} />
          </View>
          <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.45, color: c.muted }}>{g}</Text>
        </View>
      ))}
    </View>
  );
}

function Closing({ v }: { v: VoucherView }) {
  return (
    <View style={{ marginTop: 16, alignItems: 'center' }} wrap={false}>
      <Ornament width={40} />
      <Serif italic style={{ fontSize: 15, color: c.deep, marginTop: 8 }}>
        Wishing you a wonderful journey.
      </Serif>
      {v.signature ? (
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Image src={v.signature.image} style={{ height: 38, width: 110, objectFit: 'contain' }} />
          <View style={{ width: 120, borderBottomWidth: 0.5, borderBottomColor: c.gold, marginTop: 4, marginBottom: 4 }} />
          <Serif italic style={{ fontSize: 9.5 }}>{v.signature.caption}</Serif>
        </View>
      ) : null}
    </View>
  );
}

export const Voucher: VoucherTemplate = ({ view: v, assets }) => (
  <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
    <Page size="A4" style={s.page}>
      <RunningHead left={v.letterhead.name ?? ''} right={`Voucher ${v.voucherNo}`} />
      <Header mark={assets.mark} letterhead={v.letterhead} title="Travel Voucher" meta={[`Voucher ${v.voucherNo}`, v.issuedLine]} />
      <Cover v={v} />
      <Emergency v={v} />
      <Stays v={v} />
      <Days v={v} />
      <Itinerary v={v} />
      {/* Good to know travels with the closing so the sign-off never sits alone on a page. */}
      <View wrap={false}>
        <GoodToKnow v={v} />
        <Closing v={v} />
      </View>
      <Footer lines={v.footer ? [v.footer] : []} />
    </Page>
  </Document>
);
