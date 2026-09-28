import React, { useState, useMemo } from 'react';
import {
  Microscope,
  Bookmark,
  Search,
  AlertCircle,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Menu,
  MoreVertical,
  ArrowLeft,
} from 'lucide-react';
import { LeftSidebar } from '@/features/home/components/LeftSidebar';
import { MobileDrawer } from '@/features/home/components/MobileDrawer';
import { useAuth } from '@/features/auth';
import { usePaperSearch, useSavedPapers, useSavePaper } from '@/features/research/hooks';
import { ResearchSearchBar, PaperCard, PaperSkeleton } from '@/features/research/components';
import { ScholarXivPaper, SavePaperInput } from '@/features/research/types';

type ResearchTab = 'explore' | 'saved';

export const ResearchPage: React.FC = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ResearchTab>('explore');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('Machine Learning');
  const [currentPage, setCurrentPage] = useState(0);

  // Queries
  const {
    data: searchData,
    isLoading: isSearchLoading,
    isError: isSearchError,
    error: searchError,
    refetch: refetchSearch,
  } = usePaperSearch({
    query: searchQuery,
    page: currentPage,
    limit: 15,
    enabled: Boolean(searchQuery.trim()),
  });

  const {
    data: savedData,
    isLoading: isSavedLoading,
    isError: isSavedError,
    refetch: refetchSaved,
  } = useSavedPapers(0, 50);

  const { savePaper, removeSavedPaper, isSaving } = useSavePaper();

  // Safely extract papers and savedPapers arrays regardless of envelope unwrapping
  const papers: ScholarXivPaper[] = useMemo(() => {
    if (!searchData) return [];
    if (Array.isArray(searchData)) return searchData;
    if (Array.isArray(searchData.data)) return searchData.data;
    return [];
  }, [searchData]);

  const savedPapers = useMemo(() => {
    if (!savedData) return [];
    if (Array.isArray(savedData)) return savedData;
    if (Array.isArray(savedData.data)) return savedData.data;
    return [];
  }, [savedData]);

  // Create a fast lookup Set of saved external paper IDs
  const savedExternalIds = useMemo(() => {
    const ids = new Set<string>();
    savedPapers.forEach((p) => {
      if (p.external_paper_id) ids.add(p.external_paper_id);
    });
    return ids;
  }, [savedPapers]);

  // Handle search submission (triggered on explicit button click or Enter key)
  const handleSearch = (newQuery: string) => {
    setSearchQuery(newQuery);
    setCurrentPage(0);
  };

  // Handle toggling bookmark for a paper
  const handleToggleSave = async (paper: ScholarXivPaper) => {
    const paperId = paper.extractedID || paper.id;
    const isCurrentlySaved = savedExternalIds.has(paperId);

    if (isCurrentlySaved) {
      await removeSavedPaper(paperId);
    } else {
      const input: SavePaperInput = {
        external_paper_id: paperId,
        title: paper.title,
        paper_url: paper.absLink || `https://arxiv.org/abs/${paperId}`,
        authors: paper.authors || [],
        summary: paper.summary || '',
        pdf_url: paper.pdfLink || `https://arxiv.org/pdf/${paperId}.pdf`,
      };
      await savePaper(input);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-textPrimary antialiased">
      {/* 1. Desktop Left Navigation Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <LeftSidebar />
      </div>

      {/* 2. Main Research Center Content */}
      <main className="flex-1 h-screen overflow-y-auto min-w-0 bg-background flex flex-col">
        {/* Pinned Top Header (Contains Header Bar and Search Bar so papers scroll UNDER them) */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border-subtle shrink-0">
          {/* Top Bar Row */}
          <div className="max-w-4xl mx-auto px-3 sm:px-4 h-[53px] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {activeTab === 'saved' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('explore')}
                  className="p-1.5 -ml-1 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer shrink-0"
                  aria-label="Back to explore"
                >
                  <ArrowLeft className="w-5 h-5 text-textPrimary" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="lg:hidden p-1.5 -ml-1 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer shrink-0"
                  aria-label="Open mobile menu"
                >
                  <Menu className="w-5 h-5 text-textPrimary" />
                </button>
              )}

              <div className="flex items-center gap-2 min-w-0">
                {activeTab === 'saved' ? (
                  <>
                    <Bookmark className="w-5 h-5 text-textPrimary shrink-0" />
                    <h1 className="text-base sm:text-lg font-bold tracking-tight text-textPrimary truncate">
                      Saved Papers
                    </h1>
                  </>
                ) : (
                  <>
                    <Microscope className="w-5 h-5 text-textPrimary shrink-0" />
                    <h1 className="text-base sm:text-lg font-bold tracking-tight text-textPrimary truncate">
                      Research Papers
                    </h1>
                  </>
                )}
              </div>
            </div>

            {/* Desktop / Tablet: Saved Papers Button */}
            <div className="hidden sm:flex items-center gap-2">
              {activeTab === 'saved' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('explore')}
                  className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border-subtle text-[13px] font-semibold text-textPrimary transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Microscope className="w-4 h-4" />
                  <span>Back to Explore</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('saved')}
                  className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border-subtle text-[13px] font-semibold text-textSecondary hover:text-textPrimary transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved</span>
                  {savedData?.pagination?.total !== undefined && savedData.pagination.total > 0 && (
                    <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-surface text-textSecondary font-bold">
                      {savedData.pagination.total}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Mobile View: Vertical 3-Dot Button at Top Right Header */}
            <div className="sm:hidden relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="p-1.5 -mr-1 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer"
                aria-label="More options"
                aria-expanded={isMenuOpen}
              >
                <MoreVertical className="w-5 h-5 text-textPrimary" />
              </button>

              {/* 3-Dot Dropdown Menu */}
              {isMenuOpen && (
                <>
                  {/* Backdrop to close on tap outside */}
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-1 w-44 rounded-card bg-surface-elevated border border-border-subtle shadow-xl z-50 py-1">
                    {activeTab === 'saved' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('explore');
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
                      >
                        <Microscope className="w-4 h-4 text-textSecondary shrink-0" />
                        <span>Explore Papers</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('saved');
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <Bookmark className="w-4 h-4 text-textSecondary shrink-0" />
                          <span>Saved Papers</span>
                        </div>
                        {savedData?.pagination?.total !== undefined && savedData.pagination.total > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface text-textSecondary leading-none">
                            {savedData.pagination.total}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sticky Search Bar (Inside pinned header so papers scroll under it) */}
          {activeTab === 'explore' && (
            <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-3 pt-1">
              <ResearchSearchBar
                initialValue={searchQuery}
                isLoading={isSearchLoading}
                onSearch={handleSearch}
              />
            </div>
          )}
        </header>

        {/* Content Body */}
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 pb-24 space-y-6">
          {activeTab === 'explore' && (
            <>

              {/* Search Results Status or Header */}
              {searchQuery && !isSearchLoading && !isSearchError && (
                <div className="flex items-center justify-between text-[13px] text-textTertiary pt-1">
                  <p>
                    Showing results for <span className="font-semibold text-textPrimary">"{searchQuery}"</span>
                  </p>
                  {searchData?.pagination?.page !== undefined && (
                    <span>Page {searchData.pagination.page + 1}</span>
                  )}
                </div>
              )}

              {/* Loading State */}
              {isSearchLoading && (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <PaperSkeleton key={i} />
                  ))}
                </div>
              )}

              {/* Error State */}
              {isSearchError && (
                <div className="p-6 rounded-card bg-surface border border-border-subtle text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-danger mx-auto" />
                  <h3 className="font-semibold text-textPrimary">Failed to search papers</h3>
                  <p className="text-[13px] text-textTertiary max-w-md mx-auto">
                    {searchError instanceof Error ? searchError.message : 'Could not retrieve papers from ScholarXiv.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => refetchSearch()}
                    className="px-4 py-2 rounded-card bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-border text-textPrimary text-[13px] font-medium transition-colors cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Empty Results State */}
              {!isSearchLoading && !isSearchError && papers.length === 0 && (
                <div className="p-10 rounded-card bg-surface border border-border-subtle text-center space-y-3">
                  <Search className="w-10 h-10 text-textTertiary mx-auto opacity-60" />
                  <h3 className="font-semibold text-base text-textPrimary">No papers found</h3>
                  <p className="text-[13px] text-textTertiary max-w-sm mx-auto">
                    We couldn't find any papers matching "{searchQuery}". Try different keywords or check out suggested topics above.
                  </p>
                </div>
              )}

              {/* Papers List */}
              {!isSearchLoading && !isSearchError && papers.length > 0 && (
                <div className="space-y-4">
                  {papers.map((paper) => {
                    const paperId = paper.extractedID || paper.id;
                    const isSaved = savedExternalIds.has(paperId);

                    return (
                      <PaperCard
                        key={paperId || paper.title}
                        paper={paper}
                        isSaved={isSaved}
                        isSaving={isSaving}
                        onToggleSave={() => handleToggleSave(paper)}
                      />
                    );
                  })}

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                    <button
                      type="button"
                      disabled={currentPage <= 0 || isSearchLoading}
                      onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                      className="px-3.5 py-2 rounded-card bg-surface border border-border-subtle hover:border-border text-textPrimary text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    <span className="text-[13px] text-textTertiary font-medium">
                      Page {currentPage + 1}
                    </span>

                    <button
                      type="button"
                      disabled={!searchData.pagination?.hasMore || isSearchLoading}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      className="px-3.5 py-2 rounded-card bg-surface border border-border-subtle hover:border-border text-textPrimary text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'saved' && (
            <>
              {/* Unauthenticated State */}
              {!isAuthenticated ? (
                <div className="p-8 sm:p-12 rounded-card bg-surface border border-border-subtle text-center space-y-4 max-w-md mx-auto my-8">
                  <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border flex items-center justify-center mx-auto text-textPrimary">
                    <Bookmark className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-textPrimary">
                      Save research for later
                    </h3>
                    <p className="text-[13px] text-textTertiary leading-relaxed">
                      Sign in to your TemariCom account to bookmark and organize academic research papers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="px-5 py-2.5 rounded-card bg-active text-activeText font-semibold text-[14px] hover:opacity-95 transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Saved Papers Loading */}
                  {isSavedLoading && (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <PaperSkeleton key={i} />
                      ))}
                    </div>
                  )}

                  {/* Saved Papers Error */}
                  {isSavedError && (
                    <div className="p-6 rounded-card bg-surface border border-border-subtle text-center space-y-3">
                      <AlertCircle className="w-8 h-8 text-danger mx-auto" />
                      <h3 className="font-semibold text-textPrimary">Failed to load saved papers</h3>
                      <button
                        type="button"
                        onClick={() => refetchSaved()}
                        className="px-4 py-2 rounded-card bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-border text-textPrimary text-[13px] font-medium transition-colors cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Empty Saved State */}
                  {!isSavedLoading && !isSavedError && savedPapers.length === 0 && (
                    <div className="p-10 rounded-card bg-surface border border-border-subtle text-center space-y-3">
                      <Bookmark className="w-10 h-10 text-textTertiary mx-auto opacity-50" />
                      <h3 className="font-semibold text-base text-textPrimary">No saved papers yet</h3>
                      <p className="text-[13px] text-textTertiary max-w-sm mx-auto">
                        Explore research papers and click the Save button to build your personal academic library.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('explore')}
                        className="mt-2 px-4 py-2 rounded-card bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-border text-textPrimary text-[13px] font-medium transition-colors cursor-pointer"
                      >
                        Explore Papers
                      </button>
                    </div>
                  )}

                  {/* Saved Papers List */}
                  {!isSavedLoading && !isSavedError && savedPapers.length > 0 && (
                    <div className="space-y-4">
                      {savedPapers.map((savedPaper) => (
                        <PaperCard
                          key={savedPaper.id || savedPaper.external_paper_id}
                          paper={savedPaper}
                          isSaved={true}
                          isSaving={isSaving}
                          onToggleSave={async () => {
                            await removeSavedPaper(savedPaper.external_paper_id);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* 3. Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};
