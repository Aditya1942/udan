/**
 * Admin data: Firestore access behind one interface. Every function takes a `Firestore`
 * (the app's from `src/lib/firebase.ts`, or the emulator in tests) and throws `AdminDataError`.
 */
export { AdminDataError, setPermissionDeniedHandler, toAdminDataError } from './errors';
export type { AdminDataErrorCode } from './errors';
export {
  BOOKING_SECTIONS,
  addClientPayment,
  addDmcPayment,
  addPayment,
  allocateInvoiceNo,
  cancelBooking,
  createBooking,
  deleteClientPayment,
  deleteDmcPayment,
  deletePayment,
  saveBookingSection,
  saveServiceSection,
  setStatus,
  uncancelBooking,
  updateClientPayment,
  updateDmcPayment,
  updatePayment,
} from './bookings';
export type {
  BookingSectionPatch,
  CancelInput,
  CreateBookingOptions,
  CreatedBooking,
  InvoiceNumber,
  PaymentSide,
  ServiceSectionPatch,
} from './bookings';
export { createClient, createDmc, deleteClient, deleteDmc, updateClient, updateDmc } from './directory';
export { deleteEnquiry, saveEnquiryNotes, setEnquiryStatus } from './enquiries';
export { getBusinessProfile, saveBusinessProfile } from './businessProfile';
export { DOCUMENTS_DOC, documentSettingsFromDoc, saveDocumentSettings, subscribeBusinessProfile, subscribeDocumentSettings } from './documentSettings';
export type { DocState } from './documentSettings';
export { disableShare, newShareToken, publishShare, readShare, shareUrl, subscribeActiveShares, syncShare } from './shares';
export type { PublishShareInput, ShareListState, ShareRecord } from './shares';
export { DocumentsProvider, useDocuments } from './DocumentsProvider';
export type { DocumentsContextValue } from './DocumentsProvider';
export { projectIdOf, readBackupCollections } from './backup';
export type { RawCollections } from './backup';
export { ADMIN_COLLECTION_NAMES, subscribeCollection } from './subscribe';
export type { AdminCollectionName, AdminCollections, CollectionState, CollectionStatus } from './subscribe';
export {
  AdminDataProvider,
  useAdminData,
  useAdminDb,
  useBookingByNo,
  useBookingRows,
  useBookings,
  useClients,
  useDmcs,
  useEnquiries,
  useNewEnquiryCount,
} from './AdminDataProvider';
export type { AdminDataContextValue, RowsState } from './AdminDataProvider';
