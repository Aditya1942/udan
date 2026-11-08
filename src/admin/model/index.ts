/**
 * Admin model: pure TypeScript (no Firestore, no React). Money and counting rules, flags,
 * IST date/FY helpers, numbering, document naming, validation and dashboard aggregations.
 */
export * from './types';
export * from './dates';
export * from './category';
export * from './money';
export * from './counting';
export * from './flags';
export * from './numbering';
export * from './documents';
export * from './messages';
export * from './business';
export * from './enquiry';
export * from './validate';
export * from './dashboard';

/** A new id for a Service Line or payment entry. */
export function newId(): string {
  return crypto.randomUUID();
}
