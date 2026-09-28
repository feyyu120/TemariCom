import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { lostFoundService } from '@/features/lostfound/services/lostFoundService';
import { LostFoundItem, LostFoundType, LostFoundStatus } from '@/features/lostfound/types';

interface EditItemModalProps {
  item: LostFoundItem | null;
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated: (updatedItem: LostFoundItem) => void;
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

export const EditItemModal: React.FC<EditItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onItemUpdated,
}) => {
  const [type, setType] = useState<LostFoundType>('lost');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('other');
  const [location, setLocation] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [status, setStatus] = useState<LostFoundStatus>('active');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageKey, setImageKey] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && item) {
      setType(item.type);
      setTitle(item.title || '');
      setDescription(item.description || '');
      setCategory(item.category || 'other');
      setLocation(item.location || '');
      setEventDate(
        item.event_date
          ? item.event_date.split('T')[0]
          : item.created_at
          ? item.created_at.split('T')[0]
          : ''
      );
      setPhoneNumber(item.phone_number || item.reporter?.phone || '');
      setStatus(item.status);
      setImagePreview(item.image_url || '');
      setImageKey(item.image_key || '');
      setSelectedFile(null);
      setErrorMessage(null);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 10MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file');
      return;
    }

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMessage(null);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview('');
    setImageKey('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Item title is required');
      return;
    }

    setIsSubmitting(true);
    let finalImageKey: string | undefined = imagePreview ? (imageKey || undefined) : undefined;

    try {
      if (selectedFile) {
        try {
          const uploadRes = await lostFoundService.uploadPhoto(selectedFile);
          finalImageKey = uploadRes.key;
        } catch (uploadErr) {
          console.warn('[EditItemModal] Photo upload skipped/failed:', uploadErr);
        }
      }

      const updated = await lostFoundService.updateItem(item.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        location: location.trim() || undefined,
        event_date: eventDate || undefined,
        phone_number: phoneNumber.trim() || undefined,
        status,
        image_key: finalImageKey,
      });

      onItemUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update item. Please try again.');
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
      aria-labelledby="edit-item-modal-title"
    >
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-background/50">
          <h2 id="edit-item-modal-title" className="text-base sm:text-lg font-bold text-textPrimary">
            Edit Post
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-textTertiary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="bg-danger/10 text-danger border-b border-danger/20 px-4 py-2 text-[12.5px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-[13px]">
          {/* Status selector */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2 px-3 rounded-card text-[13px] font-semibold transition-all cursor-pointer border ${
                  status === 'active'
                    ? 'bg-active text-activeText border-active shadow-xs'
                    : 'bg-surface-elevated text-textSecondary border-border-subtle hover:text-textPrimary'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus('resolved')}
                className={`py-2 px-3 rounded-card text-[13px] font-semibold transition-all cursor-pointer border ${
                  status === 'resolved'
                    ? 'bg-active text-activeText border-active shadow-xs'
                    : 'bg-surface-elevated text-textSecondary border-border-subtle hover:text-textPrimary'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
              Item Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ID"
              className="w-full px-3.5 py-2 bg-background border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[13.5px] placeholder:text-textTertiary outline-none transition-colors"
            />
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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
                Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[13px] outline-none transition-colors cursor-pointer"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder='e.g. "Main Library 2nd floor"'
              className="w-full px-3.5 py-2 bg-background border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[13px] placeholder:text-textTertiary outline-none transition-colors"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+251 9..."
              className="w-full px-3.5 py-2 bg-background border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[13px] placeholder:text-textTertiary outline-none transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide distinctive features, brand, color, stickers..."
              className="w-full px-3.5 py-2 bg-background border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[13px] placeholder:text-textTertiary outline-none transition-colors resize-none"
            />
          </div>

          {/* Photo */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-textTertiary uppercase tracking-wider">
              Photo
            </label>
            {imagePreview ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border-subtle bg-surface-elevated flex items-center justify-center group">
                <img
                  src={imagePreview}
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
                  Upload a photo
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

          {/* Footer */}
          <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
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
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
