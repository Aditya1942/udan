/** Shared "Premium" building blocks: serif text with glyph fallback, ornaments, header, running head, footer. */
import { Image, Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import type { ReactNode } from 'react';
import type { Letterhead } from '../../view';
import { c, M, s } from './styles';

type TextStyle = Style | Style[];
const list = (st?: TextStyle): Style[] => (Array.isArray(st) ? st : st ? [st] : []);

/** The built-in Times fonts only carry WinAnsi glyphs; anything else (₹, →, ✓…) falls back to Inter. */
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
const winAnsi = (ch: string) => {
  const n = ch.codePointAt(0)!;
  return (n >= 32 && n < 127) || (n >= 160 && n <= 255) || n === 10 || WIN_ANSI_EXTRA.has(ch);
};

/** Text in a serif (Times) face; non-WinAnsi runs are set in Inter so nothing prints as a missing glyph. */
export function Serif({ children, style, italic }: { children: string; style?: TextStyle; italic?: boolean }) {
  const runs: { text: string; ok: boolean }[] = [];
  for (const ch of children) {
    const ok = winAnsi(ch);
    const last = runs[runs.length - 1];
    if (last && last.ok === ok) last.text += ch;
    else runs.push({ text: ch, ok });
  }
  const styles = [italic ? s.italic : s.serif, ...list(style)];
  return (
    <Text style={styles}>
      {runs.map((r, i) =>
        r.ok ? (
          r.text
        ) : (
          <Text key={i} style={{ fontFamily: 'Inter', fontWeight: 400 }}>
            {r.text}
          </Text>
        ),
      )}
    </Text>
  );
}

export const Caps = ({ children, gold, style }: { children: ReactNode; gold?: boolean; style?: TextStyle }) => (
  <Text style={[s.caps, ...(gold ? [s.goldCaps] : []), ...list(style)]}>{children}</Text>
);

export const Diamond = ({ size = 4.5, colour = c.gold }: { size?: number; colour?: string }) => (
  <View style={{ width: size, height: size, backgroundColor: colour, transform: 'rotate(45deg)' }} />
);

/** Centred gold hairline — diamond — hairline. */
export const Ornament = ({ width = 56, style }: { width?: number; style?: TextStyle }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, ...list(style)]}>
    <View style={{ width, borderBottomWidth: 0.5, borderBottomColor: c.gold }} />
    <Diamond />
    <View style={{ width, borderBottomWidth: 0.5, borderBottomColor: c.gold }} />
  </View>
);

/** Italic serif section title followed by a gold hairline to the margin. */
export const SectionHead = ({ children, minPresenceAhead = 80 }: { children: string; minPresenceAhead?: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }} minPresenceAhead={minPresenceAhead} wrap={false}>
    <Serif italic style={{ fontSize: 15, color: c.deep, lineHeight: 1.25 }}>
      {children}
    </Serif>
    <View style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: c.gold, marginTop: 2 }} />
  </View>
);

const letterheadLines = (l: Letterhead) =>
  [l.address.join(', '), [...l.phones, l.email, l.website].filter(Boolean).join('  ·  ')].filter(Boolean);

/** Centred mark, letterhead, serif title, letter-spaced reference line, gold ornament. */
export function Header({
  mark,
  letterhead,
  title,
  meta,
  children,
}: {
  mark: string;
  letterhead: Letterhead;
  title: string;
  meta: string[];
  children?: ReactNode;
}) {
  const lines = letterheadLines(letterhead);
  return (
    <View style={{ alignItems: 'center' }}>
      <Image src={mark} style={{ height: 40, width: (40 * 241) / 284 }} />
      {letterhead.name ? (
        <Serif style={{ fontSize: 9, letterSpacing: 2, color: c.deep, marginTop: 6, textTransform: 'uppercase' }}>{letterhead.name}</Serif>
      ) : null}
      {lines.map((l, i) => (
        <Text key={i} style={{ fontSize: 7.5, color: c.muted, marginTop: i ? 0 : 2, textAlign: 'center', maxWidth: 420, lineHeight: 1.35 }}>
          {l}
        </Text>
      ))}
      <Serif style={{ fontSize: 28, color: c.deep, marginTop: 12, lineHeight: 1.15, textAlign: 'center' }}>{title}</Serif>
      {children}
      {meta.length > 0 ? (
        <Text style={[s.caps, { marginTop: 6, letterSpacing: 1.2, textAlign: 'center' }]}>{meta.filter(Boolean).join('   ·   ')}</Text>
      ) : null}
      <Ornament style={{ marginTop: 8 }} />
    </View>
  );
}

/** Small running head on pages 2+ (absolute, in the top margin). */
export const RunningHead = ({ left, right }: { left: string; right: string }) => (
  <View
    fixed
    style={{ position: 'absolute', top: 24, left: M, right: M }}
    render={({ pageNumber }) =>
      pageNumber > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: c.goldSoft, paddingBottom: 4 }}>
          <Text style={s.caps}>{left}</Text>
          <Text style={s.caps}>{right}</Text>
        </View>
      ) : null
    }
  />
);

/** Fixed footer: gold ornament, centred lines, page x of y. */
export const Footer = ({ lines }: { lines: string[] }) => (
  // `bottom` positioning doesn't render for this fixed block in react-pdf 4.9, so it is placed from the top.
  <View fixed style={{ position: 'absolute', top: 842 - 24 - 24 - 10 * lines.length, left: M, right: M, alignItems: 'center' }}>
    <Ornament width={36} />
    {lines.map((l, i) => (
      <Text key={i} style={{ fontSize: 7.5, color: c.muted, textAlign: 'center', marginTop: i === 0 ? 4 : 2, lineHeight: 1.35 }}>
        {l}
      </Text>
    ))}
    <Text style={[s.caps, { fontSize: 6, color: c.muted, marginTop: 4 }]} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
  </View>
);

/** Label (caps) over value. */
export const Field = ({ label, children, style }: { label: string; children: ReactNode; style?: TextStyle }) => (
  <View style={style}>
    <Caps>{label}</Caps>
    {children}
  </View>
);
