/**
 * "Ticket" family primitives: e-ticket / boarding-pass language. Rounded ticket cards split by a dashed perforation
 * with half-circle notches, tracked small-caps labels, Courier for codes/IDs only (Courier lacks ₹: never money).
 */
import { Image, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import type { Style } from '@react-pdf/types';
import type { Tone } from '../../view';

export const c = {
  teal: '#165d79',
  tealSoft: '#e4eff3',
  sky: '#0e7490',
  skySoft: '#e6f5fa',
  ink: '#253238',
  muted: '#5b686d',
  faint: '#66757a',
  line: '#c9d4d8',
  hair: '#e3e9eb',
  surface: '#f5f8f9',
  white: '#ffffff',
  danger: '#b42318',
  dangerSoft: '#fdeeec',
  warn: '#8a5300',
  warnSoft: '#fdf4e3',
  action: '#4a7f19',
  actionSoft: '#eef5e6',
} as const;

export const toneColour: Record<Tone, string> = { danger: c.danger, warn: c.warn, action: c.action };
export const toneSoft: Record<Tone, string> = { danger: c.dangerSoft, warn: c.warnSoft, action: c.actionSoft };

export const PAD_X = 36;
export const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 8.5, color: c.ink, lineHeight: 1.4, paddingTop: 72, paddingBottom: 48, paddingHorizontal: PAD_X },
  row: { flexDirection: 'row' },
  h: { fontFamily: 'Manrope', fontWeight: 700, lineHeight: 1.25 },
  semi: { fontWeight: 600 },
  muted: { color: c.muted },
  right: { textAlign: 'right' },
  label: { fontSize: 6.5, fontWeight: 600, letterSpacing: 1.1, color: c.muted, textTransform: 'uppercase', lineHeight: 1.3 },
  mono: { fontFamily: 'Courier' },
  monoB: { fontFamily: 'Courier-Bold' },
  card: { borderWidth: 1, borderColor: c.line, borderRadius: 9, backgroundColor: c.white },
  section: { marginTop: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  struck: { textDecoration: 'line-through', color: c.faint },
});

/** Tracked small-caps label. */
export function Label({ children, color, style }: { children: ReactNode; color?: string; style?: Style }) {
  return <Text style={[s.label, color ? { color } : {}, style ?? {}]}>{children}</Text>;
}

/** Courier code in an outlined (or filled) badge. Codes/IDs only. */
export function Badge({ children, color = c.ink, filled = false, size = 7.5 }: { children: ReactNode; color?: string; filled?: boolean; size?: number }) {
  return (
    <View style={{ borderWidth: 1, borderColor: color, borderRadius: 3, paddingHorizontal: 5, paddingTop: 2, paddingBottom: 1.5, backgroundColor: filled ? color : undefined }}>
      <Text style={[s.monoB, { fontSize: size, color: filled ? c.white : color, lineHeight: 1.1 }]}>{children}</Text>
    </View>
  );
}

const R = 6;

/** Half-circle bite on a card edge, centred on the card border. `at` = offset along the edge (from right or top). */
export function Notch({ edge, at, colour = c.line }: { edge: 'top' | 'bottom' | 'left' | 'right'; at: number; colour?: string }) {
  const circle: Style = { position: 'absolute', width: 2 * R, height: 2 * R, borderRadius: R, borderWidth: 1, borderColor: colour, backgroundColor: c.white };
  const cover: Style = { position: 'absolute', backgroundColor: c.white };
  if (edge === 'top' || edge === 'bottom') {
    const y = -R - 0.5;
    const pos: Style = edge === 'top' ? { top: y } : { bottom: y };
    const cpos: Style = edge === 'top' ? { top: y - 2, height: R + 1.5 } : { bottom: y - 2, height: R + 1.5 };
    return (
      <>
        <View style={[circle, pos, { right: at - R }]} />
        <View style={[cover, cpos, { right: at - R - 1, width: 2 * R + 2 }]} />
      </>
    );
  }
  const x = -R - 0.5;
  const pos: Style = edge === 'left' ? { left: x } : { right: x };
  const cpos: Style = edge === 'left' ? { left: x - 2, width: R + 1.5 } : { right: x - 2, width: R + 1.5 };
  return (
    <>
      <View style={[circle, pos, { top: at - R }]} />
      <View style={[cover, cpos, { top: at - R - 1, height: 2 * R + 2 }]} />
    </>
  );
}

/**
 * A ticket: main part + stub on the right, split by a vertical dashed perforation with notches top and bottom.
 * `accent` paints a thin bar on the main part's left edge.
 */
export function Ticket({
  children,
  stub,
  stubWidth = 150,
  accent,
  stubBg,
  border = c.line,
  wrap = false,
  style,
  pad = 10,
}: {
  children: ReactNode;
  stub?: ReactNode;
  stubWidth?: number;
  accent?: string;
  stubBg?: string;
  border?: string;
  wrap?: boolean;
  style?: Style;
  pad?: number;
}) {
  return (
    <View wrap={wrap} style={[s.card, { borderColor: border, flexDirection: 'row' }, style ?? {}]}>
      {accent ? <View style={{ width: 4, backgroundColor: accent, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }} /> : null}
      <View style={{ flex: 1, paddingVertical: pad, paddingHorizontal: 12 }}>{children}</View>
      {stub ? (
        <View
          style={{
            width: stubWidth,
            borderLeftWidth: 1,
            borderLeftStyle: 'dashed',
            borderLeftColor: border,
            paddingVertical: pad,
            paddingHorizontal: 12,
            backgroundColor: stubBg,
            borderTopRightRadius: 8,
            borderBottomRightRadius: 8,
          }}
        >
          {stub}
        </View>
      ) : null}
      {stub ? (
        <>
          <Notch edge="top" at={stubWidth} colour={border} />
          <Notch edge="bottom" at={stubWidth} colour={border} />
        </>
      ) : null}
    </View>
  );
}

/** Label over a value; omitted by callers when the value is empty. */
export function Field({ label, children, style }: { label: string; children: ReactNode; style?: Style }) {
  return (
    <View style={style}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

/** Long unbroken values (emails, URLs) can't wrap (hyphenation is off): render them as chunks that wrap after @ . / - _
 *  Only for single tokens: text with spaces wraps normally, and chunking it into a flex row overlaps lines. */
export function Wrappable({ text, style }: { text: string; style?: Style }) {
  const chunks = /\s/.test(text) || text.length < 26 ? [text] : text.split(/(?<=[@./\-_])/);
  if (chunks.length <= 1) return <Text style={[{ flex: 1 }, style ?? {}]}>{text}</Text>;
  return (
    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
      {chunks.map((ch, i) => (
        <Text key={i} style={style}>
          {ch}
        </Text>
      ))}
    </View>
  );
}

/** Compact strip repeated on every page: wordmark · document type · code badge · meta. */
export function HeaderStrip({
  wordmark,
  title,
  code,
  meta,
  badge,
  accent = c.teal,
  top = 22,
}: {
  wordmark: string;
  title: string;
  code?: string;
  meta: string[];
  badge?: ReactNode;
  accent?: string;
  top?: number;
}) {
  return (
    <View fixed style={{ position: 'absolute', top, left: PAD_X, right: PAD_X }}>
      <View style={[s.row, { alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1.5, borderBottomColor: accent }]}>
        <View style={[s.row, { alignItems: 'center', gap: 10 }]}>
          <Image src={wordmark} style={{ width: 92, height: 29 }} />
          <View style={{ width: 1, height: 22, backgroundColor: c.line }} />
          <Text style={[s.h, { fontSize: 13, letterSpacing: 1.6, color: accent }]}>{title}</Text>
          {badge}
        </View>
        <View style={[s.row, { alignItems: 'center', gap: 8 }]}>
          <View style={{ alignItems: 'flex-end' }}>
            {meta.filter(Boolean).map((m, i) => (
              <Text key={i} style={{ fontSize: 7.5, color: c.muted, lineHeight: 1.35 }}>
                {m}
              </Text>
            ))}
          </View>
          {code ? <Badge size={9}>{code}</Badge> : null}
        </View>
      </View>
    </View>
  );
}

/** Fixed footer: lines + page counter in Courier. */
export function Footer({ lines }: { lines: string[] }) {
  return (
    <>
      <View fixed style={{ position: 'absolute', bottom: 18, left: PAD_X, right: PAD_X, borderTopWidth: 0.75, borderTopColor: c.hair, paddingTop: 6, paddingRight: 90 }}>
        {lines.filter(Boolean).map((l, i) => (
          <Text key={i} style={{ fontSize: 7.5, color: c.muted, lineHeight: 1.35 }}>
            {l}
          </Text>
        ))}
      </View>
      <Text
        fixed
        style={{ position: 'absolute', top: 814, right: PAD_X, width: 80, fontSize: 7.5, color: c.muted, textAlign: 'right', fontFamily: 'Courier' }}
        render={({ pageNumber, totalPages }) => `PAGE ${pageNumber}/${totalPages}`}
      />
    </>
  );
}

/** A rotated rubber-stamp word (VOID, PAID…). */
export function Stamp({ text, colour, size = 18, rotate = -12, style }: { text: string; colour: string; size?: number; rotate?: number; style?: Style }) {
  return (
    <View style={[{ transform: `rotate(${rotate}deg)`, borderWidth: 2, borderColor: colour, borderRadius: 4, paddingHorizontal: 8, paddingTop: 3, paddingBottom: 1, opacity: 0.9 }, style ?? {}]}>
      <Text style={[s.monoB, { fontSize: size, color: colour, letterSpacing: 2, lineHeight: 1.1 }]}>{text}</Text>
    </View>
  );
}

/** Confirmation code sized to fit the stub. */
export function ConfCode({ text, pending, width = 120 }: { text: string; pending: boolean; width?: number }) {
  if (pending)
    return (
      <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: c.warn, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 3, backgroundColor: c.warnSoft, alignSelf: 'flex-start' }}>
        <Text style={{ fontSize: 7.5, fontWeight: 600, letterSpacing: 0.8, color: c.warn }}>TO BE CONFIRMED</Text>
      </View>
    );
  const perChar = 0.6; // Courier advance width per pt
  const size = Math.max(9, Math.min(17, width / (perChar * Math.max(text.length, 1))));
  return <Text style={[s.monoB, { fontSize: size, lineHeight: 1.15, color: c.ink }]}>{text}</Text>;
}
