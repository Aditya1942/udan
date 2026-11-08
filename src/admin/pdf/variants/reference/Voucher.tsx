/**
 * "Reference" voucher: the owner's hotel booking confirmation voucher, cleaned up. Navy letterhead box, light-blue
 * label tables, blue caps section headings, "Issued by" box. Lays out a `VoucherView` (no price, DMC or payment).
 */
import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import type { Pax } from '../../../model';
import type { VoucherView } from '../../view';
import type { VoucherTemplate } from '../types';
import { C, s, VOUCHER_WORD, voucherTitle } from './styles';

type Row = { label: string; value: ReactNode; strong?: boolean };

function KvTable({ rows }: { rows: Row[] }) {
  return (
    <View style={s.kvTable}>
      {rows.map((r, i) => (
        <View key={i} style={s.kvRow} wrap={false}>
          <Text style={s.kvLabel}>{r.label}</Text>
          <View style={s.kvValue}>
            {typeof r.value === 'string' ? <Text style={r.strong ? { fontWeight: 600 } : undefined}>{r.value}</Text> : r.value}
          </View>
        </View>
      ))}
    </View>
  );
}

const Confirmation = ({ c }: { c: { text: string; pending: boolean } }) => (
  <Text style={c.pending ? { color: C.warn, fontWeight: 600 } : { fontWeight: 600 }}>{c.text}</Text>
);

const nightsText = (n: number) => `${String(n).padStart(2, '0')} Night${n === 1 ? '' : 's'}`;

const paxCountsText = (p: Pax) =>
  [
    p.adults ? `${p.adults} Adult${p.adults === 1 ? '' : 's'}` : '',
    p.children ? `${p.children} Child${p.children === 1 ? '' : 'ren'}` : '',
    p.infants ? `${p.infants} Infant${p.infants === 1 ? '' : 's'}` : '',
  ]
    .filter(Boolean)
    .join('  |  ');

/** Heading kept on the same page as the first block under it. */
const Section = ({ title, children, flow }: { title: string; children: ReactNode; flow?: boolean }) =>
  flow ? (
    <View>
      <Text style={s.vH} minPresenceAhead={40}>
        {title}
      </Text>
      {children}
    </View>
  ) : (
    <View wrap={false}>
      <Text style={s.vH}>{title}</Text>
      {children}
    </View>
  );

/** Brand panel (logo assets) + navy box with the trading name and phones from the Business profile (filled only). */
function Letterhead({ v, assets }: { v: VoucherView; assets: { mark: string; wordmark: string } }) {
  const { name, phones } = v.letterhead;
  return (
    <View style={s.lhBox}>
      <View style={s.lhLeft}>
        <Image src={assets.mark} style={{ width: 50, height: 59 }} />
        <Image src={assets.wordmark} style={{ width: 96, height: 30, marginTop: 5 }} />
      </View>
      <View style={s.lhRight}>
        {name ? <Text style={s.lhName}>{name.toUpperCase()}</Text> : null}
        {phones.length > 0 ? <Text style={name ? s.lhSub : s.lhName}>{phones.join('  |  ')}</Text> : null}
      </View>
    </View>
  );
}

function guestTable(v: VoucherView): Row[] {
  const rows: Row[] = [];
  for (const r of v.guestRows) {
    if (r.label === 'Lead guest') rows.push({ label: 'Lead Guest Name', value: r.value, strong: true });
    else if (r.label === 'Travellers')
      rows.push({
        label: v.travellers.length > 1 ? 'Travellers' : 'Traveller',
        value: (
          <View>
            {v.travellers.map((t, i) => (
              <Text key={i}>{t}</Text>
            ))}
          </View>
        ),
      });
    else if (r.label === 'Guests')
      rows.push({
        label: 'Guests',
        value: paxCountsText(v.paxCounts) || r.value,
      });
    else rows.push({ label: r.label, value: r.value });
  }
  if (v.trip.destination) rows.push({ label: 'Destination', value: v.trip.destination });
  // Hotel vouchers print check-in / check-out per stay instead.
  if (v.trip.dates && !(v.category === 'Hotel' && v.stays.length)) rows.push({ label: 'Travel Dates', value: v.trip.dates });
  return rows;
}

function stayRows(st: VoucherView['stays'][number]): Row[] {
  const rows: Row[] = [{ label: 'Hotel Name', value: st.name, strong: true }];
  if (st.checkIn) rows.push({ label: 'Check-in', value: st.checkIn });
  if (st.checkOut) rows.push({ label: 'Check-out', value: st.checkOut });
  if (st.nights) rows.push({ label: 'Total Stay', value: nightsText(st.nights) });
  rows.push({
    label: 'Hotel Confirmation No.',
    value: <Confirmation c={st.confirmation} />,
  });
  if (st.notes) rows.push({ label: 'Notes', value: st.notes });
  return rows;
}

/** One compact table per service; hotel lines use the hotel-voucher labels. */
function serviceRows(sv: VoucherView['services'][number]): Row[] {
  if (sv.type === 'Hotel') {
    const rows: Row[] = [{ label: 'Hotel Name', value: sv.description, strong: true }];
    if (sv.start) rows.push({ label: 'Check-in', value: sv.start });
    if (sv.end && sv.end !== sv.start) rows.push({ label: 'Check-out', value: sv.end });
    if (sv.nights) rows.push({ label: 'Total Stay', value: nightsText(sv.nights) });
    rows.push({
      label: 'Hotel Confirmation No.',
      value: <Confirmation c={sv.confirmation} />,
    });
    if (sv.notes) rows.push({ label: 'Notes', value: sv.notes });
    return rows;
  }
  const rows: Row[] = [{ label: sv.type, value: sv.description, strong: true }];
  if (sv.start)
    rows.push({
      label: sv.end && sv.end !== sv.start ? 'Dates' : 'Date',
      value: sv.dates,
    });
  rows.push({
    label: 'Confirmation No.',
    value: <Confirmation c={sv.confirmation} />,
  });
  if (sv.notes) rows.push({ label: 'Notes', value: sv.notes });
  return rows;
}

/** Heading + tables; the heading always travels with the first table. */
function TableList({ title, tables, caption }: { title: string; tables: Row[][]; caption?: (i: number) => string }) {
  return (
    <View>
      {tables.map((rows, i) => (
        <View key={i} wrap={false} style={{ marginTop: i ? 7 : 0 }}>
          {i === 0 ? <Text style={s.vH}>{title}</Text> : null}
          {caption ? <Text style={s.vSub}>{caption(i)}</Text> : null}
          <KvTable rows={rows} />
        </View>
      ))}
    </View>
  );
}

function Bullets({ lines }: { lines: string[] }) {
  return (
    <View>
      {lines.map((l, i) => (
        <View key={i} style={s.bullet} wrap={false}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={{ flex: 1 }}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

export const Voucher: VoucherTemplate = ({ view: v, assets }) => {
  const word = VOUCHER_WORD[v.category];
  const brand = v.letterhead.name?.toUpperCase() ?? '';
  // Hotel vouchers lead with stays (like the reference); every other category lists services in date order.
  const hotelVoucher = v.category === 'Hotel';
  const listed = hotelVoucher ? v.services.filter((x) => x.type !== 'Hotel') : v.services;
  const guest = guestTable(v);
  const types = [...new Set(v.services.map((x) => x.type))];
  const inclusions: Row[] = [];
  if (v.services.length > 1) inclusions.push({ label: 'Included', value: types.join(', ') });
  if (v.pendingCount > 0 && v.services.length > 1)
    inclusions.push({
      label: 'Awaiting Confirmation',
      value: (
        <Text style={{ color: C.warn, fontWeight: 600 }}>
          {v.pendingCount}{'\u00a0'}{v.pendingCount === 1 ? 'service' : 'services'} — confirmation number to follow
        </Text>
      ),
    });
  const lh = v.letterhead;
  const sameAsPhones = v.emergency.join('|') === lh.phones.join('|');

  return (
    <Document title={v.filenameTitle} author={lh.name} creator={lh.name} producer={lh.name}>
      <Page size="A4" style={s.vPage}>
        <Text fixed style={s.runHead}>
          {[brand, `${word} VOUCHER`].filter(Boolean).join(' | ')}
        </Text>

        <View style={s.body}>
          <Letterhead v={v} assets={assets} />

          <Text style={s.vTitle}>{voucherTitle(v.category)}</Text>

          <View style={s.strip}>
            {[
              ['VOUCHER NO.', v.voucherNo],
              ['ISSUE DATE', v.issueDate],
              ['BOOKING STATUS', v.status.toUpperCase()],
            ].map(([label, value]) => (
              <View key={label} style={s.stripCell}>
                <Text style={s.stripLabel}>{label}</Text>
                <Text style={s.stripValue}>{value}</Text>
              </View>
            ))}
          </View>

          {guest.length > 0 && (
            <Section title="GUEST DETAILS">
              <KvTable rows={guest} />
            </Section>
          )}

          {hotelVoucher && v.stays.length > 0 ? (
            <TableList
              title="HOTEL & STAY DETAILS"
              tables={v.stays.map(stayRows)}
              caption={v.stays.length > 1 ? (i) => `STAY\u00a0${i + 1} OF\u00a0${v.stays.length}` : undefined}
            />
          ) : null}

          {listed.length > 0 ? (
            <TableList
              title={hotelVoucher && v.stays.length ? 'OTHER SERVICE DETAILS' : 'SERVICE DETAILS'}
              tables={listed.map(serviceRows)}
            />
          ) : null}

          {inclusions.length > 0 && (
            <Section title="BOOKING INCLUSIONS">
              <KvTable rows={inclusions} />
            </Section>
          )}

          {v.itinerary.length > 0 && (
            <Section title="ITINERARY" flow>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.line,
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                }}
              >
                {v.itinerary.map((l, i) =>
                  l ? (
                    <Text key={i} style={{ marginBottom: 2.5 }}>
                      {l}
                    </Text>
                  ) : (
                    <View key={i} style={{ height: 5 }} />
                  ),
                )}
              </View>
            </Section>
          )}

          {v.goodToKnow.length > 0 && (
            <Section title="IMPORTANT GUEST INFORMATION" flow>
              <Bullets lines={v.goodToKnow} />
            </Section>
          )}

          <View wrap={false}>
            <Text style={s.vH}>ISSUED BY</Text>
            <View style={s.issuedBox}>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                {brand ? <Text style={s.issuedText}>{brand}</Text> : null}
                {lh.address.map((a, i) => (
                  <Text key={i} style={s.issuedText}>
                    {a}
                  </Text>
                ))}
                {lh.phones.length > 0 ? <Text style={s.issuedText}>Phone: {lh.phones.join(' / ')}</Text> : null}
                {lh.email ? <Text style={s.issuedText}>Email: {lh.email}</Text> : null}
                {lh.website ? <Text style={s.issuedText}>Web: {lh.website}</Text> : null}
                {v.emergency.length > 0 && !sameAsPhones ? (
                  <Text style={[s.issuedText, { color: C.danger }]}>Emergency: {v.emergency.join(' / ')}</Text>
                ) : null}
              </View>
              {v.signature ? (
                <View style={{ width: '44%' }}>
                  <Text style={{ color: C.muted, marginBottom: 4 }}>Authorized Signature / Stamp</Text>
                  <Image
                    src={v.signature.image}
                    style={{
                      height: 52,
                      width: 160,
                      objectFit: 'contain',
                      objectPosition: 'left',
                    }}
                  />
                  <View
                    style={{
                      borderBottomWidth: 0.75,
                      borderBottomColor: C.muted,
                      width: 150,
                      marginTop: 4,
                    }}
                  />
                  <Text style={{ color: C.muted, fontSize: 7.5, marginTop: 2 }}>{v.signature.caption}</Text>
                </View>
              ) : null}
            </View>
            {v.letterhead.name ? <Text style={s.thanks}>Thank you for choosing {v.letterhead.name}.</Text> : null}
          </View>
        </View>

        {v.footer ? (
          <Text fixed style={s.vFoot}>
            {v.footer}
          </Text>
        ) : null}
        <Text
          fixed
          style={s.pageNo}
          render={({ pageNumber, totalPages }) => (totalPages > 1 ? `Page\u00a0${pageNumber} of\u00a0${totalPages}` : '')}
        />
      </Page>
    </Document>
  );
};
