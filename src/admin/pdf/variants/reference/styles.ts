/** "Reference" family palette and shared styles: recreated from the owner's own hotel voucher and invoice #402. */
import { StyleSheet } from '@react-pdf/renderer';
import type { BookingCategory } from '../../../model';
import type { Tone } from '../../view';

export const C = {
  /* Voucher (hotel voucher reference) */
  navy: '#173f63',
  blue: '#1f6fa8',
  panel: '#e8f1f8',
  labelCell: '#eaf1f8',
  line: '#c5d5e4',
  issued: '#f3f7fb',
  /* Invoice (#402 reference) */
  indigo: '#5a5a96',
  rule: '#7fb5a0',
  tint: '#e6efe9',
  frame: '#2b2b3a',
  /* Shared */
  teal: '#165d79',
  ink: '#253238',
  muted: '#5b686d',
  danger: '#b42318',
  warn: '#8a5300',
  action: '#4a7f19',
  white: '#ffffff',
} as const;

export const toneColour: Record<Tone, string> = { danger: C.danger, action: C.action, warn: C.warn };

/** Category → the word used in voucher headers ("HOTEL VOUCHER", "TRAVEL VOUCHER"…). */
export const VOUCHER_WORD: Record<BookingCategory, string> = {
  Package: 'TRAVEL',
  Hotel: 'HOTEL',
  Flight: 'FLIGHT',
  Train: 'TRAIN',
  Bus: 'BUS',
  Visa: 'VISA',
  Passport: 'PASSPORT',
};

export const voucherTitle = (c: BookingCategory) =>
  c === 'Package'
    ? 'BOOKING CONFIRMATION VOUCHER'
    : c === 'Visa' || c === 'Passport'
      ? `${VOUCHER_WORD[c]} SERVICE CONFIRMATION VOUCHER`
      : `${VOUCHER_WORD[c]} BOOKING CONFIRMATION VOUCHER`;

export const s = StyleSheet.create({
  /** Content wrapper. No lineHeight on <Page> (it hides render() page numbers) or on Views (inherits wrongly). */
  body: {},
  /* ---------- voucher ---------- */
  vPage: { fontFamily: 'Inter', fontSize: 8.5, color: C.ink, paddingTop: 34, paddingBottom: 46, paddingHorizontal: 40 },
  runHead: {
    position: 'absolute',
    top: 16,
    right: 40,
    left: 40,
    textAlign: 'right',
    fontSize: 7,
    fontWeight: 600,
    color: C.blue,
    letterSpacing: 0.3,
  },
  vFoot: { position: 'absolute', bottom: 20, left: 40, right: 40, textAlign: 'center', fontSize: 7, color: C.muted },
  pageNo: { position: 'absolute', bottom: 20, left: 40, right: 40, textAlign: 'right', fontSize: 7, color: C.muted },
  lhBox: { flexDirection: 'row', borderWidth: 1, borderColor: C.navy, height: 104 },
  lhLeft: {
    width: '25%',
    backgroundColor: C.panel,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: C.navy,
  },
  lhRight: { flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  lhName: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 22, color: C.white, textAlign: 'center', lineHeight: 1.15 },
  lhSub: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: C.white, textAlign: 'center', marginTop: 8, letterSpacing: 0.4 },
  lhPhone: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: C.white, textAlign: 'center', marginTop: 4, letterSpacing: 0.4 },
  vTitle: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 16, color: C.navy, marginTop: 14, marginBottom: 9, marginLeft: 4 },
  strip: { flexDirection: 'row', borderTopWidth: 1, borderLeftWidth: 1, borderColor: C.line },
  stripCell: {
    flex: 1,
    backgroundColor: C.panel,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
    paddingVertical: 6,
    paddingHorizontal: 7,
  },
  stripLabel: { fontSize: 7.5, fontWeight: 600, color: C.navy, letterSpacing: 0.3 },
  stripValue: { fontSize: 8.5, fontWeight: 600, color: C.navy, marginTop: 2 },
  vH: { fontSize: 9.5, fontWeight: 600, color: C.blue, letterSpacing: 0.3, marginTop: 13, marginBottom: 5 },
  vSub: { fontSize: 7.5, fontWeight: 600, color: C.muted, letterSpacing: 0.4, marginBottom: 3 },
  kvTable: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: C.line },
  kvRow: { flexDirection: 'row' },
  kvLabel: {
    width: '32%',
    backgroundColor: C.labelCell,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
    paddingVertical: 3,
    paddingHorizontal: 7,
    fontWeight: 600,
    color: C.navy,
  },
  kvValue: { flex: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 3, paddingHorizontal: 7 },
  bullet: { flexDirection: 'row', marginBottom: 3 },
  bulletDot: { width: 10, color: C.blue, fontWeight: 600 },
  issuedBox: {
    flexDirection: 'row',
    backgroundColor: C.issued,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 16,
  },
  issuedText: { fontWeight: 600, color: C.navy, marginBottom: 1 },
  thanks: { textAlign: 'center', fontWeight: 600, color: C.blue, marginTop: 8, fontSize: 8.5 },

  /* ---------- invoice ---------- */
  iPage: { fontFamily: 'Inter', fontSize: 8.5, color: C.ink, paddingTop: 34, paddingBottom: 66, paddingHorizontal: 44 },
  iTitle: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 30, color: C.indigo, textAlign: 'center', lineHeight: 1.1 },
  iSub: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: C.indigo, textAlign: 'center', marginTop: 8, letterSpacing: 0.6 },
  iRule: { borderBottomWidth: 0.75, borderBottomColor: C.rule, marginTop: 8, marginBottom: 14 },
  iLabel: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 8, color: C.indigo, letterSpacing: 0.5 },
  iValue: { fontSize: 8.5, marginBottom: 6 },
  iTo: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 9.5, color: C.indigo, letterSpacing: 0.4, marginBottom: 4 },
  iBold: { fontWeight: 600, color: C.ink, marginBottom: 2 },
  pill: {
    fontSize: 8,
    fontWeight: 600,
    color: C.danger,
    borderWidth: 1,
    borderColor: C.danger,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    letterSpacing: 0.5,
  },
  gridHead: { flexDirection: 'row', paddingBottom: 3, borderBottomWidth: 0.75, borderBottomColor: C.rule },
  gridHeadText: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 8, color: C.indigo, letterSpacing: 0.5 },
  grid: {},
  gridRow: { flexDirection: 'row', minHeight: 19, borderLeftWidth: 0.75, borderLeftColor: C.rule },
  gridCell: { borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: C.rule, paddingVertical: 3, paddingHorizontal: 6 },
  struck: { textDecoration: 'line-through', color: C.muted },
  totRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  totLabel: {
    fontFamily: 'Manrope',
    fontWeight: 700,
    fontSize: 8.5,
    color: C.indigo,
    letterSpacing: 0.5,
    textAlign: 'right',
    paddingRight: 10,
    flex: 1,
  },
  totCell: {
    width: 100,
    backgroundColor: C.tint,
    borderBottomWidth: 1.25,
    borderBottomColor: C.rule,
    paddingVertical: 4,
    paddingHorizontal: 6,
    textAlign: 'right',
    fontWeight: 600,
  },
  bankTable: { borderTopWidth: 0.75, borderLeftWidth: 0.75, borderColor: C.frame },
  bankLabel: {
    width: '38%',
    borderRightWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: C.frame,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    fontFamily: 'Manrope',
    fontWeight: 700,
    color: C.indigo,
    letterSpacing: 0.2,
  },
  bankValue: {
    flex: 1,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: C.frame,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    fontWeight: 600,
  },
  iFoot: { position: 'absolute', bottom: 22, left: 44, right: 44, textAlign: 'center', fontSize: 7.5, color: C.indigo },
  iRunHead: { position: 'absolute', top: 16, left: 44, right: 44, textAlign: 'right', fontSize: 7, fontWeight: 600, color: C.indigo, letterSpacing: 0.3 },
  iPageNo: { position: 'absolute', bottom: 12, left: 44, right: 44, textAlign: 'right', fontSize: 7, color: C.muted },

  /* ---------- admin ---------- */
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: C.danger,
    color: C.white,
    paddingVertical: 5,
    paddingHorizontal: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    fontWeight: 600,
    letterSpacing: 0.6,
  },
  aH: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 9.5, color: C.indigo, letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  th: { fontFamily: 'Manrope', fontWeight: 700, fontSize: 7, color: C.indigo, letterSpacing: 0.3 },
});
