import React, { useEffect, useRef } from 'react';
import {
  User as UserIcon,
  LogOut,
  UserPlus,
  Check,
  BadgeCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface UserMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

export const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({
  isOpen,
  onClose,
  position = 'top',
}) => {
  const navigate = useNavigate();
  const {
    user,
    accounts,
    activeAccountId,
    switchAccount,
    logout,
    openAuthModal,
  } = useAuth();

  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  return (
    <div
      ref={menuRef}
      className={`absolute left-2 right-2 ${
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      } bg-surface border border-border rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn min-w-[240px] text-textPrimary`}
    >
      {/* Current Active Account Header */}
      <div className="p-2.5 border-b border-border-subtle mb-1">
        <div className="flex items-center gap-2.5">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name || user.username}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-textSecondary shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold text-textPrimary truncate">
                {user.full_name || user.username || user.email.split('@')[0]}
              </p>
              {user.is_verified && (
                <BadgeCheck className="w-3.5 h-3.5 text-verification shrink-0" />
              )}
            </div>
            <p className="text-xs text-textTertiary truncate">{user.email}</p>
          </div>
        </div>
      </div>


      {/* Telegram-style Multi-Account List */}
      {Array.isArray(accounts) && accounts.length > 1 && (
        <div className="py-1 border-b border-border-subtle mb-1">
          <p className="px-2.5 py-1 text-[11px] font-semibold text-textTertiary uppercase tracking-wider">
            SWITCH ACCOUNT
          </p>
          {accounts.map((acc) => {
            const isActive = acc.id === activeAccountId || acc.id === user.id;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={async () => {
                  if (!isActive) {
                    await switchAccount(acc.id);
                  }
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-surface-elevated text-textPrimary font-semibold'
                    : 'text-textSecondary hover:bg-surface-elevated hover:text-textPrimary'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {acc.user.avatar_url ? (
                    <img
                      src={acc.user.avatar_url}
                      alt={acc.user.full_name || acc.user.username}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-textTertiary shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                  <span className="text-xs truncate">
                    {acc.user.full_name || acc.user.username || acc.user.email}
                  </span>
                </div>
                {isActive && <Check className="w-4 h-4 text-textPrimary shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Add Account Option */}
      <button
        type="button"
        onClick={() => {
          onClose();
          openAuthModal('login');
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-textSecondary hover:bg-surface-elevated hover:text-textPrimary transition-colors cursor-pointer"
      >
        <UserPlus className="w-4 h-4 text-textTertiary" />
        <span>Add another account</span>
      </button>

      {/* Log Out Option */}
      <button
        type="button"
        onClick={async () => {
          onClose();
          await logout();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-danger hover:bg-danger/10 transition-colors mt-0.5 cursor-pointer"
      >
        <LogOut className="w-4 h-4 text-danger" />
        <span>Log Out</span>
      </button>
    </div>
  );
};

export default UserMenuDropdown;
