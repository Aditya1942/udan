/**
 * Lazy entry for `/admin/*` (src/App.tsx: `lazy: () => import('./admin/routes')`).
 * Everything admin — Firebase Auth, the data layer, admin styles — loads from here, never from the public entry.
 */
import { useMemo } from 'react';
import { getDb, getFirebaseApp } from '../lib/firebase';
import { AdminApp } from './AdminApp';
import { getAdminAuth } from './auth';
import { Brand } from './shell/Brand';
import { useAdminTitle, useNoIndex } from './ui';
import './ui/admin.css';

function NotConfigured() {
  useNoIndex();
  useAdminTitle('Not configured');
  return (
    <main className="adm-login">
      <div className="adm-login__card adm-center-card">
        <Brand />
        <h1 className="adm-h1">UDAN admin isn't configured</h1>
        <p className="adm-muted">Firebase settings (VITE_FIREBASE_*) are missing from this build. See .env.example.</p>
      </div>
    </main>
  );
}

export function Component() {
  const firebase = useMemo(() => {
    const app = getFirebaseApp();
    const db = getDb();
    return app && db ? { auth: getAdminAuth(app), db } : null;
  }, []);
  if (!firebase) return <NotConfigured />;
  return <AdminApp auth={firebase.auth} db={firebase.db} />;
}
