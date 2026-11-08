/**
 * "Ledger" family — shared styles and ruled-box primitives. One 0.75pt ink frame per page (fixed), sections
 * stacked inside it and divided by full-width rules; tables carry full vertical + horizontal rules.
 * Helvetica only for fixed labels we write ourselves (it lacks ₹ and →); every data value prints in Inter.
 */
import { Image, StyleSheet, Text, View } from '@react-pdf/renderer';
type Style = NonNullable<Parameters<typeof StyleSheet.create>[0]>[string];
import { Children, type ReactNode } from 'react';
import { colour } from '../../theme';
import type { Letterhead, Pair, Tone } from '../../view';

export const INK = colour.ink;
export const MUTED = colour.muted;
export const TEAL = colour.teal;
export const RED = '#b42318';
export const AMBER = '#8a5300';
export const GREEN = '#4a7f19';
export const FILL = '#eef1f1';
export const HIGHLIGHT = '#f6f7f7';
export const toneColour: Record<Tone, string> = {
  danger: RED,
  warn: AMBER,
  action: GREEN,
};

const PT = 30; // frame top
const PB = 36; // frame bottom
const PX = 28; // frame sides
export const RULE = 0.5;

export const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 8.5,
    color: INK,
    lineHeight: 1.35,
    paddingTop: PT,
    paddingBottom: PB,
    paddingHorizontal: PX,
  },
  frame: {
    position: 'absolute',
    top: PT,
    bottom: PB,
    left: PX,
    right: PX,
    borderWidth: 0.75,
    borderColor: INK,
  },
  topStrip: {
    position: 'absolute',
    top: 14,
    left: PX,
    right: PX,
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: MUTED,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomStrip: { position: 'absolute', bottom: 14, left: PX, right: PX },
  stripText: {
    fontFamily: 'Inter',
    fontSize: 6.5,
    color: MUTED,
    lineHeight: 1.3,
  },

  section: { borderBottomWidth: 0.75, borderBottomColor: INK },
  row: { flexDirection: 'row' },
  lab: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    letterSpacing: 0.5,
    color: MUTED,
    textTransform: 'uppercase',
    lineHeight: 1.3,
  },
  caption: {
    backgroundColor: FILL,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderBottomWidth: RULE,
    borderBottomColor: INK,
  },
  captionText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    letterSpacing: 0.5,
    color: INK,
    textTransform: 'uppercase',
  },
  box: { paddingVertical: 5, paddingHorizontal: 7 },
  vr: { borderRightWidth: RULE, borderRightColor: INK },
  hr: { borderBottomWidth: RULE, borderBottomColor: INK },
  semi: { fontWeight: 600 },
  muted: { color: MUTED },
  small: { fontSize: 7.5 },
  right: { textAlign: 'right' },
  struck: { textDecoration: 'line-through', color: MUTED },

  // table
  th: { paddingVertical: 3, paddingHorizontal: 5, backgroundColor: FILL },
  thText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    letterSpacing: 0.4,
    color: INK,
    textTransform: 'uppercase',
  },
  td: { paddingVertical: 3, paddingHorizontal: 5 },

  // header
  name: {
    fontFamily: 'Manrope',
    fontWeight: 700,
    fontSize: 12,
    lineHeight: 1.2,
    textAlign: 'right',
    marginBottom: 1.5,
  },
  headLine: { fontSize: 7.5, color: INK, textAlign: 'right', lineHeight: 1.35 },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    letterSpacing: 3,
    color: TEAL,
    textAlign: 'center',
  },
  subTitle: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: MUTED,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  stamp: {
    position: 'absolute',
    right: 14,
    top: 8,
    borderWidth: 1.25,
    borderColor: RED,
    color: RED,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    letterSpacing: 1.5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    transform: 'rotate(-5deg)',
  },
});

/** Fixed page furniture: frame, running strip (page 2+), footer strip with page numbers. */
export function Furniture({ running, footer, danger }: { running: string; footer: string[]; danger?: string }) {
  return (
    <>
      <View fixed style={s.frame} />
      <View fixed style={s.topStrip}>
        <Text style={danger ? { color: RED, fontFamily: 'Helvetica-Bold' } : undefined}>{danger ?? ''}</Text>
        <Text
          fixed
          style={{ fontFamily: 'Inter' }}
          render={({ pageNumber, totalPages }) => `${pageNumber > 1 ? `${running} (continued)  ·  ` : ''}Page\u00a0${pageNumber}\u00a0of\u00a0${totalPages}`}
        />
      </View>
      <View fixed style={s.bottomStrip}>
        {footer.map((l, i) => (
          <Text key={i} style={s.stripText}>
            {l}
          </Text>
        ))}
      </View>
    </>
  );
}

/** Wordmark left; trading name, address, phones, email/website right-aligned. */
export function LetterheadBox({ lh, wordmark, compact }: { lh: Letterhead; wordmark: string; compact?: boolean }) {
  const web = [lh.email, lh.website].filter(Boolean).join('  ·  ');
  return (
    <View
      wrap={false}
      style={[
        s.section,
        s.row,
        {
          paddingVertical: 8,
          paddingHorizontal: 12,
          alignItems: 'center',
          gap: 16,
        },
      ]}
    >
      <Image src={wordmark} style={compact ? { width: 92, height: 29 } : { width: 128, height: 40.3 }} />
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        {lh.name ? <Text style={s.name}>{lh.name}</Text> : null}
        {(compact ? [] : lh.address).map((l, i) => (
          <Text key={i} style={s.headLine}>
            {l}
          </Text>
        ))}
        {lh.phones.length > 0 && (
          <Text style={s.headLine}>
            <Text style={[s.lab, { color: INK }]}>PHONE </Text>
            {lh.phones.join(' / ')}
          </Text>
        )}
        {web && !compact ? <Text style={s.headLine}>{web}</Text> : null}
      </View>
    </View>
  );
}

/** Centred title band, optional sub-caption and red outline stamp (`inline`: title left, stamp right, in flow). */
export function TitleBand({ title, sub, stamp, inline }: { title: string; sub?: string; stamp?: string; inline?: boolean }) {
  if (inline && stamp)
    return (
      <View
        wrap={false}
        style={[
          s.section,
          s.row,
          {
            paddingVertical: 7,
            paddingHorizontal: 12,
            minHeight: 32,
            alignItems: 'center',
            gap: 12,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { textAlign: 'left' }]}>{title}</Text>
          {sub ? <Text style={[s.subTitle, { textAlign: 'left' }]}>{sub}</Text> : null}
        </View>
        <Text style={[s.stamp, { position: 'relative', top: 0, right: 0 }]}>{stamp}</Text>
      </View>
    );
  return (
    <View wrap={false} style={[s.section, { paddingVertical: 7, minHeight: 32, justifyContent: 'center' }]}>
      <Text style={s.title}>{title}</Text>
      {sub ? <Text style={s.subTitle}>{sub}</Text> : null}
      {stamp ? <Text style={s.stamp}>{stamp}</Text> : null}
    </View>
  );
}

/** Grey caption bar heading a ruled section. */
export function Caption({ children, colour: c }: { children: string; colour?: string }) {
  return (
    <View style={s.caption} minPresenceAhead={36}>
      <Text style={[s.captionText, c ? { color: c } : {}]}>{children}</Text>
    </View>
  );
}

/** Label/value rows separated by thin rules (meta tables, bank details). */
export function KvTable({
  rows,
  labelWidth = 74,
  valueRight,
  last = true,
}: {
  rows: { label: string; value: ReactNode; colour?: string; bold?: boolean }[];
  labelWidth?: number;
  valueRight?: boolean;
  last?: boolean;
}) {
  return (
    <View>
      {rows.map((r, i) => (
        <View key={i} style={[s.row, i < rows.length - 1 || !last ? s.hr : {}]} wrap={false}>
          <View style={[s.td, s.vr, { width: labelWidth, justifyContent: 'center' }]}>
            <Text style={s.lab}>{r.label}</Text>
          </View>
          <View style={[s.td, { flex: 1 }]}>
            {typeof r.value === 'string' ? (
              <Text style={[valueRight ? s.right : {}, r.bold ? s.semi : {}, r.colour ? { color: r.colour } : {}]}>{r.value}</Text>
            ) : (
              r.value
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Label/value list without rules (inside a box). */
export function PairList({ rows, labelWidth = 56 }: { rows: Pair[]; labelWidth?: number }) {
  return (
    <View style={{ gap: 2 }}>
      {rows.map((r, i) => (
        <View key={i} style={s.row}>
          <Text style={[s.lab, { width: labelWidth, paddingTop: 1.5 }]}>{r.label}</Text>
          <Text style={{ flex: 1 }}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** A table cell: fixed width or flex, ruled on the right unless last. */
export function Td({
  w,
  flex,
  last,
  align,
  head,
  style,
  children,
}: {
  w?: number;
  flex?: number;
  last?: boolean;
  align?: 'right' | 'center';
  head?: boolean;
  style?: Style;
  children?: ReactNode;
}) {
  return (
    <View style={[head ? s.th : s.td, w ? { width: w } : { flex: flex ?? 1 }, last ? {} : s.vr, style ?? {}]}>
      {typeof children === 'string' ? <Text style={[head ? s.thText : {}, align ? { textAlign: align } : {}]}>{children}</Text> : children}
    </View>
  );
}

/** Signature box: "For <name>", signature image or blank space, rule, "Authorised Signatory". */
export function SignatureBox({
  name,
  signature,
  width = 200,
  ruledLeft = true,
}: {
  name?: string;
  signature?: { image: string; caption: string };
  width?: number;
  ruledLeft?: boolean;
}) {
  const forLine = signature?.caption ?? (name ? `For ${name}` : '');
  return (
    <View style={[s.box, { width, alignItems: 'center', justifyContent: 'space-between' }, ruledLeft ? { borderLeftWidth: RULE, borderLeftColor: INK } : {}]}>
      {forLine ? <Text style={[s.semi, s.small, { textAlign: 'center' }]}>{forLine}</Text> : <View />}
      {signature ? (
        <Image
          src={signature.image}
          style={{
            width: 110,
            height: 40,
            objectFit: 'contain',
            marginVertical: 4,
          }}
        />
      ) : (
        <View style={{ height: 44 }} />
      )}
      <View
        style={{
          borderTopWidth: RULE,
          borderTopColor: INK,
          alignSelf: 'stretch',
          paddingTop: 4,
        }}
      >
        <Text style={[s.lab, { textAlign: 'center', color: INK }]}>Authorised Signatory</Text>
      </View>
    </View>
  );
}

/** A ruled table section: caption + header + first row never split from each other; later rows break freely (or wrap={false} for small tables). */
export function Table({
  caption,
  head,
  wrap = true,
  children,
}: {
  caption?: string;
  head: ReactNode;
  wrap?: boolean;
  children: ReactNode;
}) {
  const rows = Children.toArray(children);
  if (!wrap) {
    return (
      <View style={s.section} wrap={false}>
        {caption ? <Caption>{caption}</Caption> : null}
        {head}
        {children}
      </View>
    );
  }
  return (
    <View style={s.section}>
      <View wrap={false}>
        {caption ? <Caption>{caption}</Caption> : null}
        {head}
        {rows[0]}
      </View>
      {rows.slice(1)}
    </View>
  );
}
