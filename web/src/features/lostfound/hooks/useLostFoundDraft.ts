import { useState, useEffect, useCallback, useRef } from 'react';
import { DraftItem, LostFoundType } from '@/features/lostfound/types';

const ACTIVE_DRAFT_KEY = 'temaricom_lostfound_active_draft';
const SAVED_DRAFTS_KEY = 'temaricom_lostfound_drafts_list';

export interface FormDraftState {
  type: LostFoundType;
  title: string;
  description: string;
  category: string;
  location: string;
  event_date: string;
  phone_number: string;
  image_preview?: string;
  image_key?: string;
}

export const INITIAL_FORM_STATE: FormDraftState = {
  type: 'lost',
  title: '',
  description: '',
  category: 'other',
  location: '',
  event_date: new Date().toISOString().split('T')[0],
  phone_number: '',
  image_preview: '',
  image_key: '',
};

export function useLostFoundDraft() {
  const [formState, setFormState] = useState<FormDraftState>(INITIAL_FORM_STATE);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);
  const [savedDrafts, setSavedDrafts] = useState<DraftItem[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_DRAFTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Failed to parse saved drafts from localStorage:', e);
      return [];
    }
  });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refresh saved drafts list on demand
  const refreshSavedDrafts = useCallback(() => {
    try {
      const raw = localStorage.getItem(SAVED_DRAFTS_KEY);
      if (raw) {
        setSavedDrafts(JSON.parse(raw));
      } else {
        setSavedDrafts([]);
      }
    } catch (e) {
      console.warn('Failed to parse saved drafts from localStorage:', e);
      setSavedDrafts([]);
    }
  }, []);

  // Check and restore active draft on demand (when modal opens)
  const restoreActiveDraft = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(ACTIVE_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FormDraftState;
        // Check if there is meaningful content
        if (parsed.title?.trim() || parsed.description?.trim() || parsed.location?.trim()) {
          setFormState(parsed);
          setHasRestoredDraft(true);
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to restore active draft:', e);
    }
    return false;
  }, []);

  // Debounced auto-save active draft to localStorage
  const autoSaveActiveDraft = useCallback((state: FormDraftState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const hasContent =
          state.title.trim() !== '' ||
          state.description.trim() !== '' ||
          state.location.trim() !== '';

        if (hasContent) {
          localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(state));
        }
      } catch (e) {
        console.warn('Failed to auto-save draft to localStorage:', e);
      }
    }, 400); // 400ms debounce
  }, []);

  // Update a single field and auto-save
  const updateField = useCallback(
    <K extends keyof FormDraftState>(field: K, value: FormDraftState[K]) => {
      setFormState((prev) => {
        const next = { ...prev, [field]: value };
        autoSaveActiveDraft(next);
        return next;
      });
    },
    [autoSaveActiveDraft]
  );

  // Set the entire form state
  const setEntireForm = useCallback(
    (newState: FormDraftState) => {
      setFormState(newState);
      autoSaveActiveDraft(newState);
    },
    [autoSaveActiveDraft]
  );

  // Discard active draft
  const discardActiveDraft = useCallback(() => {
    try {
      localStorage.removeItem(ACTIVE_DRAFT_KEY);
    } catch (e) {
      console.warn('Failed to remove active draft from localStorage:', e);
    }
    setFormState(INITIAL_FORM_STATE);
    setHasRestoredDraft(false);
  }, []);

  // Save current form into saved drafts list
  const saveToDraftsList = useCallback(
    (stateToSave: FormDraftState): DraftItem => {
      const draft: DraftItem = {
        id: `draft-${Date.now()}`,
        title: stateToSave.title.trim() || `Untitled ${stateToSave.type.toUpperCase()}`,
        type: stateToSave.type,
        description: stateToSave.description,
        category: stateToSave.category,
        location: stateToSave.location,
        event_date: stateToSave.event_date,
        phone_number: stateToSave.phone_number,
        image_preview: stateToSave.image_preview,
        image_key: stateToSave.image_key,
        updatedAt: Date.now(),
      };

      try {
        const existing = localStorage.getItem(SAVED_DRAFTS_KEY);
        const list: DraftItem[] = existing ? JSON.parse(existing) : [];
        const updated = [draft, ...list];
        localStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(updated));
        setSavedDrafts(updated);
      } catch (e) {
        console.warn('Failed to save draft to list:', e);
      }

      return draft;
    },
    []
  );

  // Delete a specific saved draft
  const deleteSavedDraft = useCallback((draftId: string) => {
    try {
      const existing = localStorage.getItem(SAVED_DRAFTS_KEY);
      if (existing) {
        const list: DraftItem[] = JSON.parse(existing);
        const updated = list.filter((d) => d.id !== draftId);
        localStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(updated));
        setSavedDrafts(updated);
      }
    } catch (e) {
      console.warn('Failed to delete draft:', e);
    }
  }, []);

  // Load a saved draft into the active form
  const loadSavedDraft = useCallback(
    (draft: DraftItem) => {
      const state: FormDraftState = {
        type: draft.type,
        title: draft.title,
        description: draft.description,
        category: draft.category,
        location: draft.location,
        event_date: draft.event_date,
        phone_number: draft.phone_number,
        image_preview: draft.image_preview,
        image_key: draft.image_key,
      };
      setFormState(state);
      setHasRestoredDraft(true);
      autoSaveActiveDraft(state);
    },
    [autoSaveActiveDraft]
  );

  return {
    formState,
    updateField,
    setEntireForm,
    restoreActiveDraft,
    discardActiveDraft,
    hasRestoredDraft,
    savedDrafts,
    refreshSavedDrafts,
    saveToDraftsList,
    deleteSavedDraft,
    loadSavedDraft,
    draftsCount: savedDrafts.length,
  };
}
