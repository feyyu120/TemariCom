import React, { useState, useMemo } from 'react';
import {
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  MapPin,
  Phone,
  Plus,
  Package,
  RotateCcw,
  Search,
  HelpCircle,
} from 'lucide-react';
import { LostFoundItem } from '@/features/lostfound/types';
import { ConfirmDeleteModal } from '@/components';

interface YourPostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LostFoundItem[];
  onOpenPostModal: () => void;
  onEditItem: (item: LostFoundItem) => void;
  onDeleteItem: (itemId: string) => Promise<void>;
  onToggleStatus: (itemId: string, newStatus: 'active' | 'resolved' | 'closed') => Promise<void>;
  onSelectItem: (item: LostFoundItem) => void;
}

export const YourPostsModal: React.FC<YourPostsModalProps> = ({
  isOpen,
  onClose,
  items,
  onOpenPostModal,
  onEditItem,
  onDeleteItem,
  onToggleStatus,
  onSelectItem,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [itemToDelete, setItemToDelete] = useState<LostFoundItem | null>(null);

  const activeCount = useMemo(() => items.filter((i) => i.status === 'active').length, [items]);
  const resolvedCount = useMemo(() => items.filter((i) => i.status === 'resolved').length, [items]);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  if (!isOpen) return null;

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete.id);
    try {
      await onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (item: LostFoundItem) => {
    setUpdatingStatusId(item.id);
    const targetStatus = item.status === 'resolved' ? 'active' : 'resolved';
    try {
      await onToggleStatus(item.id, targetStatus);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="your-posts-modal-title"
    >
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-background/50">
          <div className="flex items-center gap-2">
            <h2 id="your-posts-modal-title" className="text-base sm:text-lg font-bold text-textPrimary">
              Your Posts
            </h2>
            <span className="text-[12px] font-semibold text-textTertiary bg-surface-elevated px-2 py-0.5 rounded-full border border-border-subtle">
              {items.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPostModal();
              }}
              className="px-2.5 py-1 text-[12px] font-medium text-activeText bg-active hover:opacity-95 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Post</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-textTertiary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Filter Tabs (All, Active, Resolved) */}
        <div className="px-5 py-2.5 border-b border-border-subtle bg-surface flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all cursor-pointer border ${
              statusFilter === 'all'
                ? 'bg-active text-activeText border-active shadow-xs'
                : 'bg-background text-textSecondary border-border-subtle hover:text-textPrimary hover:bg-surface-elevated'
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all cursor-pointer border ${
              statusFilter === 'active'
                ? 'bg-active text-activeText border-active shadow-xs'
                : 'bg-background text-textSecondary border-border-subtle hover:text-textPrimary hover:bg-surface-elevated'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all cursor-pointer border ${
              statusFilter === 'resolved'
                ? 'bg-active text-activeText border-active shadow-xs'
                : 'bg-background text-textSecondary border-border-subtle hover:text-textPrimary hover:bg-surface-elevated'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center mx-auto text-textTertiary">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-[15px] text-textPrimary">
                {statusFilter === 'all' ? 'No items posted yet' : `No ${statusFilter} items`}
              </h3>
              <p className="text-[12.5px] text-textTertiary max-w-xs mx-auto">
                {statusFilter === 'all'
                  ? 'Items you report as lost or found on campus will be listed here where you can manage or resolve them.'
                  : `You do not have any ${statusFilter} posts at this time.`}
              </p>
              {statusFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="px-3.5 py-1.5 rounded-lg bg-surface-elevated text-textPrimary text-[12px] font-medium border border-border-subtle hover:border-border transition-colors cursor-pointer"
                >
                  Show All Posts
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPostModal();
                  }}
                  className="px-4 py-2 rounded-xl bg-active text-activeText text-[13px] font-semibold hover:opacity-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post an Item</span>
                </button>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isResolved = item.status === 'resolved';
              const isDeleting = deletingId === item.id;
              const isUpdating = updatingStatusId === item.id;
              const phone = item.phone_number || item.reporter?.phone;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-background border border-border-subtle hover:border-border transition-colors space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {/* Image Preview Thumbnail (proper placeholder if no image) */}
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-16 h-16 rounded-lg object-cover border border-border-subtle shrink-0 cursor-pointer"
                        onClick={() => {
                          onSelectItem(item);
                        }}
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-lg border border-border-subtle flex flex-col items-center justify-center gap-0.5 shrink-0 cursor-pointer ${
                          item.type === 'lost' ? 'bg-danger/5 text-danger' : 'bg-active/10 text-active'
                        }`}
                        onClick={() => {
                          onSelectItem(item);
                        }}
                      >
                        {item.type === 'lost' ? (
                          <HelpCircle className="w-5 h-5 text-danger" />
                        ) : (
                          <Search className="w-5 h-5 text-active" />
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-wider">
                          {item.type}
                        </span>
                      </div>
                    )}

                    {/* Information */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            item.type === 'lost'
                              ? 'bg-danger/10 text-danger'
                              : 'bg-active text-activeText'
                          }`}
                        >
                          {item.type}
                        </span>
                        <button
                          type="button"
                          onClick={() => setStatusFilter(isResolved ? 'resolved' : 'active')}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-85 transition-opacity ${
                            isResolved
                              ? 'bg-surface-elevated text-textTertiary border-border-subtle'
                              : 'bg-surface text-textSecondary border-border-subtle'
                          }`}
                          title={`Filter by ${isResolved ? 'Resolved' : 'Active'}`}
                        >
                          {isResolved ? 'Resolved' : 'Active'}
                        </button>
                      </div>

                      <h4
                        onClick={() => onSelectItem(item)}
                        className="font-bold text-[14px] text-textPrimary truncate cursor-pointer hover:underline"
                      >
                        {item.title}
                      </h4>

                      <div className="flex items-center gap-2 text-[11.5px] text-textTertiary mt-1 flex-wrap">
                        {item.location && (
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </span>
                        )}
                        {phone && (
                          <span className="flex items-center gap-1 truncate">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggleStatus(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-border-subtle text-textSecondary hover:text-textPrimary text-[12px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isResolved ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reopen</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-textPrimary" />
                          <span>Mark Resolved</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onEditItem(item);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-border-subtle text-textSecondary hover:text-textPrimary text-[12px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Edit post"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => setItemToDelete(item)}
                        className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete post"
                        aria-label="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        isLoading={Boolean(deletingId)}
        title="Delete Post?"
        description={
          itemToDelete
            ? `Are you sure you want to permanently delete "${itemToDelete.title}"? This cannot be undone.`
            : undefined
        }
      />
    </div>
  );
};
