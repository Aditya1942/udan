/** "Ticket" Voucher (the star): every service is a boarding-pass stub with its confirmation code on the tear-off. */
import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import type { VoucherTemplate } from '../types';
import type { VoucherView } from '../../view';
import { Badge, c, ConfCode, Field, Footer, HeaderStrip, Label, s, Ticket } from './styles';

type Service = VoucherView['services'][number];

const typeColour = (t: Service['type']) => (t === 'Flight' ? c.sky : c.teal);

/** `IndiGo 6E-512 AMD 07:10 → GOI 08:55, 15 kg` → carrier, from/to codes + times, extras. Undefined when no route. */
function parseRoute(description: string) {
  const parts = description.split('→');
  if (parts.length !== 2) return undefined;
  const [left, rightAll] = parts.map((p) => p.trim());
  const code = /\b([A-Z]{3})\b/;
  const lm = code.exec(left);
  const rm = code.exec(rightAll);
  if (!lm || !rm) return { from: { code: left, rest: '' }, to: { code: rightAll, rest: '' }, carrier: '', extra: '', plain: true };
  const carrier = left.slice(0, lm.index).trim();
  const fromRest = left.slice(lm.index + 3).trim();
  const afterTo = rightAll.slice(rm.index + 3).trim();
  const beforeTo = rightAll.slice(0, rm.index).trim();
  const comma = afterTo.indexOf(',');
  const toRest = (comma >= 0 ? afterTo.slice(0, comma) : afterTo).trim();
  const extra = [beforeTo, comma >= 0 ? afterTo.slice(comma + 1).trim() : ''].filter(Boolean).join(' · ');
  return { from: { code: lm[1], rest: fromRest }, to: { code: rm[1], rest: toRest }, carrier, extra, plain: false };
}

function DateLine({ svc }: { svc: Service }) {
  if (!svc.start) return <Text style={[s.semi, { fontSize: 8.5, color: c.muted }]}>Throughout your trip</Text>;
  return (
    <Text style={[s.semi, { fontSize: 8.5 }]}>
      {svc.start}
      {svc.end && svc.end !== svc.start ? <Text style={{ color: c.muted }}>{`  →  ${svc.end}`}</Text> : null}
    </Text>
  );
}

function HotelBody({ svc }: { svc: Service }) {
  return (
    <>
      <Text style={[s.h, { fontSize: 11, marginTop: 3 }]}>{svc.description}</Text>
      {svc.start ? (
        <View style={[s.row, { marginTop: 8, alignItems: 'flex-end', gap: 12 }]}>
          <Field label="Check-in">
            <Text style={[s.h, { fontSize: 11 }]}>{svc.start}</Text>
          </Field>
          {svc.end ? (
            <>
              <Text style={[s.h, { fontSize: 13, color: c.teal, paddingBottom: 1 }]}>→</Text>
              <Field label="Check-out">
                <Text style={[s.h, { fontSize: 11 }]}>{svc.end}</Text>
              </Field>
            </>
          ) : null}
          {svc.nights > 0 ? (
            <View style={{ marginLeft: 6, backgroundColor: c.tealSoft, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 3 }}>
              <Text style={[s.label, { color: c.teal }]}>{`${svc.nights} night${svc.nights === 1 ? '' : 's'}`}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

function RouteBody({ svc, route }: { svc: Service; route: NonNullable<ReturnType<typeof parseRoute>> }) {
  const colour = typeColour(svc.type);
  if (route.plain)
    return (
      <View style={[s.row, { marginTop: 4, alignItems: 'center', gap: 8 }]}>
        <Text style={[s.h, { fontSize: 11, flexShrink: 1 }]}>{route.from.code}</Text>
        <Text style={[s.h, { fontSize: 14, color: colour }]}>→</Text>
        <Text style={[s.h, { fontSize: 11, flexShrink: 1 }]}>{route.to.code}</Text>
      </View>
    );
  return (
    <>
      {route.carrier ? <Text style={[s.semi, { fontSize: 9.5, marginTop: 2 }]}>{route.carrier}</Text> : null}
      <View style={[s.row, { marginTop: 4, alignItems: 'flex-start' }]}>
        <View style={{ width: 90 }}>
          <Text style={[s.h, { fontSize: 22, letterSpacing: 1 }]}>{route.from.code}</Text>
          {route.from.rest ? <Text style={[s.semi, { color: c.muted, fontSize: 8.5 }]}>{route.from.rest}</Text> : null}
        </View>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, marginTop: 9 }}>
          <View style={{ flex: 1, borderTopWidth: 1, borderTopStyle: 'dashed', borderTopColor: colour }} />
          <Text style={[s.h, { fontSize: 13, color: colour, marginLeft: 3 }]}>→</Text>
        </View>
        <View style={{ width: 90, alignItems: 'flex-end' }}>
          <Text style={[s.h, { fontSize: 22, letterSpacing: 1 }]}>{route.to.code}</Text>
          {route.to.rest ? <Text style={[s.semi, s.right, { color: c.muted, fontSize: 8.5 }]}>{route.to.rest}</Text> : null}
        </View>
      </View>
      {route.extra ? <Text style={{ color: c.muted, fontSize: 7.5, marginTop: 4 }}>{route.extra}</Text> : null}
    </>
  );
}

function ServiceTicket({ svc, bookingNo }: { svc: Service; bookingNo: string }) {
  const colour = typeColour(svc.type);
  const route = svc.type !== 'Hotel' ? parseRoute(svc.description) : undefined;
  const travel = svc.type === 'Flight' || svc.type === 'Train' || svc.type === 'Bus';
  return (
    <Ticket
      accent={colour}
      stubWidth={148}
      stubBg={svc.confirmation.pending ? c.warnSoft : c.surface}
      style={{ marginBottom: 8 }}
      stub={
        <View>
          <Label>Conf. no.</Label>
          <View style={{ marginTop: 4 }}>
            <ConfCode text={svc.confirmation.text} pending={svc.confirmation.pending} width={122} />
          </View>
          <Label style={{ marginTop: 8 }}>Booking</Label>
          <Text style={[s.mono, { fontSize: 8.5 }]}>{bookingNo}</Text>
        </View>
      }
    >
      <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <Label color={colour} style={{ fontSize: 7 }}>
          {svc.type}
        </Label>
        {svc.type === 'Hotel' && svc.start ? null : <DateLine svc={svc} />}
      </View>
      {svc.type === 'Hotel' ? (
        <HotelBody svc={svc} />
      ) : route && travel ? (
        <RouteBody svc={svc} route={route} />
      ) : (
        <Text style={[s.h, { fontSize: 11, marginTop: 3 }]}>{svc.description}</Text>
      )}
      {svc.notes ? (
        <View style={{ marginTop: 6, borderTopWidth: 0.75, borderTopColor: c.hair, paddingTop: 4 }}>
          <Text style={{ fontSize: 7.5, color: c.muted }}>{svc.notes}</Text>
        </View>
      ) : null}
    </Ticket>
  );
}

const PAX: [keyof VoucherView['paxCounts'], string][] = [
  ['adults', 'ADT'],
  ['children', 'CHD'],
  ['infants', 'INF'],
];

function Manifest({ v }: { v: VoucherView }) {
  const counts = v.trip.pax ? PAX.filter(([k]) => v.paxCounts[k] > 0) : [];
  const travellers = v.travellers;
  const hasJourney = Boolean(v.trip.destination || v.trip.dates);
  const guestName = v.guest.name;
  const mobile = v.guest.lines;
  if (!hasJourney && !guestName && !mobile.length && !travellers.length && !counts.length) return null;
  return (
    <View wrap={false} style={[s.card, { overflow: 'hidden' }]}>
      {hasJourney ? (
        <View style={{ backgroundColor: c.teal, paddingHorizontal: 14, paddingVertical: 10, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
          <Label color="#bfe3ef">{v.categoryLabel}</Label>
          {v.trip.destination ? <Text style={[s.h, { fontSize: 14, color: c.white, marginTop: 2 }]}>{v.trip.destination}</Text> : null}
          {v.trip.dates ? <Text style={[s.semi, { color: '#dff0f5', marginTop: 2 }]}>{v.trip.dates.replace(' – ', '  →  ')}</Text> : null}
        </View>
      ) : null}
      <View style={s.row}>
        <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Label>Passenger / guest manifest</Label>
          {guestName || mobile.length ? (
            <View style={[s.row, { marginTop: 6, gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }]}>
              {guestName ? (
                <Field label="Lead guest" style={{ flexShrink: 1 }}>
                  <Text style={[s.h, { fontSize: 11 }]}>{guestName}</Text>
                </Field>
              ) : null}
              {mobile.length ? (
                <Field label="Mobile">
                  <Text style={[s.semi, { fontSize: 8.5 }]}>{mobile.join(', ')}</Text>
                </Field>
              ) : null}
            </View>
          ) : null}
          {travellers.length ? (
            <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 0.75, borderTopColor: c.hair, paddingTop: 4 }}>
              {travellers.map((t, i) => (
                <View key={i} style={[s.row, { width: '50%', paddingVertical: 2, paddingRight: 8, gap: 6 }]}>
                  <Text style={[s.monoB, { fontSize: 7.5, color: c.teal, width: 14 }]}>{String(i + 1).padStart(2, '0')}</Text>
                  <Text style={{ flex: 1, fontSize: 8.5 }}>{t}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        {counts.length ? (
          <View style={{ width: 148, borderLeftWidth: 1, borderLeftStyle: 'dashed', borderLeftColor: c.line, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: c.surface }}>
            <Label>Pax</Label>
            <View style={[s.row, { marginTop: 6, gap: 12 }]}>
              {counts.map(([k, code]) => (
                <View key={k}>
                  <Text style={[s.h, { fontSize: 20 }]}>{v.paxCounts[k]}</Text>
                  <Text style={[s.monoB, { fontSize: 7.5, color: c.muted }]}>{code}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 7.5, color: c.muted, marginTop: 6 }}>{v.trip.pax}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function RouteLine({ l }: { l: string }) {
  if (!l.trim()) return <View style={{ height: 6 }} />;
  const m = /^(Day [^:]{1,24}):\s*(.*)$/.exec(l);
  return (
    <View wrap={false} style={[s.row, { paddingVertical: 2.5, gap: 10 }]}>
      {m ? (
        <>
          <View style={{ width: 82, flexDirection: 'row', gap: 5 }}>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, borderWidth: 1, borderColor: c.teal, marginTop: 3.5 }} />
            <Text style={[s.semi, { flex: 1, color: c.teal, fontSize: 8.5 }]}>{m[1]}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 8.5 }}>{m[2]}</Text>
        </>
      ) : (
        <Text style={{ flex: 1, fontSize: 8.5 }}>{l}</Text>
      )}
    </View>
  );
}

function RouteCard({ lines }: { lines: string[] }) {
  const head = lines.slice(0, 3);
  const rest = lines.slice(3);
  return (
    <View style={[s.card, { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }]}>
      <View wrap={false}>
        <View style={[s.row, { alignItems: 'center', gap: 8, marginBottom: 6 }]}>
          <Label color={c.teal} style={{ fontSize: 7 }}>
            Route
          </Label>
          <View style={{ flex: 1, borderTopWidth: 1, borderTopStyle: 'dashed', borderTopColor: c.line }} />
          <Text style={[s.h, { fontSize: 10, color: c.teal }]}>→</Text>
        </View>
        {head.map((l, i) => (
          <RouteLine key={i} l={l} />
        ))}
      </View>
      {rest.map((l, i) => (
        <RouteLine key={i} l={l} />
      ))}
    </View>
  );
}

function GoodToKnow({ v }: { v: VoucherView }) {
  const notes = v.goodToKnow;
  const em = v.emergency;
  if (!notes.length && !em.length) return null;
  const emergencyStub = (
    <View>
      <Label color={c.danger}>Emergency contact</Label>
      {em.map((p, i) => (
        <Text key={i} style={[s.semi, { fontSize: 9.5, marginTop: i ? 2 : 4 }]}>
          {p}
        </Text>
      ))}
    </View>
  );
  if (!notes.length)
    return (
      <Ticket accent={c.danger} border={c.line}>
        {emergencyStub}
      </Ticket>
    );
  return (
    <Ticket stub={em.length ? emergencyStub : undefined} stubWidth={170} stubBg={c.dangerSoft}>
      <Label>Good to know</Label>
      {notes.map((l, i) => (
        <View key={i} style={[s.row, { gap: 6, marginTop: i ? 2 : 4 }]}>
          <Text style={{ color: c.teal, fontSize: 8.5 }}>•</Text>
          <Text style={{ flex: 1, fontSize: 8.5, color: c.muted }}>{l}</Text>
        </View>
      ))}
    </Ticket>
  );
}

function IssuedBy({ v }: { v: VoucherView }) {
  const lh = v.letterhead;
  const lines = [...lh.address, lh.phones.join(' · '), [lh.email, lh.website].filter(Boolean).join(' · ')].filter(Boolean);
  if (!lh.name && !lines.length && !v.signature) return null;
  return (
    <View wrap={false} style={[s.row, s.section, { alignItems: 'flex-end', gap: 20 }]}>
      <View style={{ flex: 1 }}>
        <Label>Issued by</Label>
        {lh.name ? <Text style={[s.semi, { fontSize: 9.5, marginTop: 2 }]}>{lh.name}</Text> : null}
        {lines.map((l, i) => (
          <Text key={i} style={{ color: c.muted }}>
            {l}
          </Text>
        ))}
      </View>
      {v.signature ? (
        <View style={{ alignItems: 'center', width: 130 }}>
          <Image src={v.signature.image} style={{ width: 110, height: 38, objectFit: 'contain' }} />
          <View style={{ alignSelf: 'stretch', borderTopWidth: 0.75, borderTopColor: c.line, marginTop: 2, paddingTop: 2 }}>
            <Text style={{ fontSize: 7.5, color: c.muted, textAlign: 'center' }}>{v.signature.caption}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export const Voucher: VoucherTemplate = ({ view: v, assets }) => {
  const confirmed = v.services.length - v.pendingCount;
  return (
    <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
      <Page size="A4" style={[s.page, { paddingTop: 78 }]}>
        <HeaderStrip
          wordmark={assets.wordmark}
          title="E-VOUCHER"
          code={v.voucherNo}
          meta={[`Issued ${v.issueDate}`, v.status]}
        />

        <Manifest v={v} />

        {v.services.length > 0 ? (
          <View style={s.section}>
            <View style={s.sectionHead} minPresenceAhead={90}>
              <Text style={[s.h, { fontSize: 11 }]}>
                Your tickets <Text style={{ color: c.muted, fontWeight: 600 }}>{`· ${v.services.length}`}</Text>
              </Text>
              <View style={[s.row, { gap: 6 }]}>
                {confirmed > 0 ? <Badge color={c.action}>{`${confirmed} CONFIRMED`}</Badge> : null}
                {v.pendingCount > 0 ? <Badge color={c.warn}>{`${v.pendingCount} PENDING`}</Badge> : null}
              </View>
            </View>
            {v.services.map((svc, i) => (
              <ServiceTicket key={i} svc={svc} bookingNo={v.bookingNo} />
            ))}
          </View>
        ) : null}

        {v.itinerary.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <RouteCard lines={v.itinerary} />
          </View>
        ) : null}

        <View style={s.section}>
          <GoodToKnow v={v} />
        </View>

        <IssuedBy v={v} />

        <Footer lines={[v.footer]} />
      </Page>
    </Document>
  );
};
