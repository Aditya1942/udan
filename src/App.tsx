import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { routes } from './content/navigation';
import { SiteLayout } from './layout/SiteLayout';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import OtherServicesPage from './pages/OtherServicesPage';
import PrivacyPage from './pages/PrivacyPage';
import ToursPage from './pages/ToursPage';
import VisaServicesPage from './pages/VisaServicesPage';

/** Blank surface while the admin chunk loads on a first visit (keeps the admin out of the public bundle). */
function AdminChunkLoading() {
  return <div aria-busy="true" style={{ minHeight: '100vh', background: 'var(--color-surface)' }} />;
}

export const appRoutes: RouteObject[] = [
  {
    element: <SiteLayout />,
    children: [
      { path: routes.home, element: <HomePage /> },
      { path: routes.tours, element: <ToursPage /> },
      { path: routes.visa, element: <VisaServicesPage /> },
      { path: routes.otherServices, element: <OtherServicesPage /> },
      { path: routes.about, element: <AboutPage /> },
      { path: routes.contact, element: <ContactPage /> },
      { path: routes.privacy, element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Admin: a sibling of SiteLayout (no site header/footer), loaded only when visited. Nothing else imports src/admin.
  { path: '/admin/*', HydrateFallback: AdminChunkLoading, lazy: () => import('./admin/routes') },
];

const router = createBrowserRouter(appRoutes);

export function App() {
  return <RouterProvider router={router} />;
}
