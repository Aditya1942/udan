/**
 * Test helpers for the Firestore emulator (Seams 1 and 2).
 * The emulator is started by `npm test` (firebase emulators:exec), which sets
 * FIRESTORE_EMULATOR_HOST; @firebase/rules-unit-testing discovers it from there.
 *
 * Give each test file its own `demo-*` project id: files run in parallel and
 * clearFirestore() only wipes that project.
 */
import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteApp, initializeApp } from 'firebase/app';
import { collection, connectFirestoreEmulator, getDocs, getFirestore, type Firestore } from 'firebase/firestore';
import rules from '../../firestore.rules?raw';

export { rules };

/** Rules test environment with the repo's firestore.rules loaded. */
export function createRulesEnv(projectId: string): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({ projectId, firestore: { rules } });
}

/** Modular Firestore from a context (rules-unit-testing returns the compat type). */
export function contextDb(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}

let appCount = 0;

/**
 * A plain web-SDK Firestore (like the site's) connected to the emulator, unauthenticated.
 * Call the returned `dispose` in afterAll.
 */
export function connectEmulatorDb(env: RulesTestEnvironment): { db: Firestore; dispose: () => Promise<void> } {
  const { host, port } = env.emulators.firestore ?? {};
  if (!host || !port) throw new Error('Firestore emulator not running. Use `npm test` or `npm run emulators`.');
  const app = initializeApp({ projectId: env.projectId, apiKey: 'demo-api-key' }, `emulator-${++appCount}`);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host, port);
  return { db, dispose: () => deleteApp(app) };
}

/** All docs in a collection, read with rules disabled (as the Firebase console would). */
export async function readAll(env: RulesTestEnvironment, path: string): Promise<Record<string, unknown>[]> {
  let docs: Record<string, unknown>[] = [];
  await env.withSecurityRulesDisabled(async (context) => {
    const snap = await getDocs(collection(contextDb(context), path));
    docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
  return docs;
}

/**
 * `env.clearFirestore()` with retries: under a full parallel run the emulator's DELETE endpoint sometimes answers
 * 500 UNKNOWN while another project's listeners are being torn down. Retrying is safe (clearing is idempotent).
 */
export async function clearFirestore(env: RulesTestEnvironment, attempts = 5): Promise<void> {
  for (let i = 1; ; i += 1) {
    try {
      await env.clearFirestore();
      return;
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 100 * i));
    }
  }
}
