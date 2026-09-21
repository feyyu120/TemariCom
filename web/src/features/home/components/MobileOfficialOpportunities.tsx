import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle2, X } from 'lucide-react';
import { OfficialAnnouncement, Opportunity } from '@/features/home/types';

interface MobileOfficialOpportunitiesProps {
  announcements: OfficialAnnouncement[];
  opportunities: Opportunity[];
}

type ModalFilterTab = 'all' | 'official' | 'opportunities';

export const MobileOfficialOpportunities: React.FC<MobileOfficialOpportunitiesProps> = ({
  announcements,
  opportunities,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFilter, setModalFilter] = useState<ModalFilterTab>('all');

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Format all items for display
  const officialItems = announcements.map((ann) => ({
    id: ann.id,
    type: 'official' as const,
    category: 'Official',
    title: ann.title,
    organization: ann.institutionName,
    logoUrl: ann.institutionLogoUrl,
    meta: ann.date,
    isOfficial: true,
  }));

  const opportunityItems = opportunities.map((opp) => ({
    id: opp.id,
    type: 'opportunities' as const,
    category: opp.type,
    title: opp.title,
    organization: opp.organization,
    logoUrl: opp.organizationLogoUrl,
    meta: opp.deadlineOrDate,
    isOfficial: false,
  }));

  const combinedItems = [...officialItems, ...opportunityItems];

  const filteredModalItems =
    modalFilter === 'all'
      ? combinedItems
      : modalFilter === 'official'
      ? officialItems
      : opportunityItems;

  if (combinedItems.length === 0) return null;

  return (
    <>
      <section className="lg:hidden w-full border-b border-border-subtle bg-background py-3 select-none">
        {/* Section Header */}
        <div className="flex items-center justify-between px-4 mb-2.5">
          <h2 className="text-[15px] font-bold text-textPrimary tracking-tight">
            Official & Opportunities
          </h2>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center text-[13px] font-medium text-textPrimary hover:underline transition-colors cursor-pointer"
          >
            <span>See all</span>
            <ChevronRight className="w-4 h-4 ml-0.5 text-textPrimary" />
          </button>
        </div>

        {/* Horizontal Scroll Cards without scrollbar */}
        <div
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="flex gap-3 px-4 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth pb-1"
        >
          {combinedItems.map((item) => (
            <div
              key={item.id}
              className="w-72 shrink-0 p-3 rounded-card bg-surface border border-border-subtle hover:border-border transition-colors flex flex-col justify-between"
            >
              <div>
                {/* Category Badge & Meta Date */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] uppercase font-semibold bg-surface-elevated text-textPrimary px-1.5 py-0.5 rounded border border-border-subtle">
                    {item.category}
                  </span>
                  <span className="text-[12px] text-textTertiary truncate">
                    {item.meta}
                  </span>
                </div>

                {/* Institution / Org Header */}
                <div className="flex items-center gap-2 mb-1.5">
                  {item.logoUrl ? (
                    <img
                      src={item.logoUrl}
                      alt={item.organization}
                      className="w-5 h-5 rounded-full object-cover border border-border-subtle shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-surface-elevated border border-border-subtle shrink-0 flex items-center justify-center text-[10px] font-bold text-textPrimary">
                      {item.organization.charAt(0)}
                    </div>
                  )}
                  <span className="text-[14px] font-bold text-textPrimary truncate">
                    {item.organization}
                  </span>
                  {item.isOfficial && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-verification shrink-0" />
                  )}
                </div>

                {/* Title */}
                <p className="text-[14px]  text-textPrimary line-clamp-2 leading-relaxed mb-3">
                  {item.title}
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                className="w-full py-1.5 px-3 text-center text-[13px] font-semibold rounded-medium bg-surface-elevated hover:bg-surface border border-border-subtle text-textPrimary transition-colors cursor-pointer"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Vertical Scroll Modal for "See all" */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          {/* Modal Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Content Panel */}
          <div className="relative w-full max-w-lg max-h-[85vh] bg-background border border-border-subtle rounded-t-2xl sm:rounded-card flex flex-col shadow-2xl z-10 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface/50 shrink-0">
              <div>
                <h3 className="text-base font-bold text-textPrimary tracking-tight">
                  Official & Opportunities
                </h3>
                <p className="text-xs text-textTertiary mt-0.5">
                  Browse campus announcements and verified opportunities
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 py-2.5 border-b border-border-subtle bg-background flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setModalFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  modalFilter === 'all'
                    ? 'bg-textPrimary text-background'
                    : 'bg-surface-elevated text-textSecondary hover:text-textPrimary border border-border-subtle'
                }`}
              >
                All ({combinedItems.length})
              </button>
              <button
                type="button"
                onClick={() => setModalFilter('official')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  modalFilter === 'official'
                    ? 'bg-textPrimary text-background'
                    : 'bg-surface-elevated text-textSecondary hover:text-textPrimary border border-border-subtle'
                }`}
              >
                Official ({officialItems.length})
              </button>
              <button
                type="button"
                onClick={() => setModalFilter('opportunities')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  modalFilter === 'opportunities'
                    ? 'bg-textPrimary text-background'
                    : 'bg-surface-elevated text-textSecondary hover:text-textPrimary border border-border-subtle'
                }`}
              >
                Opportunities ({opportunityItems.length})
              </button>
            </div>

            {/* Vertical Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredModalItems.length === 0 ? (
                <div className="py-12 text-center text-textTertiary">
                  <p className="text-sm">No items found in this section.</p>
                </div>
              ) : (
                filteredModalItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-card bg-surface border border-border-subtle hover:border-border transition-colors flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Category Badge & Date */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] uppercase font-semibold bg-surface-elevated text-textPrimary px-1.5 py-0.5 rounded border border-border-subtle">
                          {item.category}
                        </span>
                        <span className="text-xs text-textTertiary">
                          {item.meta}
                        </span>
                      </div>

                      {/* Institution / Organization */}
                      <div className="flex items-center gap-2 mb-1.5">
                        {item.logoUrl ? (
                          <img
                            src={item.logoUrl}
                            alt={item.organization}
                            className="w-6 h-6 rounded-full object-cover border border-border-subtle shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-surface-elevated border border-border-subtle shrink-0 flex items-center justify-center text-xs font-bold text-textPrimary">
                            {item.organization.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs font-bold text-textPrimary truncate">
                          {item.organization}
                        </span>
                        {item.isOfficial && (
                          <CheckCircle2 className="w-4 h-4 text-verification shrink-0" />
                        )}
                      </div>

                      {/* Title */}
                      <p className="text-sm  text-textPrimary leading-snug mt-1 mb-2">
                        {item.title}
                      </p>
                    </div>

                    {/* View Details Action */}
                    <button
                      type="button"
                      className="w-full mt-1 py-1.5 px-3 text-center text-xs font-semibold rounded-medium bg-surface-elevated hover:bg-surface border border-border-subtle text-textPrimary transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
