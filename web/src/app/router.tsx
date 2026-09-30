import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomeScreen } from '@/features/home';
import { VerifyPage, FAQPage } from '@/features/auth/pages';
import { ProfilePage, ProfileSettingsPage } from '@/features/profiles';
import { TutorScreen } from '@/features/tutor';
import { OpportunitiesPage } from '@/features/opportunities';
import { ResearchPage } from '@/features/research';
import { LostFoundPage } from '@/features/lostfound';
import { ChatPage } from '@/features/chat';
import { LearnPage } from '@/features/learn/pages/LearnPage';
import { CampusPage } from '@/features/campus/pages/CampusPage';
import { PromotePage } from '@/features/promote/pages/PromotePage';
import { CreatePage } from '@/features/create/pages/CreatePage';
import { MarketplacePage } from '@/features/marketplace/pages/MarketplacePage';
import { DownloadsPage } from '@/features/downloads/pages/DownloadsPage';
import { SavedPage } from '@/features/saved/pages/SavedPage';
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
        path: 'learn',
        element: <LearnPage />,
      },
      {
        path: 'tutor',
        element: <TutorScreen />,
      },
      {
        path: 'campus',
        element: <CampusPage />,
      },
      {
        path: 'opportunities',
        element: <OpportunitiesPage />,
      },
      {
        path: 'announcements',
        element: <OpportunitiesPage />,
      },
      {
        path: 'research',
        element: <ResearchPage />,
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
        path: 'promote',
        element: <PromotePage />,
      },
      {
        path: 'create',
        element: <CreatePage />,
      },
      {
        path: 'marketplace',
        element: <MarketplacePage />,
      },
      {
        path: 'downloads',
        element: <DownloadsPage />,
      },
      {
        path: 'saved',
        element: <SavedPage />,
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
