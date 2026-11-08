/** Ledger — Service Voucher in the same ruled-box language. Prints no price, DMC or payment. */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { VoucherTemplate } from '../types';
import { AMBER, Caption, Furniture, INK, KvTable, LetterheadBox, PairList, RED, SignatureBox, Table, TitleBand, Td, s } from './styles';

const SR = 22;
const DATES = 92;
const CONF = 92;

export const Voucher: VoucherTemplate = ({ view: v, assets }) => {
  const trip = [
    { label: 'Service', value: v.categoryLabel },
    { label: 'Destination', value: v.trip.destination },
    { label: 'Travel dates', value: v.trip.dates },
  ].filter((r) => r.value);
  const meta = [
    { label: 'Voucher No.', value: v.voucherNo, bold: true },
    { label: 'Issue date', value: v.issueDate },
    { label: 'Status', value: v.status },
    ...(v.pendingCount > 0
      ? [
          {
            label: 'Pending',
            value: `${v.pendingCount} to be confirmed`,
            colour: AMBER,
          },
        ]
      : []),
  ].filter((r) => r.value);
  const hasNotes = v.services.some((x) => x.notes);
  const footer = v.footer ? [v.footer] : [];

  return (
    <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
      <Page size="A4" style={s.page}>
        <Furniture running={`Service voucher ${v.voucherNo}`} footer={footer} />
        <LetterheadBox lh={v.letterhead} wordmark={assets.wordmark} />
        <TitleBand title="SERVICE VOUCHER" sub={v.categoryLabel} />

        <View style={s.section} wrap={false}>
          <View style={[s.row, s.hr]}>
            <View style={[s.box, s.vr, { flex: 1 }]}>
              <Text style={[s.lab, { marginBottom: 3 }]}>Guest details</Text>
              <PairList rows={v.guestRows} labelWidth={62} />
            </View>
            <View style={{ width: 232 }}>
              <KvTable rows={meta} labelWidth={78} />
            </View>
          </View>
          <View style={s.row}>
            <View style={[s.box, v.emergency.length ? s.vr : {}, { flex: 1 }]}>
              <Text style={[s.lab, { marginBottom: 3 }]}>Trip / Service</Text>
              <PairList rows={trip} labelWidth={70} />
            </View>
            {v.emergency.length > 0 && (
              <View style={[s.box, { width: 232 }]}>
                <Text style={[s.lab, { marginBottom: 3, color: RED }]}>Emergency contact</Text>
                {v.emergency.map((p, i) => (
                  <Text key={i} style={s.semi}>
                    {p}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>

        {v.services.length > 0 && (
          <Table
            caption="Particulars of services"
            head={
              <View style={[s.row, s.hr]}>
                <Td w={SR} head align="center">
                  Sr
                </Td>
                <Td w={DATES} head>
                  Dates
                </Td>
                <Td flex={1.35} head>
                  Service
                </Td>
                {hasNotes && <Td head>Details / notes</Td>}
                <Td w={CONF} head last>
                  Confirmation No.
                </Td>
              </View>
            }
          >
            {v.services.map((x, i) => (
              <View key={i} style={[s.row, i < v.services.length - 1 ? s.hr : {}]} wrap={false}>
                <Td w={SR}>
                  <Text style={{ textAlign: 'center' }}>{i + 1}</Text>
                </Td>
                <Td w={DATES}>
                  {x.nights > 0 ? (
                    <View style={{ gap: 1 }}>
                      <Text style={s.small}>
                        <Text style={s.lab}>IN </Text>
                        {x.start}
                      </Text>
                      <Text style={s.small}>
                        <Text style={s.lab}>OUT </Text>
                        {x.end}
                      </Text>
                      <Text style={[s.small, s.semi]}>
                        {x.nights} night{x.nights === 1 ? '' : 's'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={s.small}>{x.dates}</Text>
                  )}
                </Td>
                <Td flex={1.35}>
                  <Text style={[s.lab, { color: INK }]}>{x.type}</Text>
                  <Text>{x.description}</Text>
                </Td>
                {hasNotes && (
                  <Td>
                    <Text style={[s.small, s.muted]}>{x.notes ?? ''}</Text>
                  </Td>
                )}
                <Td w={CONF} last>
                  <Text style={x.confirmation.pending ? { color: AMBER } : s.semi}>{x.confirmation.text}</Text>
                </Td>
              </View>
            ))}
          </Table>
        )}

        {v.itinerary.length > 0 && (
          <View style={s.section}>
            <Caption>Itinerary</Caption>
            <View style={s.box}>
              {v.itinerary.map((l, i) =>
                l ? (
                  <Text key={i} style={{ marginBottom: 2 }}>
                    {l}
                  </Text>
                ) : (
                  <View key={i} style={{ height: 5 }} />
                ),
              )}
            </View>
          </View>
        )}

        {v.goodToKnow.length > 0 || v.signature ? (
          <View style={[s.section, s.row, v.signature ? { minHeight: 78 } : {}]} wrap={false}>
            {v.goodToKnow.length > 0 ? (
              <View style={{ flex: 1 }}>
                <Caption>Good to know</Caption>
                <View style={[s.box, { gap: 2 }]}>
                  {v.goodToKnow.map((t, i) => (
                    <View key={i} style={[s.row, { gap: 4 }]}>
                      <Text style={[s.small, { width: 10 }]}>{i + 1}.</Text>
                      <Text style={[s.small, { flex: 1 }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {v.signature ? <SignatureBox name={v.letterhead.name} signature={v.signature} ruledLeft={v.goodToKnow.length > 0} /> : null}
          </View>
        ) : null}
      </Page>
    </Document>
  );
};
