/**
 * "Reference" invoice: the owner's invoice #402, cleaned up. Indigo "INVOICE" title, teal-green rule, numbered item
 * grid over a faint UDAN mark, grey-green totals cells, black-bordered bank table. Lays out an `InvoiceView`.
 */
import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import type { InvoiceView, Letterhead } from '../../view';
import type { InvoiceTemplate } from '../types';
import { C, s, toneColour } from './styles';

/** The faint mark behind the grid needs this many rows to sit inside it (it is not clipped). */
const MARK_ROWS = 5;

/** Indigo title + trading name + rule (shared with the admin sheet). */
export function TitleBlock({ title, name, cancelled, size }: { title: string; name?: string; cancelled: boolean; size?: number }) {
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text style={size ? [s.iTitle, { fontSize: size }] : s.iTitle}>{title}</Text>
        {cancelled ? <Text style={s.pill}>CANCELLED</Text> : null}
      </View>
      {name ? <Text style={s.iSub}>{name.toUpperCase()}</Text> : null}
      <View style={s.iRule} />
    </View>
  );
}

/** Fixed footer: address | phone | email, then a thank-you / extra line, plus page numbers on multi-page docs. */
export function Footer({ lh, lines }: { lh: Letterhead; lines: string[] }) {
  const contact = [lh.address.join(', '), lh.phones.join(' / '), lh.email, lh.website].filter(Boolean).join('  |  ');
  return (
    <>
      <View fixed style={s.iFoot}>
        {contact ? <Text>{contact}</Text> : null}
        {lines.map((l, i) => (
          <Text key={i} style={{ color: C.muted, marginTop: i ? 0 : 1 }}>
            {l}
          </Text>
        ))}
      </View>
      <Text
        fixed
        style={s.iPageNo}
        render={({ pageNumber, totalPages }) => (totalPages > 1 ? `Page\u00a0${pageNumber} of\u00a0${totalPages}` : '')}
      />
    </>
  );
}

export function Signature({ sig }: { sig: { image: string; caption: string } }) {
  return (
    <View style={{ alignItems: 'center', width: 150 }}>
      <Image src={sig.image} style={{ width: 140, height: 46, objectFit: 'contain' }} />
      <View style={{ borderTopWidth: 0.75, borderTopColor: C.muted, width: 140, marginTop: 2 }} />
      <Text style={{ color: C.indigo, fontWeight: 600, fontSize: 7.5, marginTop: 2 }}>{sig.caption}</Text>
    </View>
  );
}

/**
 * Customer details for the right column: everything filled. The mobile is left out only when it is already printed
 * as the contact (no Booking Contact person); the Contact person rows always print in the contact field.
 */
export function ToBlock({ v }: { v: Pick<InvoiceView, 'billedTo' | 'billedToDetails' | 'contact'> }) {
  const skip = ['Address', 'Contact person', 'Contact no.', ...(v.contact.length ? [] : ['Mobile'])];
  const details = [
    ...v.billedToDetails.filter((d) => d.label === 'Address'),
    ...v.billedToDetails.filter((d) => !skip.includes(d.label)),
  ];
  return (
    <View>
      <Text style={s.iTo}>{v.billedTo.name ? `TO ${v.billedTo.name.toUpperCase()}` : 'BILLED TO'}</Text>
      {details.map((d, i) => (
        <Text key={i} style={s.iBold}>
          {d.label === 'Address' ? d.value : `${d.label}: ${d.value}`}
        </Text>
      ))}
    </View>
  );
}

/** Contact person and number as separate lines (a long name never splits the number): the Booking's Contact person, else the Customer. */
export const contactLines = (v: Pick<InvoiceView, 'billedTo' | 'billedToDetails' | 'contact'>) =>
  v.contact.length
    ? v.contact
    : [v.billedTo.name, v.billedToDetails.find((d) => d.label === 'Mobile')?.value].filter((l): l is string => Boolean(l));

export function Field({ label, value, accent }: { label: string; value: string | string[]; accent?: boolean }) {
  const lines = (Array.isArray(value) ? value : [value]).filter(Boolean);
  if (!lines.length) return null;
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={s.iLabel}>{label}</Text>
      {lines.map((l, i) => (
        <Text key={i} style={[{ fontSize: 8.5 }, accent ? { color: C.indigo, fontWeight: 600 } : {}]}>
          {l}
        </Text>
      ))}
    </View>
  );
}

const COL = { no: 34, total: 92 };

function ItemGrid({ v, mark }: { v: InvoiceView; mark: string }) {
  const struck = v.servicesStruck ? s.struck : {};
  // One service that the priced row already names: fold its detail into row 01 instead of repeating it.
  const only =
    v.lineItems.length === 1 && !v.servicesStruck && v.item.title.includes(v.lineItems[0].description) ? v.lineItems[0] : undefined;
  const items = only ? [] : v.lineItems;
  const detail = [v.item.detail, only?.detail].filter(Boolean).join(' · ');
  const showMark = 1 + items.length >= MARK_ROWS;
  const travellers = v.trip.travellers.length ? `Travellers: ${v.trip.travellers.join(', ')}` : '';
  return (
    <View>
      <Text style={{ fontWeight: 600, fontSize: 8.5, marginBottom: 6 }}>Please find below payment invoice</Text>
      <View style={s.gridHead} fixed>
        <Text style={[s.gridHeadText, { width: COL.no, paddingLeft: 6 }]}>NO</Text>
        <Text style={[s.gridHeadText, { flex: 1, paddingLeft: 6 }]}>DESCRIPTION</Text>
        <Text style={[s.gridHeadText, { width: COL.total, textAlign: 'right', paddingRight: 6 }]}>TOTAL</Text>
      </View>
      <View style={s.grid}>
        {showMark ? (
          <View
            style={{
              position: 'absolute',
              top: 4,
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
          >
            <Image src={mark} style={{ width: 128, height: 151, opacity: 0.12 }} />
          </View>
        ) : null}
        <View style={s.gridRow} wrap={false}>
          <Text style={[s.gridCell, { width: COL.no, fontWeight: 600 }]}>01</Text>
          <View style={[s.gridCell, { flex: 1 }]}>
            <Text style={{ fontWeight: 600 }}>{v.item.title}</Text>
            {detail ? <Text style={{ color: C.muted }}>{detail}</Text> : null}
            {travellers ? <Text style={{ color: C.muted, fontSize: 7.5 }}>{travellers}</Text> : null}
          </View>
          <Text style={[s.gridCell, { width: COL.total, textAlign: 'right', fontWeight: 600 }]}>{v.item.amount}</Text>
        </View>
        {items.map((li, i) => (
          <View key={i} style={s.gridRow} wrap={false}>
            <Text style={[s.gridCell, { width: COL.no, fontWeight: 600 }]}>{String(i + 2).padStart(2, '0')}</Text>
            <View style={[s.gridCell, { flex: 1 }]}>
              <Text style={struck}>
                <Text style={{ fontWeight: 600 }}>Includes: {li.type}</Text> — {li.description}
              </Text>
              {li.dates || li.detail ? (
                <Text style={[{ color: C.muted, fontSize: 7.5 }, struck]}>{[li.dates, li.detail].filter(Boolean).join(' · ')}</Text>
              ) : null}
            </View>
            <Text style={[s.gridCell, { width: COL.total, textAlign: 'right', color: C.muted }, struck]}>Incl.</Text>
          </View>
        ))}
      </View>
      {v.originalPrice ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 4,
          }}
          wrap={false}
        >
          <Text style={{ color: C.muted }}>{v.originalPrice.label}</Text>
          <Text style={[s.struck, { paddingRight: 6 }]}>{v.originalPrice.amount}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** TOTAL (or CANCELLATION CHARGE) cell, payments received / refunded, then the tone-coloured result. No tax field exists. */
export function Totals({ v }: { v: Pick<InvoiceView, 'summary' | 'totals' | 'cancelledPill'> }) {
  const r = v.totals.result;
  const tone = toneColour[r.tone];
  return (
    <View style={{ width: 280 }}>
      <View style={[s.totRow, { marginBottom: 3 }]}>
        <Text style={s.totLabel}>{v.cancelledPill ? v.totals.lines[0].label.toUpperCase() : 'TOTAL'}</Text>
        <Text style={s.totCell}>{v.summary.total}</Text>
      </View>
      {v.totals.lines.slice(1).map((l, i) => (
        <View key={i} style={[s.totRow, { marginTop: i ? 0 : 3 }]}>
          <Text
            style={{
              flex: 1,
              textAlign: 'right',
              paddingRight: 10,
              color: C.muted,
              fontSize: 7.5,
            }}
          >
            {l.label}
          </Text>
          <Text
            style={{
              width: 100,
              textAlign: 'right',
              paddingHorizontal: 6,
              color: C.muted,
              fontSize: 8,
            }}
          >
            {l.amount}
          </Text>
        </View>
      ))}
      <View style={[s.totRow, { marginTop: 5 }]}>
        <Text style={[s.totLabel, { color: tone }]}>{r.label.toUpperCase()}</Text>
        <Text
          style={[
            s.totCell,
            {
              color: tone,
              borderBottomColor: tone,
              fontFamily: 'Manrope',
              fontWeight: 700,
              fontSize: 10,
            },
          ]}
        >
          {r.amount}
        </Text>
      </View>
      {r.note ? (
        <Text
          style={{
            textAlign: 'right',
            color: tone,
            fontSize: 7.5,
            marginTop: 2,
            paddingRight: 6,
          }}
        >
          {r.note}
        </Text>
      ) : null}
    </View>
  );
}

function BankTable({ v }: { v: InvoiceView }) {
  const branch = v.bankRows.find((r) => r.label === 'Bank / branch');
  const rest = v.bankRows.filter((r) => r !== branch);
  return (
    <View style={s.bankTable}>
      {branch ? (
        <View style={{ flexDirection: 'row' }}>
          <Text style={s.bankLabel}>Bank Detail</Text>
          <Text style={s.bankValue}>{branch.value.toUpperCase()}</Text>
        </View>
      ) : null}
      {rest.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row' }}>
          <Text style={s.bankLabel}>{r.label === 'Account no.' ? 'Account no' : r.label === 'UPI' ? 'UPI ID' : r.label}</Text>
          <Text style={s.bankValue}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

export const Invoice: InvoiceTemplate = ({ view: v, assets }) => {
  const gstNote = v.terms[0] && /GST/i.test(v.terms[0]) ? v.terms[0] : '';
  const otherTerms = gstNote ? v.terms.slice(1) : v.terms;
  const showQr = Boolean(assets.qr && v.payment?.qr);
  // Bank details are payment instructions: only while a balance is due (`payment`), never on a paid or refund invoice.
  const showBank = Boolean(v.payment) && v.bankRows.length > 0;
  const lh = v.letterhead;
  return (
    <Document title={v.filenameTitle} author={lh.name} creator={lh.name} producer={lh.name}>
      <Page size="A4" style={s.iPage}>
        <Text
          fixed
          style={s.iRunHead}
          render={({ pageNumber }) => (pageNumber > 1 ? [lh.name?.toUpperCase(), `INVOICE ${v.invoiceNo}`].filter(Boolean).join(' | ') : '')}
        />
        <View style={s.body}>
          <TitleBlock title="INVOICE" name={lh.name} cancelled={v.cancelledPill} />

          <View style={{ flexDirection: 'row', gap: 24, paddingHorizontal: 6 }}>
            <View style={{ flex: 1 }}>
              <Field label="DATE:" value={v.invoiceDate} />
              <Field label="INVOICE #" value={v.invoiceNo} />
              <Field label="BOOKING #" value={v.bookingNo} />
              <Field label="CONTACT PERSON & NUMBER" value={contactLines(v)} accent />
            </View>
            <View style={{ flex: 1 }}>
              <ToBlock v={v} />
            </View>
          </View>

          {v.cancelledNote ? <Text style={{ color: C.danger, marginTop: 6, paddingHorizontal: 6 }}>{v.cancelledNote}</Text> : null}

          <View style={{ marginTop: 16 }}>
            <ItemGrid v={v} mark={assets.mark} />
          </View>

          <View
            style={{
              flexDirection: 'row',
              marginTop: 10,
              gap: 16,
              alignItems: 'flex-start',
            }}
            wrap={false}
          >
            <View style={{ flex: 1, paddingTop: 4 }}>
              <Text style={s.iLabel}>AMOUNT IN WORDS</Text>
              <Text style={{ fontWeight: 600, marginTop: 2 }}>{v.summary.inWords}</Text>
              {showQr ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <Image src={assets.qr!} style={{ width: 76, height: 76 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.iLabel, { fontSize: 7.5 }]}>PAY BY UPI</Text>
                    <Text style={{ fontWeight: 600, color: C.indigo }}>{v.payment!.qr!.caption}</Text>
                    {v.payment!.upiId ? <Text style={{ color: C.muted, fontSize: 7.5 }}>{v.payment!.upiId}</Text> : null}
                  </View>
                </View>
              ) : null}
            </View>
            <Totals v={v} />
          </View>

          {showBank || v.signature ? (
            <View style={{ flexDirection: 'row', marginTop: 14, gap: 18, alignItems: 'flex-end' }} wrap={false}>
              <View style={{ flex: 1 }}>{showBank ? <BankTable v={v} /> : null}</View>
              {v.signature ? <Signature sig={v.signature} /> : null}
            </View>
          ) : null}

          {gstNote || otherTerms.length > 0 ? (
            <View style={{ marginTop: 12 }} wrap={false}>
              {gstNote ? <Text style={{ color: C.indigo, fontSize: 8.5, marginBottom: 3 }}>Note: {gstNote}</Text> : null}
              {otherTerms.map((t, i) => (
                <View key={i} style={{ flexDirection: 'row' }}>
                  <Text style={{ width: 9, color: C.muted, fontSize: 7.5 }}>•</Text>
                  <Text style={{ flex: 1, color: C.muted, fontSize: 7.5 }}>{t}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Footer lh={lh} lines={[v.footer.join('  ·  ')]} />
      </Page>
    </Document>
  );
};
