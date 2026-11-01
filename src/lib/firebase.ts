/**
 * Firebase app + Firestore, created on first use from VITE_FIREBASE_* env vars.
 * Import this module lazily (dynamic import) so the Firebase SDK stays out of the main bundle.
 *
 * - Missing config → getDb() returns null; callers show a graceful fallback instead of crashing.
 * - VITE_USE_EMULATOR=true → Firestore connects to the local emulator (project defaults to demo-udan).
 * - VITE_RECAPTCHA_ENTERPRISE_SITE_KEY set (and not on the emulator) → App Check is initialised.
 */
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

type Env = ImportMetaEnv;

export const EMULATOR_PROJECT_ID = 'demo-udan';
const DEFAULT_EMULATOR_HOST = '127.0.0.1:8080';

export function usesEmulator(env: Env = import.meta.env): boolean {
  return env.VITE_USE_EMULATOR === 'true';
}

/** Firebase options from env, or null when the site isn't configured. */
export function readFirebaseOptions(env: Env = import.meta.env): FirebaseOptions | null {
  const value = (v: string | undefined) => v?.trim() || undefined;
  const options: FirebaseOptions = {
    apiKey: value(env.VITE_FIREBASE_API_KEY),
    authDomain: value(env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: value(env.VITE_FIREBASE_PROJECT_ID),
    storageBucket: value(env.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: value(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    appId: value(env.VITE_FIREBASE_APP_ID),
  };
  if (usesEmulator(env)) {
    const projectId = options.projectId ?? EMULATOR_PROJECT_ID;
    return {
      ...options,
      apiKey: options.apiKey ?? 'demo-api-key',
      projectId,
      authDomain: options.authDomain ?? `${projectId}.firebaseapp.com`,
    };
  }
  return options.apiKey && options.projectId && options.appId ? options : null;
}

let app: FirebaseApp | null | undefined;
let db: Firestore | null | undefined;

/** The shared Firebase app, or null when not configured. */
export function getFirebaseApp(): FirebaseApp | null {
  if (app !== undefined) return app;
  const options = readFirebaseOptions();
  if (!options) {
    if (import.meta.env.DEV) console.warn('[firebase] VITE_FIREBASE_* not set; online enquiries are disabled.');
    return (app = null);
  }
  app = getApps().length ? getApp() : initializeApp(options);

  const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY?.trim();
  if (siteKey && !usesEmulator()) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  return app;
}

/** The shared Firestore instance, or null when not configured. */
export function getDb(): Firestore | null {
  if (db !== undefined) return db;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return (db = null);
  db = getFirestore(firebaseApp);
  if (usesEmulator()) {
    const [host, port] = (import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || DEFAULT_EMULATOR_HOST).split(':');
    connectFirestoreEmulator(db, host, Number(port));
  }
  return db;
}
