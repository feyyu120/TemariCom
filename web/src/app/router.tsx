import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomeScreen } from '@/features/home';
import { VerifyPage, FAQPage } from '@/features/auth/pages';
import RootLayout from './RootLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomeScreen />,
      },
      {
        path: 'verify',
        element: <VerifyPage />,
      },
      {
        path: 'faq',
        element: <FAQPage />,
      },
      {
        path: 'help',
        element: <Navigate to="/faq" replace />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export default router;

