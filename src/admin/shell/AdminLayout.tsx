/**
 * The admin guard + shell (a component, not a route loader).
 * loading/checking → full-screen spinner (no shell flash); signedOut/denied → login with ?next=; admin → shell + Outlet.
 */
import type { Firestore } from 'firebase/firestore';
import { Navigate, Outlet, useLocation } from 'react-router';
import { loginPathFor, useAdminSession } from '../auth';
import { AdminDataProvider } from '../data';
import { FullScreenSpinner, ToastProvider, useNoIndex } from '../ui';
import { AdminShell } from './AdminShell';

export function AdminLayout({ db }: { db: Firestore }) {
  useNoIndex();
  const { status } = useAdminSession();
  const location = useLocation();

  if (status === 'loading' || status === 'checking') return <FullScreenSpinner label="Checking access" />;
  if (status !== 'admin') return <Navigate to={loginPathFor(`${location.pathname}${location.search}${location.hash}`)} replace />;
  return (
    <AdminDataProvider db={db}>
      <ToastProvider>
        <AdminShell>
          <Outlet />
        </AdminShell>
      </ToastProvider>
    </AdminDataProvider>
  );
}
