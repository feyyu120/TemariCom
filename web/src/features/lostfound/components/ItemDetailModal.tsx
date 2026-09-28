import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  Trash2,
  Bookmark,
  Share2,
  Check,
  Search,
  HelpCircle,
} from 'lucide-react';
import { LostFoundItem } from '@/features/lostfound/types';
import { useAuth } from '@/features/auth';
import { ConfirmDeleteModal } from '@/components';

interface ItemDetailModalProps {
  item: LostFoundItem | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved?: boolean;
  onToggleSave?: (item: LostFoundItem) => void;
  onStatusChange?: (itemId: string, newStatus: 'active' | 'resolved' | 'closed') => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  isSaved = false,
  onToggleSave,
  onStatusChange,
  onDeleteItem,
}) => {
  const { user } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDmToast, setShowDmToast] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !item) return null;

  const isOwner = Boolean(user?.id && item.user_id === user.id);
  const isLost = item.type === 'lost';
  const phoneNumber = item.phone_number || item.reporter?.phone;
  const reporterName =
    item.reporter?.full_name?.trim() ||
    item.reporter?.username?.trim() ||
    (item.reporter?.email ? item.reporter.email.split('@')[0] : 'Campus Student');
  const reporterInitial = (reporterName || 'U').charAt(0).toUpperCase();

  const handleShare = () => {
    try {
      if (navigator.share) {
        navigator.share({
          title: item.title,
          text: `${isLost ? 'Lost' : 'Found'} on Campus: ${item.title} (${item.location})`,
          url: window.location.href,
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleToggleResolved = async () => {
    if (!onStatusChange) return;
    setIsUpdatingStatus(true);
    const targetStatus = item.status === 'resolved' ? 'active' : 'resolved';
    try {
      await onStatusChange(item.id, targetStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-background/50">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-0.5 rounded-full text-[11.5px] font-semibold capitalize tracking-wide ${
                item.status === 'resolved'
                  ? 'bg-surface-elevated text-textTertiary border border-border-subtle'
                  : 'bg-active text-activeText shadow-xs'
              }`}
            >
              {item.status === 'resolved' ? 'Resolved' : item.type}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleSave?.(item)}
              className="p-1.5 rounded-full text-textTertiary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
              title={isSaved ? 'Remove bookmark' : 'Bookmark item'}
            >
              <Bookmark
                className={`w-4.5 h-4.5 ${
                  isSaved ? 'fill-textPrimary text-textPrimary' : 'text-textTertiary'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-full text-textTertiary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
              title="Share item"
            >
              {copiedLink ? (
                <Check className="w-4.5 h-4.5 text-textPrimary" />
              ) : (
                <Share2 className="w-4.5 h-4.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-textTertiary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer ml-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DM Coming Soon Toast Notification */}
        {showDmToast && (
          <div className="bg-surface-elevated border-b border-border-subtle px-4 py-2 text-[12.5px] text-textPrimary flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-textPrimary" />
              <span>Direct Messaging with @{item.reporter?.username || reporterName} is coming soon!</span>
            </span>
            <button
              type="button"
              onClick={() => setShowDmToast(false)}
              className="p-1 text-textTertiary hover:text-textPrimary cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-[13px]">
          {/* Big Photo Preview if present, or clean placeholder if no image was provided */}
          {item.image_url ? (
            <div className="w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-border-subtle bg-surface-elevated flex items-center justify-center">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={`w-full py-6 rounded-xl border border-border-subtle flex flex-col items-center justify-center gap-1.5 ${
              isLost ? 'bg-danger/5 text-danger' : 'bg-active/10 text-active'
            }`}>
              {isLost ? <HelpCircle className="w-8 h-8 text-danger" /> : <Search className="w-8 h-8 text-active" />}
              <span className="text-[11.5px] font-bold uppercase tracking-wider">
                {isLost ? 'Lost Item (No Photo Provided)' : 'Found Item (No Photo Provided)'}
              </span>
            </div>
          )}

          {/* Title & Status */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-textPrimary leading-snug">
              {item.title}
            </h2>
            <p className="text-[12.5px] text-textTertiary flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-textTertiary" />
                <span>{item.location || 'Campus'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-textTertiary" />
                <span>
                  {item.event_date
                    ? new Date(item.event_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : new Date(item.created_at).toLocaleDateString()}
                </span>
              </span>
            </p>
          </div>

          {/* Description */}
          {item.description && (
            <div className="p-3.5 rounded-xl bg-background border border-border-subtle space-y-1">
              <p className="text-[11px] font-semibold text-textTertiary uppercase tracking-wider">
                Details & Features
              </p>
              <p className="text-[13.5px] text-textSecondary leading-relaxed whitespace-pre-wrap">
                {item.description}
              </p>
            </div>
          )}

          {/* Reporter Profile & Direct Messaging (DM comes first) */}
          <div className="p-4 rounded-xl bg-background border border-border-subtle flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {item.reporter?.avatar_url ? (
                <img
                  src={item.reporter.avatar_url}
                  alt={reporterName}
                  className="w-10 h-10 rounded-full object-cover border border-border-subtle shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center font-bold text-textPrimary shrink-0 text-sm">
                  {reporterInitial}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-[14px] text-textPrimary truncate">
                  {reporterName}
                </p>
                <p className="text-[12px] text-textTertiary truncate">
                  {isLost ? 'Looking for this item' : 'Holding this item'}
                </p>
              </div>
            </div>

            {/* Direct Message (DM) Action Button */}
            <button
              type="button"
              onClick={() => {
                setShowDmToast(true);
                setTimeout(() => setShowDmToast(false), 3000);
              }}
              className="px-4 py-2 rounded-xl bg-active text-activeText text-[13px] font-semibold hover:opacity-95 transition-all inline-flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>DM</span>
            </button>
          </div>

          {/* Phone Number Display (comes after DM) */}
          {phoneNumber && (
            <div className="p-3.5 rounded-xl bg-background border border-border-subtle flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-textTertiary uppercase tracking-wider">
                  Phone Number
                </p>
                <p className="text-[14px] font-bold text-textPrimary mt-0.5 select-text truncate">
                  {phoneNumber}
                </p>
              </div>

              <a
                href={`tel:${phoneNumber}`}
                className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-border text-textSecondary hover:text-textPrimary text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
            </div>
          )}

          {/* Owner Management Controls */}
          {isOwner && (
            <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleToggleResolved}
                className="px-3.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-border text-textSecondary hover:text-textPrimary text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-textPrimary" />
                <span>{item.status === 'resolved' ? 'Reopen Post' : 'Mark as Resolved'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 rounded-lg text-danger hover:bg-danger/10 text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        isLoading={isDeleting}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await onDeleteItem?.(item.id);
            setShowDeleteConfirm(false);
            onClose();
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Post?"
        description={`Are you sure you want to permanently delete "${item.title}"? This action cannot be undone.`}
      />
    </div>
  );
};
