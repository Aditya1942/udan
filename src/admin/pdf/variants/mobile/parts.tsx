/**
 * "Phone-first" shared pieces: a narrow 360×720 pt page (≈ a phone screen, so WhatsApp's PDF viewer shows it at
 * reading size), one column of stacked cards on a soft surface, a compact header and a tiny fixed footer.
 * Layout only — every value comes pre-formatted from the view-model.
 */
import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import type { ReactNode } from 'react';
import type { Pair, Tone } from '../../view';

export const PAGE_SIZE: [number, number] = [360, 720];

export const c = {
  teal: '#165d79',
  tealSoft: '#e3eef2',
  lime: '#7fb61c',
  action: '#4a7f19',
  actionSoft: '#f3f8ee',
  ink: '#253238',
  muted: '#5b686d',
  surface: '#f7f8f5',
  border: '#e1e7e2',
  white: '#ffffff',
  danger: '#b42318',
  dangerSoft: '#fcebe9',
  warn: '#8a5300',
  warnSoft: '#fcf3e3',
  amber: '#f5c06b',
  warnBorder: '#efd9b0',
  onDarkAction: '#a6d65a',
  onDarkDanger: '#ff9b8f',
} as const;

export const toneColour: Record<Tone, string> = {
  danger: c.danger,
  action: c.action,
  warn: c.warn,
};
export const toneSoft: Record<Tone, string> = {
  danger: c.dangerSoft,
  action: c.actionSoft,
  warn: c.warnSoft,
};
export const onDark: Record<Tone, string> = {
  action: c.onDarkAction,
  danger: c.onDarkDanger,
  warn: c.amber,
};

export const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: c.ink,
    backgroundColor: c.surface,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  h: { fontFamily: 'Manrope', fontWeight: 700, lineHeight: 1.25 },
  semi: { fontWeight: 600 },
  /** Multi-line copy (notes, terms, itinerary). */
  para: { lineHeight: 1.45 },
  /** Body-size paragraph (explicit fontSize: an inherited size + lineHeight renders far too loose). */
  body: { fontSize: 10.5, lineHeight: 1.45 },
  muted: { color: c.muted },
  small: { fontSize: 8.5, color: c.muted, lineHeight: 1.35 },
  card: {
    backgroundColor: c.white,
    borderRadius: 12,
    borderWidth: 0.75,
    borderColor: c.border,
    padding: 12,
    marginBottom: 8,
  },
  label: {
    fontSize: 8,
    fontWeight: 600,
    color: c.teal,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  row: { flexDirection: 'row' },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  divider: { borderTopWidth: 0.75, borderTopColor: c.border },
  struck: { textDecoration: 'line-through', color: c.muted },
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 20,
    right: 20,
    fontSize: 7.5,
    color: c.muted,
  },
});

/** The narrow page with the fixed `name · doc no.` + `n / N` footer. */
export function PhonePage({ children, footerLeft }: { children: ReactNode; footerLeft: string }) {
  return (
    <Page size={PAGE_SIZE} style={s.page}>
      {/* No lineHeight on the Page (or an ancestor View): in react-pdf 4.9 it drops `render` texts (page n/N) and
          inherited lineHeight compounds. Paragraph texts set their own (`s.para`). */}
      {children}
      <Text fixed style={[s.footer, { right: 70 }]}>
        {footerLeft}
      </Text>
      <Text
        fixed
        style={{
          position: 'absolute',
          bottom: 14,
          right: 20,
          width: 60,
          textAlign: 'right',
          fontSize: 7.5,
          color: c.muted,
        }}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </Page>
  );
}

/** Wordmark left; title, number and a meta line right. */
export function Header({ wordmark, title, lines, pill }: { wordmark: string; title: string; lines: string[]; pill?: ReactNode }) {
  return (
    <View style={[s.between, { alignItems: 'center', marginBottom: 12 }]}>
      <Image src={wordmark} style={{ width: 110, height: 34.6 }} />
      <View style={{ alignItems: 'flex-end', maxWidth: 180 }}>
        <View style={[s.row, { alignItems: 'center', gap: 6 }]}>
          {pill}
          <Text style={[s.h, { fontSize: 16 }]}>{title}</Text>
        </View>
        {lines.filter(Boolean).map((l, i) => (
          <Text
            key={i}
            style={[
              s.small,
              {
                textAlign: 'right',
                marginTop: i ? 0 : 2,
              },
            ]}
          >
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function Pill({
  children,
  colour = c.teal,
  bg = c.tealSoft,
  size = 8,
}: {
  children: ReactNode;
  colour?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontSize: size,
          fontWeight: 600,
          color: colour,
          lineHeight: 1.25,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

/** A white card with an optional small caps label. `wrap={false}` by default: cards never split across pages. */
export function Card({ label, children, wrap = false, style }: { label?: string; children: ReactNode; wrap?: boolean; style?: Style }) {
  return (
    <View wrap={wrap} style={[s.card, style ?? {}]}>
      {label ? (
        <Text style={s.label} minPresenceAhead={40}>
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** Section title between stacked cards. */
export function Section({ children }: { children: string }) {
  return (
    <Text style={[s.h, { fontSize: 15, marginTop: 6, marginBottom: 8 }]} minPresenceAhead={90}>
      {children}
    </Text>
  );
}

/** Stacked label/value pairs (phone-friendly: label above value). */
export function Pairs({ rows, valueStyle }: { rows: Pair[]; valueStyle?: Style }) {
  return (
    <View>
      {rows.map((r, i) => (
        <View key={i} style={{ marginTop: i ? 6 : 0 }}>
          <Text style={[s.small, { marginBottom: 2 }]}>{r.label}</Text>
          <Text style={valueStyle ?? {}}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Label left, amount right; one tappable-looking row. */
export function MoneyRow({
  label,
  amount,
  colour,
  bold,
  muted,
  first,
}: {
  label: string;
  amount: string;
  colour?: string;
  bold?: boolean;
  muted?: boolean;
  first?: boolean;
}) {
  const text = [
    bold ? { fontFamily: 'Manrope', fontWeight: 700, fontSize: 12.5 } : {},
    muted ? s.muted : {},
    colour ? { color: colour } : {},
  ];
  return (
    <View wrap={false} style={[s.between, { paddingVertical: 6, gap: 8 }, first ? {} : s.divider]}>
      <Text style={[{ flex: 1 }, ...text]}>{label}</Text>
      <Text style={[{ textAlign: 'right' }, ...text]}>{amount}</Text>
    </View>
  );
}

/** Signature image + caption. */
export function Signature({ sig }: { sig: { image: string; caption: string } }) {
  return (
    <View style={{ marginTop: 12, alignItems: 'flex-start' }}>
      <Image
        src={sig.image}
        style={{
          width: 120,
          height: 46,
          objectFit: 'contain',
          objectPosition: 'left',
        }}
      />
      <Text style={[s.small, { marginTop: 2 }]}>{sig.caption}</Text>
    </View>
  );
}

/** Business identity (filled only) — "Issued by". */
export function IssuedBy({
  letterhead: l,
  signature,
  label = 'Issued by',
}: {
  letterhead: {
    name?: string;
    address: string[];
    phones: string[];
    email?: string;
    website?: string;
  };
  signature?: { image: string; caption: string };
  label?: string;
}) {
  const contact = [...l.phones, l.email, l.website].filter((x): x is string => Boolean(x));
  if (!l.name && !l.address.length && !contact.length && !signature) return null;
  return (
    <Card label={label}>
      {l.name ? <Text style={[s.h, { fontSize: 12.5 }]}>{l.name}</Text> : null}
      {l.address.map((a, i) => (
        <Text key={i} style={s.muted}>
          {a}
        </Text>
      ))}
      {contact.length ? (
        <View style={{ marginTop: 6 }}>
          {contact.map((x, i) => (
            <Text key={i} style={s.semi}>
              {x}
            </Text>
          ))}
        </View>
      ) : null}
      {signature ? <Signature sig={signature} /> : null}
    </Card>
  );
}

/** Centered closing lines after the last card. */
export function Closing({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <View wrap={false} style={{ marginTop: 2, marginBottom: 2 }}>
      {lines.map((l, i) => (
        <Text key={i} style={[s.small, { textAlign: 'center', lineHeight: 1.25 }]}>
          {l}
        </Text>
      ))}
    </View>
  );
}
