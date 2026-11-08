/** Ledger — Internal costing sheet: customer account + supplier costs, profit, DMC position, money ledger. */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { AdminInvoiceTemplate } from '../types';
import { AMBER, Caption, Furniture, INK, KvTable, LetterheadBox, MUTED, RED, Table, TitleBand, Td, s, toneColour } from './styles';
import { ItemTable, PartiesGrid } from './Invoice';

const money = { fontFamily: 'Inter', textAlign: 'right' as const };

export const AdminInvoice: AdminInvoiceTemplate = ({ view: v, assets }) => {
  const cancelled = v.cancelledPill;
  const p = v.profit;
  // Cancelled: the view's selling price is the client cancellation charge, net cost the DMC cancellation charges.
  const priceLabel = cancelled ? 'Cancellation charge' : 'Selling price';
  const costLabel = cancelled ? 'DMC cxl. charges' : 'Net cost';
  const hasPayBy = v.costLines.some((l) => l.payBy);
  const hasDmcMoney = v.costLines.some((l) => l.dmcPaid !== undefined || l.dmcOwed !== undefined);
  const tail = (hasPayBy ? 54 : 0) + (hasDmcMoney ? 112 : 0);
  const hasContact = v.dmcs.some((d) => d.contact);
  const hasRef = v.ledger.some((e) => e.ref);

  return (
    <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
      <Page size="A4" style={s.page}>
        <Furniture running={`Internal costing sheet ${v.bookingNo}`} footer={v.footer} danger={v.internalBanner} />
        <LetterheadBox lh={v.letterhead} wordmark={assets.wordmark} compact />
        <TitleBand title="INTERNAL COSTING SHEET" sub={v.preparedLine} stamp={v.internalBanner} inline />
        <PartiesGrid
          v={v}
          meta={[
            { label: 'Booking No.', value: v.bookingNo, bold: true },
            { label: 'Invoice No.', value: v.invoiceNo },
            { label: 'Invoice date', value: v.invoiceDate },
            {
              label: 'Status',
              value: v.status,
              colour: cancelled ? RED : undefined,
              bold: cancelled,
            },
          ]}
        />
        {v.cancelledNote || v.cancelReason ? (
          <View style={[s.section, s.box, { gap: 2 }]} wrap={false}>
            {v.cancelReason ? (
              <Text style={{ color: RED }}>
                <Text style={[s.lab, { color: RED }]}>Cancellation reason: </Text>
                {v.cancelReason}
              </Text>
            ) : null}
            {v.cancelledNote ? <Text style={[s.small, { color: RED }]}>{v.cancelledNote}</Text> : null}
          </View>
        ) : null}

        <ItemTable v={v} services={false} words={false} caption="Customer account (as invoiced)" />

        {v.costLines.length > 0 && (
          <Table
            caption="Supplier costing"
            head={
              <View style={[s.row, s.hr]}>
                <Td w={20} head align="center">
                  Sr
                </Td>
                <Td head>Service</Td>
                <Td w={84} head>
                  Supplier
                </Td>
                <Td w={66} head>
                  Conf.
                </Td>
                <Td w={64} head last={!tail}>
                  <Text style={[s.thText, { textAlign: 'right' }]}>{cancelled ? 'Net / Cxl' : 'Net cost'}</Text>
                </Td>
                {hasPayBy && (
                  <Td w={54} head last={!hasDmcMoney}>
                    Pay by
                  </Td>
                )}
                {hasDmcMoney && (
                  <Td w={56} head align="right">
                    Paid
                  </Td>
                )}
                {hasDmcMoney && (
                  <Td w={56} head last align="right">
                    Owed
                  </Td>
                )}
              </View>
            }
          >
            {v.costLines.map((l, i) => (
              <View key={i} style={[s.row, s.hr]} wrap={false}>
                <Td w={20}>
                  <Text style={[s.small, { textAlign: 'center' }]}>{l.no}</Text>
                </Td>
                <Td>
                  <Text style={[s.lab, { color: INK }]}>
                    {l.type}
                    <Text
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        textTransform: 'none',
                        letterSpacing: 0,
                        color: MUTED,
                      }}
                    >{`  ${l.dates}`}</Text>
                  </Text>
                  <Text style={s.small}>{l.description}</Text>
                </Td>
                <Td w={84}>
                  <Text style={s.small}>{l.supplier}</Text>
                </Td>
                <Td w={66}>
                  <Text style={[s.small, l.confirmation.pending ? { color: AMBER } : s.semi]}>{l.confirmation.text}</Text>
                </Td>
                <Td w={64} last={!tail}>
                  {l.cancellationCharge !== undefined ? (
                    <>
                      <Text style={[s.small, money, s.struck]}>{l.netCost}</Text>
                      <Text style={[s.small, money, s.semi]}>{l.cancellationCharge}</Text>
                    </>
                  ) : (
                    <Text style={[s.small, money, s.semi]}>{l.netCost}</Text>
                  )}
                </Td>
                {hasPayBy && (
                  <Td w={54} last={!hasDmcMoney}>
                    <Text style={s.small}>{l.payBy ? l.payBy.replace(/^Pay by /, '') : ''}</Text>
                  </Td>
                )}
                {hasDmcMoney && (
                  <Td w={56}>
                    <Text style={[s.small, money]}>{l.dmcPaid ?? ''}</Text>
                  </Td>
                )}
                {hasDmcMoney && (
                  <Td w={56} last>
                    <Text style={[s.small, money]}>{l.dmcOwed ?? ''}</Text>
                  </Td>
                )}
              </View>
            ))}
            <View style={s.row} wrap={false}>
              <Td>
                <Text style={[s.lab, { textAlign: 'right', color: INK }]}>{`Total ${costLabel}`}</Text>
              </Td>
              <Td w={64} last={!tail}>
                <Text style={[s.small, money, s.semi]}>{p.netCost}</Text>
              </Td>
              {tail > 0 && <Td w={tail} last />}
            </View>
          </Table>
        )}

        <View style={[s.section, s.row]} wrap={false}>
          <View style={[{ flex: 1 }, s.vr]}>
            <Caption>Profit</Caption>
            <KvTable
              labelWidth={96}
              valueRight
              rows={[
                { label: priceLabel, value: p.sellingPrice },
                { label: costLabel, value: p.netCost },
                {
                  label: 'Commission',
                  value: p.commission,
                  colour: toneColour[p.commissionTone],
                  bold: true,
                },
                {
                  label: 'Margin',
                  value: p.margin,
                  colour: toneColour[p.commissionTone],
                },
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Caption>Cash position</Caption>
            <KvTable
              labelWidth={96}
              valueRight
              rows={[
                { label: 'Client received', value: p.clientReceived },
                {
                  label: 'Client outstanding',
                  value: p.clientOutstanding,
                  colour: toneColour[p.clientOutstandingTone],
                  bold: true,
                },
                {
                  label: 'DMC outstanding',
                  value: p.dmcOutstanding,
                  colour: toneColour[p.dmcOutstandingTone],
                  bold: true,
                },
                { label: 'Cash in hand', value: p.cashInHand, bold: true },
              ]}
            />
          </View>
        </View>

        {v.dmcs.length > 0 && (
          <Table
            caption="DMC position"
            wrap={false}
            head={
              <View style={[s.row, s.hr]}>
                <Td head>DMC</Td>
                {hasContact && (
                  <Td w={130} head>
                    Contact
                  </Td>
                )}
                <Td w={70} head align="right">
                  Cost
                </Td>
                <Td w={70} head align="right">
                  Paid
                </Td>
                <Td w={96} head last align="right">
                  Outstanding
                </Td>
              </View>
            }
          >
            {v.dmcs.map((d, i) => (
              <View key={i} style={[s.row, i < v.dmcs.length - 1 ? s.hr : {}]} wrap={false}>
                <Td>
                  <Text style={s.semi}>{d.name}</Text>
                </Td>
                {hasContact && (
                  <Td w={130}>
                    <Text style={[s.small, s.muted]}>{d.contact}</Text>
                  </Td>
                )}
                <Td w={70}>
                  <Text style={money}>{d.cost}</Text>
                </Td>
                <Td w={70}>
                  <Text style={money}>{d.paid}</Text>
                </Td>
                <Td w={96} last>
                  <Text style={[money, { color: toneColour[d.tone] }]}>
                    <Text style={[s.lab, { color: toneColour[d.tone] }]}>{d.label.toUpperCase()} </Text>
                    {d.label === 'Settled' ? '' : d.outstanding}
                  </Text>
                </Td>
              </View>
            ))}
          </Table>
        )}

        {v.ledger.length > 0 && (
          <Table
            caption="Money ledger"
            head={
              <View style={[s.row, s.hr]}>
                <Td w={62} head>
                  Date
                </Td>
                <Td head>Party</Td>
                <Td w={72} head>
                  In / Out
                </Td>
                <Td w={74} head>
                  Mode
                </Td>
                {hasRef && (
                  <Td w={84} head>
                    Ref
                  </Td>
                )}
                <Td w={72} head last align="right">
                  Amount
                </Td>
              </View>
            }
          >
            {v.ledger.map((e, i) => (
              <View key={i} style={[s.row, i < v.ledger.length - 1 ? s.hr : {}]} wrap={false}>
                <Td w={62}>
                  <Text style={s.small}>{e.date}</Text>
                </Td>
                <Td>
                  <Text style={s.small}>{e.party}</Text>
                </Td>
                <Td w={72}>
                  <Text style={s.small}>
                    <Text style={s.semi}>{e.direction}</Text>
                    {` · ${e.kind}`}
                  </Text>
                </Td>
                <Td w={74}>
                  <Text style={s.small}>{e.mode}</Text>
                </Td>
                {hasRef && (
                  <Td w={84}>
                    <Text style={[s.small, s.muted]}>{e.ref}</Text>
                  </Td>
                )}
                <Td w={72} last>
                  <Text style={[money, s.semi, s.small]}>{`${e.direction === 'In' ? '+' : '−'} ${e.amount}`}</Text>
                </Td>
              </View>
            ))}
          </Table>
        )}

        {v.internalNotes.length > 0 && (
          <View style={s.section} wrap={false}>
            <Caption>Internal notes</Caption>
            <View style={[s.box, { gap: 2 }]}>
              {v.internalNotes.map((n, i) => (
                <View key={i} style={[s.row, { gap: 4 }]}>
                  <Text style={[s.small, { width: 10 }]}>{i + 1}.</Text>
                  <Text style={[s.small, { flex: 1 }]}>{n}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
};
