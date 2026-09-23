import React from 'react';
import { Outlet } from 'react-router-dom';
import { SplashScreen } from '@/components';
import { AuthModal } from '@/features/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const RootLayout: React.FC = () => {
  const { isLoading } = useAuth();

  return (
    <>
      <SplashScreen isLoading={isLoading} />
      <Outlet />
      <AuthModal />
    </>
  );
};

export default RootLayout;

