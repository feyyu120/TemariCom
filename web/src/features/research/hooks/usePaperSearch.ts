import { useQuery } from '@tanstack/react-query';
import { researchService } from '@/features/research/services/researchService';
import { RESEARCH_KEYS, SearchPapersResponse } from '@/features/research/types';

interface UsePaperSearchOptions {
  query: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook to search academic research papers on ScholarXiv.
 * Cached for 10 minutes to minimize upstream API consumption and respect rate limits.
 */
export function usePaperSearch({
  query,
  page = 0,
  limit = 20,
  enabled = true,
}: UsePaperSearchOptions) {
  const cleanQuery = query.trim();

  return useQuery<SearchPapersResponse>({
    queryKey: RESEARCH_KEYS.search(cleanQuery, page),
    queryFn: () => researchService.searchPapers(cleanQuery, page, limit),
    enabled: enabled && cleanQuery.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
    placeholderData: (prev) => prev,
  });
}
