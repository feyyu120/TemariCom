import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, BadgeCheck } from 'lucide-react';
import { OfficialAnnouncement, Opportunity } from '@/features/home/types';

interface MobileOfficialOpportunitiesProps {
  announcements: OfficialAnnouncement[];
  opportunities: Opportunity[];
}

export const MobileOfficialOpportunities: React.FC<MobileOfficialOpportunitiesProps> = ({
  announcements,
  opportunities,
}) => {
  const navigate = useNavigate();

  // Format all items for horizontal preview
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
    isOfficial: Boolean(opp.isOfficial),
  }));

  const combinedItems = [...officialItems, ...opportunityItems];

  if (combinedItems.length === 0) return null;

  return (
    <section className="lg:hidden w-full border-b border-border-subtle bg-background py-3 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 mb-2.5">
        <h2 className="text-[15px] font-bold text-textPrimary tracking-tight">
          Announcements
        </h2>
        <button
          type="button"
          onClick={() => navigate('/opportunities')}
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
                  <BadgeCheck className="w-4 h-4 text-verification shrink-0" />
                )}
              </div>

              {/* Title */}
              <p className="text-[14px] text-textPrimary line-clamp-2 leading-relaxed mb-3">
                {item.title}
              </p>
            </div>

            {/* Action Button: Navigates to dedicated page instead of modal */}
            <button
              type="button"
              onClick={() => navigate(`/opportunities?tab=${item.type}`)}
              className="w-full py-1.5 px-3 text-center text-[13px] font-semibold rounded-medium bg-surface-elevated hover:bg-surface border border-border-subtle text-textPrimary transition-colors cursor-pointer"
            >
              View Details
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
