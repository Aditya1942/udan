/** "Premium" palette and styles: luxury travel stationery (serif display, letter-spaced caps, gold hairlines). */
import { StyleSheet } from '@react-pdf/renderer';
import type { Tone } from '../../view';

export const c = {
  teal: '#165d79',
  deep: '#0f4a61',
  gold: '#a6834b', // structural gold for hairlines and borders (>= 3.2:1 contrast on white and cream)
  goldText: '#8c6b38', // typographic gold for labels and numerals (>= 4.6:1 contrast on white and cream)
  goldSoft: '#e6dac4',
  cream: '#fbf8f2',
  ink: '#253238',
  muted: '#5b686d',
  faint: '#68767b', // >= 4.6:1 contrast on white and cream
  hair: '#e8e2d7',
  danger: '#b42318',
  warn: '#8a5300',
  action: '#4a7f19',
} as const;

export const toneColour: Record<Tone, string> = { danger: c.danger, warn: c.warn, action: c.action };

/** Side margin (pt). */
export const M = 56;

export const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: c.ink,
    paddingTop: 56,
    paddingBottom: 80,
    paddingHorizontal: M,
    backgroundColor: '#ffffff',
  },
  serif: { fontFamily: 'Times-Roman' },
  italic: { fontFamily: 'Times-Italic' },
  /** Letter-spaced small caps label. */
  caps: { fontFamily: 'Inter', fontWeight: 600, fontSize: 6, letterSpacing: 1.2, textTransform: 'uppercase', color: c.muted, lineHeight: 1.35 },
  goldCaps: { color: c.goldText },
  money: { fontFamily: 'Manrope', fontWeight: 600 },
  muted: { color: c.muted },
  row: { flexDirection: 'row' },
  right: { textAlign: 'right' },
  hair: { borderBottomWidth: 0.5, borderBottomColor: c.hair },
  goldHair: { borderBottomWidth: 0.5, borderBottomColor: c.gold },
  struck: { textDecoration: 'line-through', color: c.faint },
  section: { marginTop: 24 },
  gap: { height: 24 },
  leader: { borderBottomWidth: 0.75, borderBottomColor: '#c9b38c', borderBottomStyle: 'dotted' },
});
