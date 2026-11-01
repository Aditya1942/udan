/**
 * Admin session: Google sign-in checked against the `config/admins` allow-list.
 *
 * - `loading` until Firebase Auth reports the first user, `checking` while `config/admins` is read
 *   (rules only let Admins read it, so a successful read = Admin), then `admin`.
 * - Read denied → best-effort `deleteUser` + `signOut` → `denied` with DENIED_MESSAGE.
 * - Any later `permission-denied` from the data layer re-checks the allow-list; if the email was removed,
 *   the Admin is signed out (→ login, DENIED_MESSAGE). A schema rejection (still on the list) keeps the session.
 */
import { FirebaseError } from 'firebase/app';
import { deleteUser, onAuthStateChanged, signOut as firebaseSignOut, type Auth, type User } from 'firebase/auth';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { setPermissionDeniedHandler } from '../data';
import { signInWithGoogle } from './firebaseAuth';

export type AdminSessionStatus = 'loading' | 'signedOut' | 'checking' | 'admin' | 'denied';

export type AdminUser = { uid: string; email: string; displayName: string | null; photoURL: string | null };

export type AdminSession = {
  status: AdminSessionStatus;
  /** The signed-in Google account (set while `checking` and `admin`). */
  user: AdminUser | null;
  /** Message for the login page (denied, popup blocked, check failed); null when none. */
  message: string | null;
  /** True while the Google popup is open. */
  signingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const DENIED_MESSAGE = "This Google account isn't allowed to access UDAN admin.";
export const CHECK_FAILED_MESSAGE = "Couldn't check access to UDAN admin. Check your connection and try again.";
export const POPUP_BLOCKED_MESSAGE = 'The sign-in window was blocked. Allow pop-ups for this site and try again.';
export const SIGN_IN_FAILED_MESSAGE = "Sign-in didn't complete. Try again.";

/** Popup dismissals that aren't errors. */
const QUIET_SIGN_IN_ERRORS = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);

type AllowListResult = 'admin' | 'denied' | 'error';

async function checkAllowList(db: Firestore, email: string | null): Promise<AllowListResult> {
  try {
    const snap = await getDoc(doc(db, 'config', 'admins'));
    const emails = snap.get('emails');
    return email && Array.isArray(emails) && emails.includes(email.toLowerCase()) ? 'admin' : 'denied';
  } catch (error) {
    return error instanceof FirebaseError && error.code === 'permission-denied' ? 'denied' : 'error';
  }
}

function toAdminUser(user: User): AdminUser {
  return { uid: user.uid, email: user.email ?? '', displayName: user.displayName, photoURL: user.photoURL };
}

type State = Pick<AdminSession, 'status' | 'user' | 'message'>;

const SessionContext = createContext<AdminSession | null>(null);

export type AdminSessionProviderProps = {
  auth: Auth;
  /** Firestore on the same Firebase app as `auth` (so reads carry the user's token). */
  db: Firestore;
  /** Opens the sign-in UI. Defaults to the Google popup; tests pass a credential sign-in. */
  signIn?: (auth: Auth) => Promise<unknown>;
  children: ReactNode;
};

export function AdminSessionProvider({ auth, db, signIn = signInWithGoogle, children }: AdminSessionProviderProps) {
  const [state, setState] = useState<State>({ status: 'loading', user: null, message: null });
  const [signingIn, setSigningIn] = useState(false);
  /** Shown on the login page once signed out; survives the auth-state change caused by signing out. */
  const pendingMessage = useRef<string | null>(null);
  const statusRef = useRef(state.status);
  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    let current = 0;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const run = ++current;
      if (!user) {
        const message = pendingMessage.current;
        setState({ status: message === DENIED_MESSAGE ? 'denied' : 'signedOut', user: null, message });
        return;
      }
      setState({ status: 'checking', user: toAdminUser(user), message: null });
      void checkAllowList(db, user.email).then(async (result) => {
        if (run !== current) return;
        if (result === 'admin') {
          pendingMessage.current = null;
          setState({ status: 'admin', user: toAdminUser(user), message: null });
          return;
        }
        pendingMessage.current = result === 'denied' ? DENIED_MESSAGE : CHECK_FAILED_MESSAGE;
        // Keep the Auth user list clean; a recent popup sign-in is fresh enough for deleteUser.
        if (result === 'denied') await deleteUser(user).catch(() => undefined);
        await firebaseSignOut(auth).catch(() => undefined);
      });
    });
    return () => {
      current = -1;
      unsubscribe();
    };
  }, [auth, db]);

  // Global permission-denied handler (data layer): sign out if the email is no longer on the allow-list.
  useEffect(() => {
    let rechecking = false;
    return setPermissionDeniedHandler(() => {
      if (rechecking || statusRef.current !== 'admin' || !auth.currentUser) return;
      rechecking = true;
      const user = auth.currentUser;
      void checkAllowList(db, user.email)
        .then(async (result) => {
          if (result !== 'denied' || auth.currentUser !== user) return;
          pendingMessage.current = DENIED_MESSAGE;
          await firebaseSignOut(auth).catch(() => undefined);
        })
        .finally(() => {
          rechecking = false;
        });
    });
  }, [auth, db]);

  const startSignIn = useCallback(async () => {
    pendingMessage.current = null;
    setState((s) => (s.status === 'denied' ? { status: 'signedOut', user: null, message: null } : { ...s, message: null }));
    setSigningIn(true);
    try {
      await signIn(auth);
    } catch (error) {
      const code = error instanceof FirebaseError ? error.code : '';
      if (!QUIET_SIGN_IN_ERRORS.has(code)) {
        const message = code === 'auth/popup-blocked' ? POPUP_BLOCKED_MESSAGE : SIGN_IN_FAILED_MESSAGE;
        setState((s) => ({ ...s, message }));
      }
    } finally {
      setSigningIn(false);
    }
  }, [auth, signIn]);

  const signOut = useCallback(async () => {
    pendingMessage.current = null;
    await firebaseSignOut(auth);
  }, [auth]);

  const value = useMemo<AdminSession>(
    () => ({ ...state, signingIn, signIn: startSignIn, signOut }),
    [state, signingIn, startSignIn, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** The current admin session. Use inside `AdminSessionProvider`. */
export function useAdminSession(): AdminSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useAdminSession must be used inside AdminSessionProvider');
  return session;
}
