/**
 * Firebase Auth for the admin. This folder is the only place that imports `firebase/auth`
 * (the public site never downloads it; `bundleGuard` in vite.config.ts enforces that).
 */
import type { FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from 'firebase/auth';
import { usesEmulator } from '../../lib/firebase';

const DEFAULT_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

let auth: Auth | undefined;

/** The admin's Auth instance (connected to the Auth emulator when VITE_USE_EMULATOR=true). */
export function getAdminAuth(app: FirebaseApp): Auth {
  if (auth) return auth;
  auth = getAuth(app);
  if (usesEmulator()) {
    const host = import.meta.env.VITE_AUTH_EMULATOR_HOST || DEFAULT_AUTH_EMULATOR_HOST;
    connectAuthEmulator(auth, `http://${host}`, { disableWarnings: true });
  }
  return auth;
}

/** Google popup sign-in, always showing the account chooser. */
export function signInWithGoogle(auth: Auth): Promise<unknown> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}
