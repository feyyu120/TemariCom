import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Bookmark,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { lostFoundService } from '@/features/lostfound/services/lostFoundService';
import { FormDraftState, INITIAL_FORM_STATE } from '@/features/lostfound/hooks/useLostFoundDraft';
import { LostFoundItem, LostFoundType } from '@/features/lostfound/types';

interface PostItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemCreated: (item: LostFoundItem) => void;
  formState: FormDraftState;
  updateField: <K extends keyof FormDraftState>(field: K, value: FormDraftState[K]) => void;
  setEntireForm: (state: FormDraftState) => void;
  restoreActiveDraft: () => boolean;
  discardActiveDraft: () => void;
  saveToDraftsList: (state: FormDraftState) => void;
  hasRestoredDraft: boolean;
}

const CATEGORY_OPTIONS = [
  { value: 'id_card', label: 'ID Cards & Badges' },
  { value: 'electronics', label: 'Electronics & Phones' },
  { value: 'backpack', label: 'Backpacks & Bags' },
  { value: 'keys', label: 'Keys & Keychains' },
  { value: 'documents', label: 'Documents & Books' },
  { value: 'clothing', label: 'Clothing & Wearables' },
  { value: 'other', label: 'Other Items' },
];

export const PostItemModal: React.FC<PostItemModalProps> = ({
  isOpen,
  onClose,
  onItemCreated,
  formState,
  updateField,
  restoreActiveDraft,
  discardActiveDraft,
  saveToDraftsList,
  hasRestoredDraft,
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSavedDraft, setSuccessSavedDraft] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore draft when modal opens
  useEffect(() => {
    if (isOpen) {
      restoreActiveDraft();
      setErrorMessage(null);
      setSuccessSavedDraft(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen, restoreActiveDraft]);

  if (!isOpen) return null;

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 10MB');
      return;
    }

    // Validate MIME type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WEBP)');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    updateField('image_preview', objectUrl);
    setErrorMessage(null);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    updateField('image_preview', '');
    updateField('image_key', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualSaveDraft = () => {
    saveToDraftsList(formState);
    setSuccessSavedDraft(true);
    setTimeout(() => setSuccessSavedDraft(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    if (!formState.title.trim()) {
      setErrorMessage('Please provide an item title');
      return;
    }

    setIsSubmitting(true);
    let finalImageKey: string | undefined = undefined;

    try {
      // 1. Upload photo to Cloudflare R2 if selected
      if (selectedFile) {
        try {
          const uploadRes = await lostFoundService.uploadPhoto(selectedFile);
          finalImageKey = uploadRes.key;
        } catch (uploadErr) {
          console.warn('[PostItemModal] Photo upload skipped/failed:', uploadErr);
        }
      } else if (formState.image_preview && formState.image_key) {
        finalImageKey = formState.image_key;
      }

      // 2. Submit post to backend
      const createdItem = await lostFoundService.createItem({
        type: formState.type,
        title: formState.title.trim(),
        description: formState.description.trim() || undefined,
        category: formState.category || undefined,
        location: formState.location.trim() || undefined,
        event_date: formState.event_date || undefined,
        phone_number: formState.phone_number || undefined,
        image_key: finalImageKey,
      });

      // 3. Clear active draft on success
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      discardActiveDraft();
      onItemCreated(createdItem);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to post item. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-item-modal-title"
    >
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-background/50">
          <div className="flex items-center gap-2">
            <h2 id="post-item-modal-title" className="text-base sm:text-lg font-bold text-textPrimary">
              Post Lost or Found Item
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleManualSaveDraft}
              className="px-2.5 py-1 text-[12px] font-medium text-textSecondary hover:text-textPrimary hover:bg-surface-elevated rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Save as Draft"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save Draft</span>
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

        {/* Draft Auto-Saved Indicator */}
        {hasRestoredDraft && (
          <div className="bg-surface-elevated px-4 py-2 border-b border-border-subtle flex items-center justify-between text-[12px] text-textSecondary">
            <span className="flex items-center gap-1.5 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-textPrimary shrink-0" />
              <span>Draft auto-restored from local storage</span>
            </span>
            <button
              type="button"
              onClick={discardActiveDraft}
              className="text-danger hover:underline font-medium text-[11.5px] cursor-pointer ml-2 shrink-0"
            >
              Discard Draft
            </button>
          </div>
        )}

        {successSavedDraft && (
          <div className="bg-surface-elevated px-4 py-1.5 border-b border-border-subtle flex items-center gap-1.5 text-[12px] text-textPrimary">
            <CheckCircle2 className="w-3.5 h-3.5 text-textPrimary" />
            <span>Draft saved successfully to drafts list!</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-danger/10 text-danger border-b border-danger/20 px-4 py-2 text-[12.5px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Form Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-[13px]">
          {/* 1. Item Type Selector (Lost vs Found) */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
              Post Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateField('type', 'lost')}
                className={`py-2 px-3 rounded-card text-[13px] font-semibold transition-all cursor-pointer border ${
                  formState.type === 'lost'
                    ? 'bg-active text-activeText border-active shadow-xs'
                    : 'bg-surface-elevated text-textSecondary border-border-subtle hover:text-textPrimary'
                }`}
              >
                I Lost Something
              </button>
              <button
                type="button"
                onClick={() => updateField('type', 'found')}
                className={`py-2 px-3 rounded-card text-[13px] font-semibold transition-all cursor-pointer border ${
                  formState.type === 'found'
                    ? 'bg-active text-activeText border-active shadow-xs'
                    : 'bg-surface-elevated text-textSecondary border-border-subtle hover:text-textPrimary'
                }`}
              >
                I Found Something
              </button>
            </div>
          </div>

          {/* 2. Item Title */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
              Item Title *
            </label>
            <input
              type="text"
              required
              value={formState.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="ID"
              className="w-full px-3.5 py-2 bg-background border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[13.5px] placeholder:text-textTertiary outline-none transition-colors"
            />
          </div>

          {/* 3. Category & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
                Category
              </label>
              <select
                value={formState.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[13px] outline-none transition-colors cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-surface text-textPrimary">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
                {formState.type === 'lost' ? 'Date Lost' : 'Date Found'}
              </label>
              <input
                type="date"
                value={formState.event_date}
                onChange={(e) => updateField('event_date', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[13px] outline-none transition-colors cursor-pointer"
              />
            </div>
          </div>

          {/* 4. Location */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
              {formState.type === 'lost' ? 'Last Seen Location' : 'Found Location'}
            </label>
            <input
              type="text"
              value={formState.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder='Central Library'
              className="w-full px-3.5 py-2 bg-background border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[13px] placeholder:text-textTertiary outline-none transition-colors"
            />
          </div>

          {/* 5. Phone Number */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
              Phone Number
            </label>
            <input
              type="tel"
              value={formState.phone_number}
              onChange={(e) => updateField('phone_number', e.target.value)}
              placeholder="+251 9..."
              className="w-full px-3.5 py-2 bg-background border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[13px] placeholder:text-textTertiary outline-none transition-colors"
            />
          </div>

          {/* 6. Description */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
              Description & Distinctive Marks
            </label>
            <textarea
              rows={3}
              value={formState.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Provide distinctive features, brand, color, stickers, or circumstances..."
              className="w-full px-3.5 py-2 bg-background border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[13px] placeholder:text-textTertiary outline-none transition-colors resize-none"
            />
          </div>

          {/* 7. Image Upload / Preview */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
              Item Photo (Optional)
            </label>

            {formState.image_preview ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border-subtle bg-surface-elevated flex items-center justify-center group">
                <img
                  src={formState.image_preview}
                  alt="Item preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-danger transition-colors cursor-pointer shadow-sm"
                  title="Remove image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border-subtle hover:border-border rounded-xl p-4 text-center cursor-pointer bg-background/40 hover:bg-surface-elevated transition-colors flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center text-textSecondary">
                  <Upload className="w-5 h-5 text-textPrimary" />
                </div>
                <p className="text-[12.5px] font-medium text-textPrimary">
                  Click to upload a photo
                </p>
                <p className="text-[11.5px] text-textTertiary">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={discardActiveDraft}
              className="px-3.5 py-2 text-[12.5px] font-medium text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
            >
              Reset Form
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[13px] font-medium text-textSecondary hover:text-textPrimary hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-active text-activeText font-semibold text-[13px] hover:opacity-95 transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin text-activeText" />}
                <span>{isSubmitting ? 'Publishing...' : 'Post Item'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
