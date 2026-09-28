import { useMutation, useQueryClient } from '@tanstack/react-query';
import { researchService } from '@/features/research/services/researchService';
import { RESEARCH_KEYS, SavePaperInput, SavedPaper } from '@/features/research/types';

/**
 * Mutation hook for saving and removing paper bookmarks.
 * Updates query cache optimistically and invalidates the saved papers list.
 */
export function useSavePaper() {
  const queryClient = useQueryClient();

  const saveMutation = useMutation<SavedPaper, Error, SavePaperInput>({
    mutationFn: (input: SavePaperInput) => researchService.savePaper(input),
    onSuccess: () => {
      // Invalidate saved papers list so newly bookmarked papers appear immediately
      queryClient.invalidateQueries({ queryKey: RESEARCH_KEYS.all });
    },
  });

  const removeMutation = useMutation<void, Error, string>({
    mutationFn: (externalId: string) =>
      researchService.removeSavedPaperByExternalId(externalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_KEYS.all });
    },
  });

  const removeByIdMutation = useMutation<void, Error, string>({
    mutationFn: (id: string) => researchService.removeSavedPaper(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESEARCH_KEYS.all });
    },
  });

  return {
    savePaper: saveMutation.mutateAsync,
    removeSavedPaper: removeMutation.mutateAsync,
    removeSavedPaperById: removeByIdMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isRemoving: removeMutation.isPending || removeByIdMutation.isPending,
  };
}
