import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Megaphone,
  BriefcaseBusiness,
  BadgeCheck,
  ChevronRight,
  Smartphone,
  CreditCard,
  Package,
  Calendar,
  MapPin,
  ExternalLink,
  Filter,
  X,
  MoreVertical,
} from 'lucide-react';
import { LeftSidebar } from '@/features/home/components/LeftSidebar';
import { MobileDrawer } from '@/features/home/components/MobileDrawer';
import {
  OfficialAnnouncement,
  Opportunity,
  LostFoundItem,
} from '@/features/home/types';
import { homeService } from '@/features/home/services/homeService';

export type OpportunitiesTab = 'all' | 'official' | 'opportunities' | 'lostfound';

export const OpportunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab state synchronized with URL query parameter
  const tabFromUrl = searchParams.get('tab') as OpportunitiesTab | null;
  const activeTab: OpportunitiesTab =
    tabFromUrl && ['all', 'official', 'opportunities', 'lostfound'].includes(tabFromUrl)
      ? tabFromUrl
      : 'all';

  const [announcements, setAnnouncements] = useState<OfficialAnnouncement[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [lostItems, setLostItems] = useState<LostFoundItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Load announcements, opportunities, and lost items
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      homeService.getAnnouncements(),
      homeService.getOpportunities(),
      homeService.getLostItems(),
    ])
      .then(([annData, oppData, lostData]) => {
        if (isMounted) {
          setAnnouncements(annData);
          setOpportunities(oppData);
          setLostItems(lostData);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load campus updates:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTabChange = (newTab: OpportunitiesTab) => {
    if (newTab === 'all') {
      searchParams.delete('tab');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ tab: newTab });
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // Lost item category icon resolver
  const getLostItemIcon = (item: LostFoundItem) => {
    if (
      item.category === 'phone' ||
      item.title.toLowerCase().includes('phone') ||
      item.title.toLowerCase().includes('iphone')
    ) {
      return <Smartphone className="w-5 h-5 text-textPrimary" />;
    }
    if (
      item.category === 'id_card' ||
      item.title.toLowerCase().includes('id') ||
      item.title.toLowerCase().includes('card')
    ) {
      return <CreditCard className="w-5 h-5 text-textPrimary" />;
    }
    if (
      item.category === 'backpack' ||
      item.title.toLowerCase().includes('backpack') ||
      item.title.toLowerCase().includes('bag')
    ) {
      return <Package className="w-5 h-5 text-textPrimary" />;
    }
    return <Search className="w-5 h-5 text-textPrimary" />;
  };

  // Filtered lists
  const query = searchQuery.trim().toLowerCase();

  const filteredAnnouncements = useMemo(() => {
    if (!query) return announcements;
    return announcements.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.institutionName.toLowerCase().includes(query)
    );
  }, [announcements, query]);

  const filteredOpportunities = useMemo(() => {
    if (!query) return opportunities;
    return opportunities.filter(
      (o) =>
        o.title.toLowerCase().includes(query) ||
        o.organization.toLowerCase().includes(query) ||
        o.type.toLowerCase().includes(query)
    );
  }, [opportunities, query]);

  const filteredLostItems = useMemo(() => {
    if (!query) return lostItems;
    return lostItems.filter(
      (l) =>
        l.title.toLowerCase().includes(query) ||
        l.location.toLowerCase().includes(query) ||
        l.status.toLowerCase().includes(query)
    );
  }, [lostItems, query]);

  const totalCount =
    filteredAnnouncements.length +
    filteredOpportunities.length +
    filteredLostItems.length;

  return (
    <div className="flex h-full h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-textPrimary antialiased">
      {/* 1. Desktop Left Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <LeftSidebar />
      </div>

      {/* 2. Main Scrollable Content */}
      <main className="flex-1 min-h-0 h-full max-h-full overflow-y-auto min-w-0 bg-background flex flex-col">
        {/* Sticky Pinned Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border-subtle shrink-0">
          {/* Top Bar Row */}
          <div className="max-w-4xl mx-auto px-3 sm:px-4 h-[53px] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-textPrimary truncate">
                  Announcements
                </h1>
              </div>
            </div>

            {/* Top Right: 3-Vertical-Dots Menu */}
            <div className="relative">
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
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-1 w-52 rounded-card bg-surface-elevated border border-border-subtle shadow-xl z-50 py-1 animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => {
                        handleTabChange('all');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
                    >
                      <span>All Announcements</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface text-textSecondary">
                        {totalCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleTabChange('official');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-textSecondary shrink-0" />
                        <span>Official</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface text-textSecondary">
                        {filteredAnnouncements.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleTabChange('opportunities');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <BriefcaseBusiness className="w-4 h-4 text-textSecondary shrink-0" />
                        <span>Opportunities</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface text-textSecondary">
                        {filteredOpportunities.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleTabChange('lostfound');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-textSecondary shrink-0" />
                        <span>Lost & Found</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface text-textSecondary">
                        {filteredLostItems.length}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search Bar Row (Matches reference design) */}
          <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-2 pt-0.5">
            <form onSubmit={(e) => e.preventDefault()} className="relative flex items-center gap-2">
              <div className="relative flex-1 flex items-center min-w-0">
                <Search className="absolute left-3.5 w-4 h-4 text-textTertiary pointer-events-none shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search announcements, opportunities, or lost items..."
                  className="w-full pl-10 pr-9 py-2.5 bg-surface border border-border-subtle hover:border-border focus:border-active rounded-card text-textPrimary text-[14px] placeholder:text-textTertiary outline-none transition-colors"
                />
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 p-1 rounded-full text-textTertiary hover:text-textPrimary hover:bg-surface-elevated transition-colors"
                    aria-label="Clear search input"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="px-3.5 sm:px-5 py-2.5 rounded-card bg-active text-activeText font-semibold text-[14px] hover:opacity-95 active:scale-95 transition-all duration-150 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
            </form>
          </div>

          {/* Navigation Filter Tabs */}
          <div className="border-t border-border-subtle bg-background">
            <div className="max-w-4xl mx-auto px-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-2">
              <button
                type="button"
                onClick={() => handleTabChange('all')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 shrink-0 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-active text-activeText shadow-xs'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-elevated'
                }`}
              >
                All
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('official')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'official'
                    ? 'bg-active text-activeText shadow-xs'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-elevated'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Official ({filteredAnnouncements.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('opportunities')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'opportunities'
                    ? 'bg-active text-activeText shadow-xs'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-elevated'
                }`}
              >
                <BriefcaseBusiness className="w-3.5 h-3.5" />
                <span>Opportunities ({filteredOpportunities.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('lostfound')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'lostfound'
                    ? 'bg-active text-activeText shadow-xs'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-elevated'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Lost & Found ({filteredLostItems.length})</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Body - Vertically Scrollable List */}
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 pb-16 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="p-5 rounded-card bg-surface border border-border-subtle animate-pulse space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-elevated" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-1/3 bg-surface-elevated rounded-sm" />
                      <div className="h-3 w-1/4 bg-surface-elevated rounded-sm" />
                    </div>
                  </div>
                  <div className="h-5 w-3/4 bg-surface-elevated rounded-sm" />
                  <div className="h-4 w-1/2 bg-surface-elevated rounded-sm" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Section 1: Official Announcements */}
              {(activeTab === 'all' || activeTab === 'official') &&
                filteredAnnouncements.length > 0 && (
                  <section className="space-y-3">
                    <div className="space-y-3">
                      {filteredAnnouncements.map((ann) => (
                        <article
                          key={ann.id}
                          className="p-4 sm:p-5 rounded-card bg-surface border border-border-subtle hover:border-border transition-colors duration-150 flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {ann.institutionLogoUrl ? (
                                <img
                                  src={ann.institutionLogoUrl}
                                  alt={ann.institutionName}
                                  className="w-10 h-10 rounded-full object-cover border border-border-subtle shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center font-bold text-textPrimary shrink-0">
                                  {ann.institutionName.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h3 className="font-bold text-[14px] sm:text-[15px] text-textPrimary truncate">
                                    {ann.institutionName}
                                  </h3>
                                  {ann.isOfficial && (
                                    <BadgeCheck className="w-4 h-4 text-verification shrink-0" />
                                  )}
                                </div>
                                <p className="text-[12px] text-textTertiary flex items-center gap-1.5 mt-0.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{ann.date}</span>
                                </p>
                              </div>
                            </div>

                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-elevated text-textSecondary border border-border-subtle shrink-0">
                              Official
                            </span>
                          </div>

                          <div>
                            <p className="text-[13.5px] font-normal text-textSecondary leading-relaxed">
                              {ann.title}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-border-subtle flex items-center justify-end">
                            <button
                              type="button"
                              className="px-3.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-border text-textSecondary hover:text-textPrimary text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span>View Notice</span>
                              <ChevronRight className="w-4 h-4 text-textTertiary" />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

              {/* Section 2: Opportunities */}
              {(activeTab === 'all' || activeTab === 'opportunities') &&
                filteredOpportunities.length > 0 && (
                  <section className="space-y-3">
                    <div className="space-y-3">
                      {filteredOpportunities.map((opp) => (
                        <article
                          key={opp.id}
                          className="p-4 sm:p-5 rounded-card bg-surface border border-border-subtle hover:border-border transition-colors duration-150 flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {opp.organizationLogoUrl ? (
                                <img
                                  src={opp.organizationLogoUrl}
                                  alt={opp.organization}
                                  className="w-10 h-10 rounded-full object-cover border border-border-subtle shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center font-bold text-textPrimary shrink-0">
                                  {opp.organization.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h3 className="font-bold text-[14px] sm:text-[15px] text-textPrimary truncate">
                                    {opp.organization}
                                  </h3>
                                  {opp.isOfficial && (
                                    <BadgeCheck className="w-4 h-4 text-verification shrink-0" />
                                  )}
                                </div>
                                <p className="text-[12px] text-textTertiary mt-0.5">
                                  {opp.deadlineOrDate}
                                </p>
                              </div>
                            </div>

                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-elevated text-textSecondary border border-border-subtle shrink-0">
                              {opp.type}
                            </span>
                          </div>

                          <div>
                            <p className="text-[13.5px] font-normal text-textSecondary leading-relaxed">
                              {opp.title}
                            </p>
                            {opp.location && (
                              <p className="text-[12px] text-textTertiary flex items-center gap-1.5 mt-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{opp.location}</span>
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-border-subtle flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="px-4 py-1.5 rounded-lg bg-active text-activeText font-medium text-[12.5px] hover:opacity-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span>Apply / View</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

              {/* Section 3: Lost & Found */}
              {(activeTab === 'all' || activeTab === 'lostfound') &&
                filteredLostItems.length > 0 && (
                  <section className="space-y-3">
                    <div className="space-y-3">
                      {filteredLostItems.map((item) => (
                        <article
                          key={item.id}
                          className="p-4 sm:p-5 rounded-card bg-surface border border-border-subtle hover:border-border transition-colors duration-150 flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0">
                                {getLostItemIcon(item)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                                      item.status === 'Lost'
                                        ? 'text-danger bg-danger/10 border border-danger/20'
                                        : 'text-textPrimary bg-surface-elevated border border-border-subtle'
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                  <p className="text-[12px] text-textTertiary">
                                    {item.timeAgo}
                                  </p>
                                </div>
                                <p className="text-[13.5px] font-normal text-textSecondary leading-relaxed mt-1">
                                  {item.title}
                                </p>
                                <p className="text-[12px] text-textTertiary flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>{item.location}</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-border-subtle flex items-center justify-end">
                            <button
                              type="button"
                              className="px-3.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-border text-textSecondary hover:text-textPrimary text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span>Contact / Claim</span>
                              <ChevronRight className="w-4 h-4 text-textTertiary" />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

              {/* Empty state when query or active tab has 0 matches */}
              {totalCount === 0 && (
                <div className="p-10 rounded-card bg-surface border border-border-subtle text-center space-y-3">
                  <Search className="w-10 h-10 text-textTertiary mx-auto opacity-50" />
                  <h3 className="font-semibold text-base text-textPrimary">No results found</h3>
                  <p className="text-[13px] text-textTertiary max-w-sm mx-auto">
                    {searchQuery
                      ? `No updates matching "${searchQuery}". Try different search terms.`
                      : 'There are currently no items in this category.'}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-4 py-2 rounded-card bg-surface-elevated hover:bg-surface border border-border-subtle text-textPrimary text-[13px] font-medium transition-colors cursor-pointer"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Drawer Navigation Menu */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onOpen={() => setIsDrawerOpen(true)}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};
