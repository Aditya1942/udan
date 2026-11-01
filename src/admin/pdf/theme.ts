/** PDF palette, base styles and font registration (static TTFs; react-pdf can't use the site's variable WOFF2). */
import { Font, StyleSheet } from '@react-pdf/renderer';

/** Site palette (src/styles/tokens.css) as plain hex for react-pdf. */
export const colour = {
  teal: '#165d79',
  tealSoft: '#d7e6ec',
  action: '#4a7f19',
  ink: '#253238',
  muted: '#5b686d',
  border: '#e1e7e2',
  surface: '#f7f8f5',
  danger: '#b42318',
  warn: '#8a5300',
} as const;

export type FontFiles = { interRegular: string; interSemiBold: string; manropeSemiBold: string; manropeBold: string };

/** Fonts + wordmark image. The browser passes asset URLs (`./assets`); the sample renderer passes file paths. */
export type PdfAssets = { fonts: FontFiles; wordmark: string };

let registered = false;

/** Registers Inter (400/600) and Manrope (600/700) once, and turns hyphenation off. */
export function registerFonts(fonts: FontFiles): void {
  if (registered) return;
  Font.register({
    family: 'Inter',
    fonts: [
      { src: fonts.interRegular, fontWeight: 400 },
      { src: fonts.interSemiBold, fontWeight: 600 },
    ],
  });
  Font.register({
    family: 'Manrope',
    fonts: [
      { src: fonts.manropeSemiBold, fontWeight: 600 },
      { src: fonts.manropeBold, fontWeight: 700 },
    ],
  });
  // No hyphenation: react-pdf otherwise splits words at odd places.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

/** Shared by both documents: A4, Inter 9pt body, Manrope headings, the "Minimal letter" frame. */
export const base = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 9, color: colour.ink, lineHeight: 1.45, paddingTop: 44, paddingBottom: 56, paddingHorizontal: 48 },
  h: { fontFamily: 'Manrope', fontWeight: 700, lineHeight: 1.25 },
  title: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 20, lineHeight: 1.2 },
  label: { fontSize: 7.5, color: colour.muted, marginBottom: 2 },
  muted: { color: colour.muted },
  semi: { fontWeight: 600 },
  right: { textAlign: 'right' },
  row: { flexDirection: 'row' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rule: { borderBottomWidth: 0.75, borderBottomColor: colour.border, marginVertical: 18 },
  wordmark: { width: 120 },
  footer: { position: 'absolute', bottom: 28, left: 48, right: 48, fontSize: 7, color: colour.muted, textAlign: 'center' },
});
