/**
 * PDF documents (lazy chunk: @react-pdf/renderer, qrcode, templates, TTFs). Import this module only with
 * `import('../pdf')` — `bundleGuard` fails the build if the public entry or the admin routes chunk pulls it statically.
 */
export { prepareInvoice, prepareVoucher } from './prepare';
export type { PrepareData } from './prepare';
