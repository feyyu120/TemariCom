import { useQuery } from '@tanstack/react-query';
import { researchService } from '@/features/research/services/researchService';
import { RESEARCH_KEYS, SavedPapersResponse } from '@/features/research/types';
import { useAuth } from '@/features/auth';

/**
 * Hook to retrieve the authenticated user's bookmarked papers.
 */
export function useSavedPapers(page = 0, limit = 20) {
  const { isAuthenticated } = useAuth();

  return useQuery<SavedPapersResponse>({
    queryKey: RESEARCH_KEYS.saved(page),
    queryFn: () => researchService.listSavedPapers(page, limit),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}
