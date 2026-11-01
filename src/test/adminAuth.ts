/**
 * Test helpers for admin auth against the emulator: seed `config/admins` and build contexts
 * that look like Google sign-ins (see docs/specs/udan-admin.md, Testing Decisions, Seam 2).
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, type Firestore } from 'firebase/firestore';
import { contextDb } from './firestoreEmulator';

export const ADMIN_EMAIL = 'owner@example.com';
export const OTHER_ADMIN_EMAIL = 'partner@example.com';

export async function seedAdmins(env: RulesTestEnvironment, emails = [ADMIN_EMAIL, OTHER_ADMIN_EMAIL]): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(contextDb(context), 'config', 'admins'), { emails });
  });
}

type TokenOptions = NonNullable<Parameters<RulesTestEnvironment['authenticatedContext']>[1]>;
type SignInProvider = NonNullable<TokenOptions['firebase']>['sign_in_provider'];

export type TokenOverrides = { email?: string; email_verified?: boolean; provider?: SignInProvider };

/** A Firestore signed in as a Google account (admin by default). */
export function googleDb(
  env: RulesTestEnvironment,
  { email = ADMIN_EMAIL, email_verified = true, provider = 'google.com' }: TokenOverrides = {},
  uid = `uid-${email}-${provider}-${email_verified}`,
): Firestore {
  return contextDb(env.authenticatedContext(uid, { email, email_verified, firebase: { sign_in_provider: provider } }));
}

/** Write docs with rules disabled (fixtures). */
export async function seed(env: RulesTestEnvironment, docs: Record<string, Record<string, unknown>>): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = contextDb(context);
    for (const [path, data] of Object.entries(docs)) await setDoc(doc(db, path), data);
  });
}
