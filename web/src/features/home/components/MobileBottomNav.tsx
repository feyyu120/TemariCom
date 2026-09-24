import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Building2, MessageSquare, User } from 'lucide-react';
import { useAuth } from '@/features/auth';

interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('home');

  const navItems: BottomNavItem[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'learn', label: 'Learn', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'campus', label: 'Campus', icon: <Building2 className="w-5 h-5" /> },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare className="w-5 h-5" />,
      badge: 3,
    },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  ];

  const handleTabClick = (tabId: string) => {
    if (tabId === 'home') {
      navigate('/');
      return;
    }
    if (tabId === 'profile') {
      if (!isAuthenticated) {
        openAuthModal('login');
        return;
      }
      navigate('/profile');
      return;
    }
    setActiveTab(tabId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-background/95 backdrop-blur-md border-t border-border-subtle flex items-center justify-around px-2 lg:hidden select-none">
      {navItems.map((item) => {
        const isActive =
          (item.id === 'home' && location.pathname === '/') ||
          (item.id === 'profile' && location.pathname.startsWith('/profile')) ||
          (activeTab === item.id && location.pathname !== '/' && !location.pathname.startsWith('/profile'));
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleTabClick(item.id)}
            className="flex-1 flex flex-col items-center justify-center py-1 relative focus:outline-none transition-colors"
          >
            <div className="relative">
              <span
                className={`transition-colors ${
                  isActive ? 'text-textPrimary' : 'text-textTertiary'
                }`}
              >
                {item.icon}
              </span>
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 bg-unread text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                  {item.badge}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-1 font-medium transition-colors ${
                isActive ? 'text-textPrimary font-semibold' : 'text-textTertiary'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;

