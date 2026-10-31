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
];

const router = createBrowserRouter(appRoutes);

export function App() {
  return <RouterProvider router={router} />;
}
