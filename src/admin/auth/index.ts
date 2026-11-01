/** Admin auth: Google sign-in + `config/admins` allow-list. The only importer of `firebase/auth`. */
export { getAdminAuth, signInWithGoogle } from './firebaseAuth';
export { ADMIN_HOME, LOGIN_PATH, loginPathFor, safeNext } from './next';
export {
  AdminSessionProvider,
  CHECK_FAILED_MESSAGE,
  DENIED_MESSAGE,
  POPUP_BLOCKED_MESSAGE,
  SIGN_IN_FAILED_MESSAGE,
  useAdminSession,
} from './session';
export type { AdminSession, AdminSessionProviderProps, AdminSessionStatus, AdminUser } from './session';
