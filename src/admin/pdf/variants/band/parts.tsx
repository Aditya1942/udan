/**
 * "Brand band" building blocks: full-bleed colour header band, running continuation strip, fixed footer,
 * rounded cards, service-type pills and confirmation chips. Layout only — every value comes from the view-model.
 */
import { Circle, Image, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import type { ComponentProps, ReactNode } from 'react';

type Style = Exclude<ComponentProps<typeof View>['style'], undefined | unknown[]>;
import type { LineType } from '../../../model';
import type { Letterhead, Pair, Tone } from '../../view';

export const c = {
  teal: '#165d79',
  tealDeep: '#0f4a61',
  tealSoft: '#d7e6ec',
  lime: '#7fb61c',
  action: '#4a7f19',
  sky: '#29a9ca',
  ink: '#253238',
  muted: '#5b686d',
  faint: '#64737a',
  border: '#e1e7e2',
  surface: '#f7f8f5',
  travel: '#eff6e7',
  visa: '#eaf4f7',
  danger: '#b42318',
  dangerTint: '#fdeeec',
  warn: '#8a5300',
  warnTint: '#fff3dd',
  note: '#fff8e1',
  white: '#ffffff',
} as const;

export const toneColour: Record<Tone, string> = {
  danger: c.danger,
  action: c.action,
  warn: c.warn,
};
export const toneTint: Record<Tone, string> = {
  danger: c.dangerTint,
  action: c.travel,
  warn: c.warnTint,
};
export const toneBorder: Record<Tone, string> = {
  danger: '#f7c6c0',
  action: '#c4dea6',
  warn: '#ecc98a',
};

/** Page geometry: the band bleeds out of the padding with negative margins. */
const PAD_X = 36;
const PAD_TOP = 44;
const PAD_BOTTOM = 44;

export const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 8.5,
    color: c.ink,
    paddingTop: PAD_TOP,
    paddingBottom: PAD_BOTTOM,
    paddingHorizontal: PAD_X,
  },
  /** Body line height lives on a wrapper, not the Page: an inherited lineHeight blanks react-pdf `render` texts. */
  body: { fontSize: 8.5, lineHeight: 1.42 },
  row: { flexDirection: 'row' },
  h: { fontFamily: 'Manrope', fontWeight: 700, lineHeight: 1.2 },
  /** Inter 600 only for fixed labels and numbers: fontkit mis-shapes later Inter-SemiBold text once it has shaped a
   *  free-text arrow (→), so user-entered text is Inter 400 or Manrope. */
  semi: { fontWeight: 600 },
  muted: { color: c.muted },
  small: { fontSize: 7.5 },
  right: { textAlign: 'right' },
  label: {
    fontSize: 7,
    color: c.muted,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontWeight: 700,
    fontSize: 11,
    lineHeight: 1.25,
    color: c.tealDeep,
    marginTop: 12,
    marginBottom: 6,
  },
  card: {
    borderRadius: 8,
    borderWidth: 0.75,
    borderColor: c.border,
    backgroundColor: c.white,
    padding: 10,
  },
  cardSoft: { borderRadius: 8, backgroundColor: c.surface, padding: 10 },
  struck: { textDecoration: 'line-through', color: c.faint },
  th: {
    fontSize: 7,
    color: c.tealDeep,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  itin: { borderRadius: 8, backgroundColor: c.surface, padding: 10, borderLeftWidth: 3, borderLeftColor: c.lime },
  thRow: {
    flexDirection: 'row',
    backgroundColor: c.visa,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
});

/** Zebra row background. */
export const zebra = (i: number) => (i % 2 === 1 ? { backgroundColor: c.surface } : {});

export function Label({ children, style }: { children: ReactNode; style?: Style }) {
  return <Text style={style ? [s.label, style] : s.label}>{children}</Text>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={s.sectionTitle} minPresenceAhead={60}>
      {children}
    </Text>
  );
}

/** Keeps a section title + table header on the same page as the first row (rows are `wrap={false}` elements). */
export function Table({ title, header, rows }: { title?: string; header: ReactNode; rows: ReactNode[] }) {
  return (
    <View style={{ marginTop: title ? 0 : 4 }}>
      <View wrap={false}>
        {title ? <Text style={s.sectionTitle}>{title}</Text> : null}
        {header}
        {rows[0]}
      </View>
      {rows.slice(1)}
    </View>
  );
}

/** Small solid pill (CANCELLED, INTERNAL, status). */
export function Pill({ children, bg, fg = c.white, border }: { children: ReactNode; bg: string; fg?: string; border?: string }) {
  return (
    <Text
      style={{
        fontSize: 7,
        fontWeight: 600,
        letterSpacing: 0.5,
        color: fg,
        backgroundColor: bg,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingTop: 3,
        paddingBottom: 2,
        ...(border ? { borderWidth: 0.75, borderColor: border } : {}),
      }}
    >
      {children}
    </Text>
  );
}

const TYPE_COLOUR: Partial<Record<LineType, string>> = {
  Hotel: c.teal,
  Flight: '#167a97',
  Transfer: '#477b16',
  Sightseeing: '#4d770e',
  Visa: '#4b48b4',
  Passport: '#4b48b4',
};

export function TypePill({ type, faded }: { type: LineType; faded?: boolean }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <Text
        style={{
          fontSize: 7,
          fontWeight: 600,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: c.white,
          backgroundColor: TYPE_COLOUR[type] ?? '#5d6c71',
          borderRadius: 6,
          paddingHorizontal: 6,
          paddingTop: 2,
          paddingBottom: 1.5,
          opacity: faded ? 0.45 : 1,
        }}
      >
        {type}
      </Text>
    </View>
  );
}

export function ConfChip({ confirmation }: { confirmation: { text: string; pending: boolean } }) {
  const pending = confirmation.pending;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
      <Text
        style={{
          fontSize: 7,
          fontWeight: 600,
          color: pending ? c.warn : '#3d6c13',
          backgroundColor: pending ? c.warnTint : c.travel,
          borderWidth: 0.75,
          borderColor: pending ? toneBorder.warn : toneBorder.action,
          borderRadius: 6,
          paddingHorizontal: 6,
          paddingTop: 2,
          paddingBottom: 2,
          textAlign: 'right',
        }}
      >
        {confirmation.text}
      </Text>
    </View>
  );
}

/** Label/value rows (already filtered to filled values). */
export function Pairs({ rows, labelWidth = 56 }: { rows: Pair[]; labelWidth?: number }) {
  return (
    <View>
      {rows.map((r, i) => (
        <View key={i} style={[s.row, { marginTop: i ? 2.5 : 0 }]}>
          <Text style={[s.muted, s.small, { width: labelWidth, paddingTop: 0.5 }]}>{r.label}</Text>
          <Text style={{ flex: 1 }}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Full-bleed header band (first page only) + lime stripe. */
export function Band({
  colour,
  wordmark,
  title,
  pills,
  meta,
  letterhead,
}: {
  colour: string;
  wordmark: string;
  title: string;
  pills?: ReactNode;
  meta: string[];
  letterhead: Letterhead;
}) {
  const contact = [...letterhead.phones, letterhead.email, letterhead.website].filter(Boolean).join('  ·  ');
  return (
    <View
      style={{
        marginTop: -PAD_TOP,
        marginHorizontal: -PAD_X,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          backgroundColor: colour,
          minHeight: 104,
          paddingHorizontal: PAD_X,
          paddingTop: 14,
          paddingBottom: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ width: 260 }}>
          <View style={{ flexDirection: 'row' }}>
            <View
              style={{
                backgroundColor: c.white,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Image src={wordmark} style={{ width: 104, height: 32.75 }} />
            </View>
          </View>
          {letterhead.name || letterhead.address.length || contact ? (
            <View style={{ marginTop: 8 }}>
              {letterhead.name ? <Text style={{ color: c.white, fontWeight: 600, fontSize: 8.5 }}>{letterhead.name}</Text> : null}
              {letterhead.address.map((l, i) => (
                <Text key={i} style={{ color: c.tealSoft, fontSize: 7.5, marginTop: 1 }}>
                  {l}
                </Text>
              ))}
              {contact ? <Text style={{ color: c.tealSoft, fontSize: 7.5, marginTop: 1 }}>{contact}</Text> : null}
            </View>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', maxWidth: 240 }}>
          {pills ? <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>{pills}</View> : null}
          <Text style={[s.h, { color: c.white, fontSize: 24 }]}>{title}</Text>
          <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
            {meta.filter(Boolean).map((m, i) => (
              <Text
                key={i}
                style={{
                  color: c.tealSoft,
                  fontSize: 8.5,
                  textAlign: 'right',
                  fontWeight: i === 0 ? 600 : 400,
                  marginTop: i ? 1 : 0,
                }}
              >
                {m}
              </Text>
            ))}
          </View>
        </View>
      </View>
      <View style={{ height: 4, backgroundColor: c.lime }} />
    </View>
  );
}

/**
 * Slim running strip on every page; on page 1 the Band (later in the tree, so painted on top) covers it.
 * Must be placed before <Band>.
 */
export function RunningHead({ colour, text }: { colour: string; text: string }) {
  return (
    <View fixed style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      <View
        style={{
          backgroundColor: colour,
          height: 24,
          paddingHorizontal: PAD_X,
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: c.white, fontSize: 7.5, fontWeight: 600 }} render={({ pageNumber }) => (pageNumber > 1 ? text : '')} />
      </View>
      <View style={{ height: 2, backgroundColor: c.lime }} />
    </View>
  );
}

export function Footer({ lines }: { lines: string[] }) {
  return (
    <>
      <View
        fixed
        style={{
          position: 'absolute',
          bottom: 16,
          left: PAD_X,
          right: PAD_X,
          borderTopWidth: 0.75,
          borderTopColor: c.border,
          paddingTop: 6,
          paddingRight: 80,
        }}
      >
        {lines.map((l, i) => (
          <Text key={i} style={{ fontSize: 7, color: c.muted, lineHeight: 1.3 }}>
            {l}
          </Text>
        ))}
      </View>
      <Text
        fixed
        style={{
          position: 'absolute',
          bottom: 16,
          right: PAD_X,
          width: 80,
          textAlign: 'right',
          fontSize: 7,
          color: c.muted,
          fontWeight: 600,
        }}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </>
  );
}

/** Small round check icon (good-to-know bullets). */
export function CheckIcon({ colour = c.lime }: { colour?: string }) {
  return (
    <Svg width={10} height={10} viewBox="0 0 10 10">
      <Circle cx={5} cy={5} r={5} fill={colour} />
      <Path d="M2.8 5.2 L4.4 6.7 L7.2 3.6" stroke={c.white} strokeWidth={1.2} fill="none" />
    </Svg>
  );
}

/** Small signature block, right-aligned. */
export function Signature({ signature }: { signature?: { image: string; caption: string } }) {
  if (!signature) return null;
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Image src={signature.image} style={{ width: 100, height: 32, objectFit: 'contain' }} />
      <View
        style={{
          borderTopWidth: 0.75,
          borderTopColor: c.border,
          marginTop: 4,
          paddingTop: 4,
          minWidth: 110,
        }}
      >
        <Text style={[s.small, s.muted, s.right]}>{signature.caption}</Text>
      </View>
    </View>
  );
}
