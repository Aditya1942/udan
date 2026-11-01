/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** "true" = connect Firestore (and admin Auth) to the local emulators (npm run emulators). */
  readonly VITE_USE_EMULATOR?: string;
  /** host:port of the Firestore emulator. Default 127.0.0.1:8080. */
  readonly VITE_FIRESTORE_EMULATOR_HOST?: string;
  /** host:port of the Auth emulator (admin sign-in). Default 127.0.0.1:9099. */
  readonly VITE_AUTH_EMULATOR_HOST?: string;
  /** Enables Firebase App Check (reCAPTCHA Enterprise) when set. Ignored on the emulator. */
  readonly VITE_RECAPTCHA_ENTERPRISE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
