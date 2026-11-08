/** Ledger — customer Invoice: classic Indian ruled bill. Never prints DMC, net cost or commission. */
import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import type { InvoiceTemplate, VariantAssets } from '../types';
import type { AdminInvoiceView, InvoiceView } from '../../view';
import { Caption, Furniture, HIGHLIGHT, INK, KvTable, LetterheadBox, PairList, RED, RULE, SignatureBox, TitleBand, Td, s, toneColour } from './styles';

const SR = 26;
const DATES = 118;
const AMT = 88;

const notTaxInvoice = (footer: string[]) => footer.some((l) => /not a tax invoice/i.test(l));

/** Billed to | invoice facts; Trip / Service | Travellers. */
export function PartiesGrid({ v, meta }: { v: InvoiceView | AdminInvoiceView; meta: { label: string; value: string; colour?: string; bold?: boolean }[] }) {
  const trip = [
    { label: 'Service', value: v.categoryLabel },
    { label: 'Destination', value: v.trip.destination },
    { label: 'Travel dates', value: v.trip.dates },
    { label: 'Passengers', value: v.trip.pax },
  ].filter((r) => r.value);
  return (
    <View style={s.section} wrap={false}>
      <View style={[s.row, s.hr]}>
        <View style={[s.box, s.vr, { flex: 1 }]}>
          <Text style={[s.lab, { marginBottom: 3 }]}>Billed to</Text>
          {v.billedTo.name ? <Text style={[s.semi, { fontSize: 10, marginBottom: 3 }]}>{v.billedTo.name}</Text> : null}
          <PairList rows={v.billedToDetails} labelWidth={52} />
        </View>
        <View style={{ width: 232 }}>
          <KvTable rows={meta.filter((r) => r.value)} labelWidth={78} />
        </View>
      </View>
      <View style={s.row}>
        <View style={[s.box, v.trip.travellers.length ? s.vr : {}, { flex: 1 }]}>
          <Text style={[s.lab, { marginBottom: 3 }]}>Trip / Service</Text>
          <PairList rows={trip} labelWidth={70} />
        </View>
        {v.trip.travellers.length > 0 && (
          <View style={[s.box, { width: 232 }]}>
            <Text style={[s.lab, { marginBottom: 3 }]}>Travellers ({v.trip.travellers.length})</Text>
            {v.trip.travellers.map((t, i) => (
              <Text key={i}>
                {i + 1}. {t}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

/** Sr | Particulars | Dates | Amount — one priced row, services as unpriced sub-particulars, then the totals. */
export function ItemTable({
  v,
  services = true,
  words = true,
  caption,
}: {
  v: InvoiceView | AdminInvoiceView;
  services?: boolean;
  words?: boolean;
  caption?: string;
}) {
  const struck = v.servicesStruck ? s.struck : {};
  const items = services ? v.lineItems : [];
  const result = v.totals.result;
  return (
    <View style={s.section}>
      <View wrap={false}>
        {caption ? <Caption>{caption}</Caption> : null}
        <View style={[s.row, s.hr]}>
          <Td w={SR} head align="center">
            Sr
          </Td>
          <Td head>Particulars</Td>
          <Td w={DATES} head>
            Dates
          </Td>
          <Td w={AMT} head last>
            <Text style={[s.thText, s.right, { fontFamily: 'Inter', fontWeight: 600 }]}>Amount (₹)</Text>
          </Td>
        </View>

        <View style={[s.row, items.length || v.originalPrice ? {} : s.hr]} wrap={false}>
          <Td w={SR} align="center">
            1
          </Td>
          <Td>
            <Text style={s.semi}>{v.item.title}</Text>
            {v.item.detail ? <Text style={[s.muted, s.small]}>{v.item.detail}</Text> : null}
          </Td>
          <Td w={DATES}>
            <Text style={s.small}>{v.trip.dates}</Text>
          </Td>
          <Td w={AMT} last>
            <Text style={[s.right, s.semi]}>{v.item.amount}</Text>
          </Td>
        </View>
      </View>

      {items.length > 0 && (
        <View style={[s.row]} minPresenceAhead={20}>
          <Td w={SR} style={{ paddingVertical: 0 }} />
          <Td style={{ paddingTop: 1, paddingBottom: 1, paddingLeft: 14 }}>
            <Text style={s.lab}>{v.servicesStruck ? 'Services (cancelled)' : 'Services included'}</Text>
          </Td>
          <Td w={DATES} style={{ paddingVertical: 0 }} />
          <Td w={AMT} last style={{ paddingVertical: 0 }} />
        </View>
      )}
      {items.map((l, i) => {
        const lastRow = i === items.length - 1 && !v.originalPrice;
        return (
          <View key={i} style={[s.row, lastRow ? s.hr : {}]} wrap={false}>
            <Td w={SR} style={{ paddingVertical: 2 }} />
            <Td style={{ paddingVertical: 2, paddingLeft: 14 }}>
              <View style={[s.row, { gap: 4 }]}>
                <Text style={[s.small, s.muted, { width: 12 }]}>{String.fromCharCode(97 + (i % 26))})</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.small, struck]}>
                    <Text style={[s.semi, struck]}>{l.type}</Text> — {l.description}
                    {l.detail ? <Text style={[s.muted, struck]}>{`\u00a0· ${l.detail}`}</Text> : null}
                  </Text>
                </View>
              </View>
            </Td>
            <Td w={DATES} style={{ paddingVertical: 2 }}>
              <Text style={[s.small, struck]}>{l.dates}</Text>
            </Td>
            <Td w={AMT} last style={{ paddingVertical: 2 }} />
          </View>
        );
      })}
      {v.originalPrice && (
        <View style={[s.row, s.hr]} wrap={false}>
          <Td w={SR} />
          <Td style={{ paddingLeft: 14 }}>
            <Text style={[s.small, s.muted]}>{v.originalPrice.label}</Text>
          </Td>
          <Td w={DATES} />
          <Td w={AMT} last>
            <Text style={[s.right, s.small, s.struck]}>{v.originalPrice.amount}</Text>
          </Td>
        </View>
      )}

      <View wrap={false}>
        {v.totals.lines.map((l, i) => (
          <View key={i} style={[s.row, s.hr]}>
            <Td>
              <Text style={[s.right, l.muted ? s.muted : s.semi, s.small]}>{i === 0 ? `Total — ${l.label}` : l.label}</Text>
            </Td>
            <Td w={AMT} last>
              <Text style={[s.right, l.muted ? s.muted : s.semi]}>{l.amount}</Text>
            </Td>
          </View>
        ))}
        <View style={[s.row, s.hr, { backgroundColor: HIGHLIGHT }]}>
          <Td>
            <Text
              style={[
                s.right,
                {
                  fontFamily: 'Helvetica-Bold',
                  fontSize: 8.5,
                  color: toneColour[result.tone],
                  letterSpacing: 0.4,
                },
              ]}
            >
              {result.label.toUpperCase()}
              {result.note ? (
                <Text
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 400,
                    fontSize: 7.5,
                  }}
                >{`  (${result.note})`}</Text>
              ) : null}
            </Text>
          </Td>
          <Td w={AMT} last>
            <Text
              style={[
                s.right,
                {
                  fontFamily: 'Manrope',
                  fontWeight: 700,
                  fontSize: 10,
                  color: toneColour[result.tone],
                },
              ]}
            >
              {result.amount}
            </Text>
          </Td>
        </View>
        {words && (
          <View style={[s.row, s.box, { gap: 8 }]}>
            <Text style={[s.lab, { paddingTop: 1.5 }]}>Amount in words</Text>
            <Text style={[s.semi, { flex: 1 }]}>{v.summary.inWords}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** Bank details (+ UPI QR) left, Terms right. Omitted when both are empty. */
function BankTerms({ v, qr }: { v: InvoiceView; qr?: string }) {
  const showQr = Boolean(qr && v.payment?.qr);
  if (!v.bankRows.length && !v.terms.length && !showQr) return null;
  const bank = v.bankRows.length > 0 || showQr;
  return (
    <View style={[s.section, s.row]} wrap={false}>
      {bank && (
        <View style={[{ flex: 1.15 }, v.terms.length ? s.vr : {}]}>
          <Caption>Bank details</Caption>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <KvTable rows={v.bankRows} labelWidth={72} />
            </View>
            {showQr && (
              <View
                style={{
                  width: 92,
                  alignItems: 'center',
                  paddingVertical: 6,
                  paddingHorizontal: 4,
                  borderLeftWidth: RULE,
                  borderLeftColor: INK,
                }}
              >
                <Image src={qr!} style={{ width: 74, height: 74 }} />
                <Text style={[s.small, s.semi, { textAlign: 'center', fontSize: 6.5 }]}>{v.payment!.qr!.caption}</Text>
              </View>
            )}
          </View>
        </View>
      )}
      {v.terms.length > 0 && (
        <View style={{ flex: 1 }}>
          <Caption>Terms & conditions</Caption>
          <View style={[s.box, { gap: 2 }]}>
            {v.terms.map((t, i) => (
              <View key={i} style={[s.row, { gap: 4 }]}>
                <Text style={[s.small, { width: 10 }]}>{i + 1}.</Text>
                <Text style={[s.small, { flex: 1 }]}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export function LedgerInvoice({ v, assets }: { v: InvoiceView; assets: VariantAssets }) {
  const cancelled = v.cancelledPill;
  return (
    <Document title={v.filenameTitle} author={v.letterhead.name} creator={v.letterhead.name} producer={v.letterhead.name}>
      <Page size="A4" style={s.page}>
        <Furniture running={`Invoice ${v.invoiceNo}`} footer={[`Invoice ${v.invoiceNo} · Booking ${v.bookingNo}`]} />
        <LetterheadBox lh={v.letterhead} wordmark={assets.wordmark} />
        <TitleBand
          title="INVOICE"
          sub={notTaxInvoice(v.footer) ? 'Bill of Supply — not a tax invoice' : undefined}
          stamp={cancelled ? 'CANCELLED' : undefined}
        />
        <PartiesGrid
          v={v}
          meta={[
            { label: 'Invoice No.', value: v.invoiceNo, bold: true },
            { label: 'Invoice date', value: v.invoiceDate },
            { label: 'Booking No.', value: v.bookingNo },
            {
              label: 'Status',
              value: v.status,
              colour: cancelled ? RED : undefined,
              bold: cancelled,
            },
          ]}
        />
        {v.cancelledNote ? (
          <View style={[s.section, s.box, { borderLeftWidth: 0 }]} wrap={false}>
            <Text style={{ color: RED }}>{v.cancelledNote}</Text>
          </View>
        ) : null}
        <ItemTable v={v} />
        <BankTerms v={v} qr={assets.qr} />
        <View style={[s.section, s.row, { minHeight: 78 }]} wrap={false}>
          <View style={[s.box, { flex: 1, justifyContent: 'flex-end', gap: 1 }]}>
            {v.footer.map((l, i) => (
              <Text key={i} style={[s.small, i === 0 ? s.semi : s.muted]}>
                {l}
              </Text>
            ))}
          </View>
          <SignatureBox name={v.letterhead.name} signature={v.signature} />
        </View>
      </Page>
    </Document>
  );
}

export const Invoice: InvoiceTemplate = ({ view, assets }) => <LedgerInvoice v={view} assets={assets} />;
