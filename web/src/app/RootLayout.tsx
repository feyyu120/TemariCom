import React from 'react';
import { Outlet } from 'react-router-dom';
import { SplashScreen } from '@/components';
import { AuthModal } from '@/features/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ToastProvider } from '@/context';
import { ChatProvider } from '@/features/chat';

export const RootLayout: React.FC = () => {
  const { isLoading } = useAuth();

  return (
    <ToastProvider>
      <ChatProvider>
        <SplashScreen isLoading={isLoading} />
        <Outlet />
        <AuthModal />
      </ChatProvider>
    </ToastProvider>
  );
};

export default RootLayout;

