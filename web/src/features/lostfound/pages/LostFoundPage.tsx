import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  FileText,
  Search,
  X,
  SlidersHorizontal,
  MapPin,
  RefreshCw,
  Package,
  MoreVertical,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { LeftSidebar } from '@/features/home/components/LeftSidebar';
import { MobileDrawer } from '@/features/home/components/MobileDrawer';
import { lostFoundService } from '@/features/lostfound/services/lostFoundService';
import { LostFoundItem, LostFoundType } from '@/features/lostfound/types';
import { LostFoundCard } from '@/features/lostfound/components/LostFoundCard';
import { PostItemModal } from '@/features/lostfound/components/PostItemModal';
import { DraftsModal } from '@/features/lostfound/components/DraftsModal';
import { ItemDetailModal } from '@/features/lostfound/components/ItemDetailModal';
import { YourPostsModal } from '@/features/lostfound/components/YourPostsModal';
import { EditItemModal } from '@/features/lostfound/components/EditItemModal';
import { useLostFoundDraft } from '@/features/lostfound/hooks/useLostFoundDraft';

export const LostFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active filter tab from query params: 'all' | 'lost' | 'found'
  const tabFromUrl = searchParams.get('type') as LostFoundType | null;
  const activeType: 'all' | LostFoundType =
    tabFromUrl && (tabFromUrl === 'lost' || tabFromUrl === 'found') ? tabFromUrl : 'all';

  // Items & Feed state
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [onlyMyCampus, setOnlyMyCampus] = useState<boolean>(false);
  const [savedItemIds, setSavedItemIds] = useState<string[]>(() => lostFoundService.getSavedItemIds());

  const { user, isAuthenticated, openAuthModal } = useAuth();

  // Modals state
  const [isPostModalOpen, setIsPostModalOpen] = useState<boolean>(false);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState<boolean>(false);
  const [isYourPostsModalOpen, setIsYourPostsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<LostFoundItem | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<LostFoundItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // User's own posted items (real authenticated user only)
  const userPosts = useMemo(() => {
    if (!user?.id) {
      return [];
    }
    return items.filter((i) => i.user_id === user.id);
  }, [items, user]);

  // Draft management hook
  const {
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
    draftsCount,
  } = useLostFoundDraft();

  // Fetch items from service / backend (all statuses so both active and resolved items are accessible)
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await lostFoundService.getItems({
        type: activeType === 'all' ? undefined : activeType,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: searchQuery.trim() || undefined,
        status: 'all',
      });
      setItems(res.items);
    } catch (err) {
      console.error('Failed to fetch lost & found items:', err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeType, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Tab switch handler
  const handleTypeChange = (newType: 'all' | LostFoundType) => {
    if (newType === 'all') {
      searchParams.delete('type');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ type: newType });
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // Toggle bookmark/save for item (requires authentication)
  const handleToggleSave = (item: LostFoundItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    lostFoundService.toggleSaveItem(item.id);
    setSavedItemIds(lostFoundService.getSavedItemIds());
  };

  // Change item status (e.g. resolve)
  const handleStatusChange = async (itemId: string, newStatus: 'active' | 'resolved' | 'closed') => {
    try {
      const updated = await lostFoundService.updateItem(itemId, { status: newStatus });
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
      if (selectedItemDetail?.id === itemId) {
        setSelectedItemDetail(updated);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    try {
      await lostFoundService.deleteItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      if (selectedItemDetail?.id === itemId) {
        setSelectedItemDetail(null);
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  // Newly created item callback
  const handleItemCreated = (newItem: LostFoundItem) => {
    setItems((prev) => [newItem, ...prev]);
    refreshSavedDrafts();
  };

  // Client-side quick filter (status & campus)
  const displayedItems = useMemo(() => {
    let result = items;
    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }
    if (onlyMyCampus) {
      result = result.filter((item) =>
        (item.location || '').toLowerCase().includes('astu')
      );
    }
    return result;
  }, [items, statusFilter, onlyMyCampus]);

  return (
    <div className="flex h-full h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-textPrimary antialiased select-none">
      {/* 1. Desktop Left Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <LeftSidebar />
      </div>

      {/* 2. Main Scrollable Content */}
      <main className="flex-1 min-h-0 h-full max-h-full overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden min-w-0 bg-background flex flex-col">
        {/* Sticky Mobile/Desktop Top Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border-subtle shrink-0">
          {/* Top Bar Row */}
          <div className="max-w-4xl mx-auto px-3 sm:px-4 h-[53px] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-textPrimary truncate">
                  Lost Item
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
                        setIsMenuOpen(false);
                        if (!isAuthenticated) {
                          openAuthModal('login');
                          return;
                        }
                        setIsPostModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
                    >
                      <Plus className="w-4 h-4 text-textSecondary shrink-0" />
                      <span>Post an Item</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDraftsModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-textSecondary shrink-0" />
                        <span>Saved Drafts</span>
                      </div>
                      {draftsCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-unread text-white leading-none">
                          {draftsCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (!isAuthenticated) {
                          openAuthModal('login');
                          return;
                        }
                        setIsYourPostsModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-medium text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Package className="w-4 h-4 text-textSecondary shrink-0" />
                        <span>Your Posts</span>
                      </div>
                      {userPosts.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface text-textSecondary leading-none">
                          {userPosts.length}
                        </span>
                      )}
                    </button>

                    <div className="h-[1px] bg-border-subtle my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        fetchItems();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-textSecondary hover:text-textPrimary hover:bg-surface transition-colors cursor-pointer text-left"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh Feed</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search Bar Row (Matches reference design) */}
          <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-2 pt-0.5">
            <form onSubmit={(e) => { e.preventDefault(); fetchItems(); }} className="relative flex items-center gap-2">
              <div className="relative flex-1 flex items-center min-w-0">
                <Search className="absolute left-3.5 w-4 h-4 text-textTertiary pointer-events-none shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lost or found items by keyword, location, or tag..."
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
                disabled={isLoading}
                className="px-3.5 sm:px-5 py-2.5 rounded-card bg-active text-activeText font-semibold text-[14px] hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all duration-150 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Filter Tabs & Selectors Row */}
          <div className="border-t border-border-subtle bg-background">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-2">
              <button
                type="button"
                onClick={() => handleTypeChange('all')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 shrink-0 cursor-pointer ${
                  activeType === 'all'
                    ? 'bg-active text-activeText shadow-xs'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-elevated'
                }`}
              >
                All
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('lost')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 shrink-0 cursor-pointer ${
                  activeType === 'lost'
                    ? 'bg-active text-activeText shadow-xs'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-elevated'
                }`}
              >
                Lost
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('found')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 shrink-0 cursor-pointer ${
                  activeType === 'found'
                    ? 'bg-active text-activeText shadow-xs'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-elevated'
                }`}
              >
                Found
              </button>

              <div className="h-4 w-[1px] bg-border-subtle mx-1 shrink-0" />

              {/* Campus filter toggle */}
              <button
                type="button"
                onClick={() => setOnlyMyCampus((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                  onlyMyCampus
                    ? 'bg-active text-activeText border-active'
                    : 'bg-surface text-textSecondary border-border-subtle hover:text-textPrimary hover:bg-surface-elevated'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>My University</span>
              </button>

              {/* Status selector */}
              <div className="relative shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium bg-surface text-textSecondary border border-border-subtle hover:border-border hover:text-textPrimary outline-none transition-colors cursor-pointer appearance-none pr-7"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="resolved">Resolved</option>
                </select>
                <SlidersHorizontal className="w-3 h-3 text-textTertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Category selector */}
              <div className="relative shrink-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium bg-surface text-textSecondary border border-border-subtle hover:border-border hover:text-textPrimary outline-none transition-colors cursor-pointer appearance-none pr-7"
                >
                  <option value="all">All Categories</option>
                  <option value="id_card">ID & Documents</option>
                  <option value="electronics">Electronics</option>
                  <option value="backpack">Bags & Backpacks</option>
                  <option value="keys">Keys</option>
                  <option value="clothing">Clothing</option>
                  <option value="other">Other</option>
                </select>
                <SlidersHorizontal className="w-3 h-3 text-textTertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </header>

        {/* Content Body Container */}
        <div className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-5 pb-16 space-y-5">

          {/* ================================================================= */}
          {/* Feed List of Cards                                                */}
          {/* ================================================================= */}
          <section className="space-y-3 pt-1">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-surface border border-border-subtle animate-pulse flex items-start gap-4"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-surface-elevated shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 w-3/5 bg-surface-elevated rounded-sm" />
                      <div className="h-3 w-2/5 bg-surface-elevated rounded-sm" />
                      <div className="h-3 w-1/3 bg-surface-elevated rounded-sm mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayedItems.length === 0 ? (
              <div className="text-center py-14 px-4 bg-surface border border-border-subtle rounded-2xl space-y-3">
                <Search className="w-10 h-10 text-textTertiary mx-auto opacity-40" />
                <h3 className="font-semibold text-base text-textPrimary">No items found</h3>
                <p className="text-[13px] text-textTertiary max-w-sm mx-auto">
                  {searchQuery
                    ? `No items matching "${searchQuery}". Try different keywords or filters.`
                    : 'There are currently no items listed under this section.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      openAuthModal('login');
                      return;
                    }
                    setIsPostModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-active text-activeText text-[13px] font-semibold hover:opacity-95 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post an Item</span>
                </button>
              </div>
            ) : (
              displayedItems.map((item) => (
                <LostFoundCard
                  key={item.id}
                  item={item}
                  isSaved={savedItemIds.includes(item.id)}
                  onToggleSave={handleToggleSave}
                  onClick={(clickedItem) => setSelectedItemDetail(clickedItem)}
                />
              ))
            )}
          </section>
        </div>
      </main>

      {/* Post Item Modal (with auto-saving draft) */}
      <PostItemModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onItemCreated={handleItemCreated}
        formState={formState}
        updateField={updateField}
        setEntireForm={setEntireForm}
        restoreActiveDraft={restoreActiveDraft}
        discardActiveDraft={discardActiveDraft}
        saveToDraftsList={saveToDraftsList}
        hasRestoredDraft={hasRestoredDraft}
      />

      {/* Saved Drafts List Modal */}
      <DraftsModal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        drafts={savedDrafts}
        onSelectDraft={(draft) => {
          loadSavedDraft(draft);
          setIsPostModalOpen(true);
        }}
        onDeleteDraft={deleteSavedDraft}
      />

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItemDetail}
        isOpen={Boolean(selectedItemDetail)}
        onClose={() => setSelectedItemDetail(null)}
        isSaved={selectedItemDetail ? savedItemIds.includes(selectedItemDetail.id) : false}
        onToggleSave={(item) => handleToggleSave(item)}
        onStatusChange={handleStatusChange}
        onDeleteItem={handleDeleteItem}
      />

      {/* Your Posts Management Modal */}
      <YourPostsModal
        isOpen={isYourPostsModalOpen}
        onClose={() => setIsYourPostsModalOpen(false)}
        items={userPosts}
        onOpenPostModal={() => setIsPostModalOpen(true)}
        onEditItem={(item) => setEditingItem(item)}
        onDeleteItem={handleDeleteItem}
        onToggleStatus={handleStatusChange}
        onSelectItem={(item) => setSelectedItemDetail(item)}
      />

      {/* Edit Item Modal */}
      <EditItemModal
        item={editingItem}
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        onItemUpdated={(updated) => {
          setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          if (selectedItemDetail?.id === updated.id) {
            setSelectedItemDetail(updated);
          }
        }}
      />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onOpen={() => setIsDrawerOpen(true)}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};

export default LostFoundPage;
