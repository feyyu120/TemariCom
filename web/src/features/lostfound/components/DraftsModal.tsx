import React, { useState } from 'react';
import { X, FileText, Trash2, ArrowRight, Calendar } from 'lucide-react';
import { DraftItem } from '@/features/lostfound/types';
import { ConfirmDeleteModal } from '@/components';

interface DraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: DraftItem[];
  onSelectDraft: (draft: DraftItem) => void;
  onDeleteDraft: (draftId: string) => void;
}

export const DraftsModal: React.FC<DraftsModalProps> = ({
  isOpen,
  onClose,
  drafts,
  onSelectDraft,
  onDeleteDraft,
}) => {
  const [draftToDelete, setDraftToDelete] = useState<DraftItem | null>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between shrink-0 bg-background/50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-textPrimary" />
            <h2 className="text-base font-bold text-textPrimary">Saved Drafts</h2>
            <span className="text-[12px] font-semibold text-textTertiary bg-surface-elevated px-2 py-0.5 rounded-full border border-border-subtle">
              {drafts.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-textTertiary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drafts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {drafts.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <FileText className="w-10 h-10 text-textTertiary mx-auto opacity-40" />
              <p className="text-[14px] font-medium text-textPrimary">No drafts saved yet</p>
              <p className="text-[12.5px] text-textTertiary">
                When you draft an item and save it or leave off, your drafts appear here.
              </p>
            </div>
          ) : (
            drafts.map((draft) => (
              <div
                key={draft.id}
                className="group p-3.5 rounded-xl bg-background border border-border-subtle hover:border-border transition-all flex items-center justify-between gap-3"
              >
                <div
                  onClick={() => {
                    onSelectDraft(draft);
                    onClose();
                  }}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        draft.type === 'lost'
                          ? 'bg-danger/10 text-danger border border-danger/20'
                          : 'bg-active text-activeText shadow-xs'
                      }`}
                    >
                      {draft.type}
                    </span>
                    <h3 className="font-bold text-[14px] text-textPrimary truncate group-hover:underline">
                      {draft.title}
                    </h3>
                  </div>

                  <p className="text-[12px] text-textTertiary flex items-center gap-1.5 mt-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(draft.updatedAt).toLocaleDateString()}</span>
                    {draft.location && <span>• {draft.location}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDraft(draft);
                      onClose();
                    }}
                    className="p-1.5 text-textSecondary hover:text-textPrimary hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
                    title="Resume editing draft"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraftToDelete(draft)}
                    className="p-1.5 text-textTertiary hover:text-danger hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
                    title="Delete draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={Boolean(draftToDelete)}
        onClose={() => setDraftToDelete(null)}
        onConfirm={() => {
          if (draftToDelete) {
            onDeleteDraft(draftToDelete.id);
            setDraftToDelete(null);
          }
        }}
        title="Delete Draft?"
        description={
          draftToDelete
            ? `Are you sure you want to delete the draft "${draftToDelete.title}"?`
            : undefined
        }
      />
    </div>
  );
};
