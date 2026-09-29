import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomeScreen } from '@/features/home';
import { VerifyPage, FAQPage } from '@/features/auth/pages';
import { ProfilePage, ProfileSettingsPage } from '@/features/profiles';
import { TutorScreen } from '@/features/tutor';
import { OpportunitiesPage } from '@/features/opportunities';
import { ResearchPage } from '@/features/research';
import { LostFoundPage } from '@/features/lostfound';
import { ChatPage } from '@/features/chat';
import RootLayout from '@/app/RootLayout';

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
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'profile/settings',
        element: <ProfileSettingsPage />,
      },
      {
        path: 'profile/:id',
        element: <ProfilePage />,
      },
      {
        path: 'tutor',
        element: <TutorScreen />,
      },
      {
        path: 'opportunities',
        element: <OpportunitiesPage />,
      },
      {
        path: 'lostfound',
        element: <LostFoundPage />,
      },
      {
        path: 'lost-found',
        element: <LostFoundPage />,
      },
      {
        path: 'chat',
        element: <ChatPage />,
      },
      {
        path: 'announcements',
        element: <OpportunitiesPage />,
      },
      {
        path: 'campus',
        element: <OpportunitiesPage />,
      },
      {
        path: 'research',
        element: <ResearchPage />,
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
