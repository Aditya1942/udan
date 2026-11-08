/**
 * The admin route tree (relative to `/admin`), rendered under the lazy `/admin/*` route.
 * Takes Auth + Firestore so tests can pass emulator instances and a credential sign-in.
 */
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { AdminSessionProvider } from './auth';
import { BookingDetailScreen } from './screens/BookingDetailScreen';
import { ClientDetailScreen } from './screens/ClientDetailScreen';
import { ClientsScreen } from './screens/ClientsScreen';
import { DmcDetailScreen } from './screens/DmcDetailScreen';
import { DmcsScreen } from './screens/DmcsScreen';
import { EnquiriesScreen } from './screens/EnquiriesScreen';
import { LoginScreen } from './screens/LoginScreen';
import { NewBookingScreen } from './screens/NewBookingScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TemplatesSettingsScreen } from './screens/TemplatesSettingsScreen';
import { AdminLayout } from './shell/AdminLayout';
import { LoadingState } from './ui';

/** Nested lazy chunk (Recharts lands here). */
const InsightsScreen = lazy(() => import('./screens/InsightsScreen'));

export type AdminAppProps = {
  auth: Auth;
  db: Firestore;
  /** Override the Google popup (tests). */
  signIn?: (auth: Auth) => Promise<unknown>;
};

export function AdminApp({ auth, db, signIn }: AdminAppProps) {
  return (
    <AdminSessionProvider auth={auth} db={db} signIn={signIn}>
      <Routes>
        <Route path="login" element={<LoginScreen />} />
        <Route element={<AdminLayout db={db} />}>
          <Route index element={<OverviewScreen />} />
          <Route
            path="insights"
            element={
              <Suspense fallback={<LoadingState label="Loading Insights" />}>
                <InsightsScreen />
              </Suspense>
            }
          />
          <Route path="bookings/new" element={<NewBookingScreen />} />
          <Route path="bookings/:bookingNo" element={<BookingDetailScreen />} />
          <Route path="customers" element={<ClientsScreen />} />
          <Route path="customers/:id" element={<ClientDetailScreen />} />
          <Route path="dmcs" element={<DmcsScreen />} />
          <Route path="dmcs/:id" element={<DmcDetailScreen />} />
          <Route path="enquiries" element={<EnquiriesScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="settings/templates" element={<TemplatesSettingsScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Routes>
    </AdminSessionProvider>
  );
}
