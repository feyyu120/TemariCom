/**
 * Research Module Frontend Types & DTOs
 * Strictly mirrors TemariCom Go Backend Research Module
 */

export interface ScholarXivPaper {
  id: string;
  extractedID: string;
  baseArxivID?: string;
  title: string;
  summary: string;
  authors: string[];
  primaryCategory: string;
  category: string[];
  pdfLink: string;
  absLink: string;
  published: string;
  updated: string;
  doi?: string;
  journalRef?: string;
  comment?: string;
  latestVersion?: string;
  submitter?: string;
  is_saved?: boolean;
}

export interface ScholarXivPagination {
  page: number;
  limit: number;
  hasMore: boolean;
  nextPage?: number | null;
  total?: number;
}

export interface SearchPapersResponse {
  data: ScholarXivPaper[];
  pagination: ScholarXivPagination;
}

export interface SavedPaper {
  id: string;
  user_id: string;
  external_paper_id: string;
  title: string;
  paper_url: string;
  authors: string[];
  summary: string;
  pdf_url: string;
  created_at: string;
}

export interface SavePaperInput {
  external_paper_id: string;
  title: string;
  paper_url: string;
  authors?: string[];
  summary?: string;
  pdf_url?: string;
}

export interface SavedPapersPagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface SavedPapersResponse {
  data: SavedPaper[];
  pagination: SavedPapersPagination;
}

export const RESEARCH_KEYS = {
  all: ['research'] as const,
  search: (query: string, page: number) =>
    [...RESEARCH_KEYS.all, 'search', query, page] as const,
  paper: (id: string) => [...RESEARCH_KEYS.all, 'paper', id] as const,
  saved: (page: number) => [...RESEARCH_KEYS.all, 'saved', page] as const,
  checkSaved: (externalId: string) =>
    [...RESEARCH_KEYS.all, 'check-saved', externalId] as const,
};
