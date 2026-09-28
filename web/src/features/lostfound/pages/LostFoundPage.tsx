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
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { LeftSidebar } from '@/features/home/components/LeftSidebar';
import { RightSidebar } from '@/features/home/components/RightSidebar';
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
    <div className="flex h-screen w-screen overflow-hidden bg-background text-textPrimary antialiased select-none">
      {/* 1. Desktop Left Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <LeftSidebar />
      </div>

      {/* 2. Main Scrollable Content */}
      <main className="flex-1 h-screen overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden min-w-0 bg-background flex flex-col">
        {/* Sticky Mobile/Desktop Top Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border-subtle shrink-0">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={handleBack}
                className="lg:hidden p-1.5 -ml-1 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors cursor-pointer shrink-0"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-textPrimary" />
              </button>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-textPrimary truncate">
                Lost & Found
              </h1>
            </div>

            <button
              type="button"
              onClick={fetchItems}
              disabled={isLoading}
              className="p-2 rounded-full hover:bg-surface-elevated text-textTertiary hover:text-textPrimary transition-colors cursor-pointer"
              title="Refresh feed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Content Body Container */}
        <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 pb-20 space-y-5">
          {/* ================================================================= */}
          {/* Quick Access Section: Post Item, Drafts, Your Posts              */}
          {/* ================================================================= */}
          <section className="space-y-2.5">
            <h2 className="text-[13px] font-bold text-textPrimary">Quick Access</h2>

            <div className="flex items-center gap-5">
              {/* Post Item Action Button */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      openAuthModal('login');
                      return;
                    }
                    setIsPostModalOpen(true);
                  }}
                  className="w-14 h-14 rounded-full border border-border hover:border-active bg-surface hover:bg-surface-elevated flex items-center justify-center text-textPrimary shadow-sm hover:scale-105 transition-all duration-150 cursor-pointer active:scale-95 group"
                  aria-label="Post an item"
                >
                  <Plus className="w-6 h-6 text-textPrimary group-hover:text-textPrimary" />
                </button>
                <span className="text-[12px] font-medium text-textPrimary">Post Item</span>
              </div>

              {/* Drafts Action Button (with unread badge color) */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDraftsModalOpen(true)}
                    className="w-14 h-14 rounded-full border border-border hover:border-active bg-surface hover:bg-surface-elevated flex items-center justify-center text-textPrimary shadow-sm hover:scale-105 transition-all duration-150 cursor-pointer active:scale-95 group"
                    aria-label="View saved drafts"
                  >
                    <FileText className="w-6 h-6 text-textPrimary" />
                  </button>

                  {draftsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-unread text-white text-[10.5px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background shadow-xs">
                      {draftsCount}
                    </span>
                  )}
                </div>
                <span className="text-[12px] font-medium text-textPrimary">Drafts</span>
              </div>

              {/* Your Posts Action Button (badges removed) */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      openAuthModal('login');
                      return;
                    }
                    setIsYourPostsModalOpen(true);
                  }}
                  className="w-14 h-14 rounded-full border border-border hover:border-active bg-surface hover:bg-surface-elevated flex items-center justify-center text-textPrimary shadow-sm hover:scale-105 transition-all duration-150 cursor-pointer active:scale-95 group"
                  aria-label="View your posts"
                >
                  <Package className="w-6 h-6 text-textPrimary" />
                </button>
                <span className="text-[12px] font-medium text-textPrimary">Your Posts</span>
              </div>
            </div>
          </section>

          {/* ================================================================= */}
          {/* Search Bar & Options (All, Lost, Found) Below Searchbar           */}
          {/* ================================================================= */}
          <section className="space-y-3 pt-1">
            {/* Search Input Bar */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lost or found items..."
                className="w-full pl-4 pr-10 py-2.5 bg-surface border border-border-subtle hover:border-border focus:border-active rounded-xl text-textPrimary text-[13.5px] placeholder:text-textTertiary outline-none transition-colors shadow-xs"
              />
              <div className="absolute right-3 flex items-center gap-1.5">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-full text-textTertiary hover:text-textPrimary transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <Search className="w-4.5 h-4.5 text-textTertiary pointer-events-none" />
                )}
              </div>
            </div>

            {/* Segmented Filter Pills (All, Lost, Found) BELOW Searchbar */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('all')}
                className={`py-2 px-3 rounded-xl text-[13px] font-semibold transition-all duration-150 cursor-pointer border text-center ${
                  activeType === 'all'
                    ? 'bg-active text-activeText border-active shadow-xs'
                    : 'bg-surface text-textSecondary border-border-subtle hover:text-textPrimary hover:bg-surface-elevated'
                }`}
              >
                All
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('lost')}
                className={`py-2 px-3 rounded-xl text-[13px] font-semibold transition-all duration-150 cursor-pointer border text-center ${
                  activeType === 'lost'
                    ? 'bg-active text-activeText border-active shadow-xs'
                    : 'bg-surface text-textSecondary border-border-subtle hover:text-textPrimary hover:bg-surface-elevated'
                }`}
              >
                Lost
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('found')}
                className={`py-2 px-3 rounded-xl text-[13px] font-semibold transition-all duration-150 cursor-pointer border text-center ${
                  activeType === 'found'
                    ? 'bg-active text-activeText border-active shadow-xs'
                    : 'bg-surface text-textSecondary border-border-subtle hover:text-textPrimary hover:bg-surface-elevated'
                }`}
              >
                Found
              </button>
            </div>

            {/* Quick Filter Buttons: "My University" & "Category Filter" */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pt-0.5">
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
          </section>

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

      {/* 3. Desktop Right Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <RightSidebar />
      </div>

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
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
};

export default LostFoundPage;
