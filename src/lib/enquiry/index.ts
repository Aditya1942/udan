/** Pure parts of the Enquiry module (safe to import eagerly; no Firebase). */
export { LIMITS, normalisePhone, validateEnquiry } from './validation';
export type { EnquiryField, EnquiryInput, FieldErrors, ValidEnquiry, ValidationResult } from './validation';
export type { SubmitFailureReason, SubmitResult } from './submitInquiry';
