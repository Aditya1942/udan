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
  setStatus,
  uncancelBooking,
  updateClientPayment,
  updateDmcPayment,
  updatePayment,
} from './bookings';
export type { BookingSectionPatch, CancelInput, CreateBookingOptions, CreatedBooking, InvoiceNumber, PaymentSide } from './bookings';
export { createClient, createDmc, deleteClient, deleteDmc, updateClient, updateDmc } from './directory';
export { deleteEnquiry, saveEnquiryNotes, setEnquiryStatus } from './enquiries';
export { getBusinessProfile, saveBusinessProfile } from './businessProfile';
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
