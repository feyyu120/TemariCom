import React from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { OfficialAnnouncement, Opportunity } from '@/features/home/types';

interface MobileOfficialOpportunitiesProps {
  announcements: OfficialAnnouncement[];
  opportunities: Opportunity[];
}

export const MobileOfficialOpportunities: React.FC<MobileOfficialOpportunitiesProps> = ({
  announcements,
  opportunities,
}) => {
  // Combine announcements and top opportunities into a unified card list
  const items = [
    ...announcements.map((ann) => ({
      id: ann.id,
      category: 'Official',
      title: ann.title,
      organization: ann.institutionName,
      logoUrl: ann.institutionLogoUrl,
      meta: ann.date,
      badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      isOfficial: true,
    })),
    ...opportunities.map((opp) => ({
      id: opp.id,
      category: opp.type,
      title: opp.title,
      organization: opp.organization,
      logoUrl: opp.organizationLogoUrl,
      meta: opp.deadlineOrDate,
      badgeColor:
        opp.type === 'Scholarship'
          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
          : opp.type === 'Internship'
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          : opp.type === 'Event'
          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
          : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      isOfficial: false,
    })),
  ];

  if (items.length === 0) return null;

  return (
    <section className="lg:hidden w-full border-b border-border-subtle bg-background py-3 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 mb-2.5">
        <h2 className="text-sm font-bold text-textPrimary tracking-tight">
          Official & Opportunities
        </h2>
        <button
          type="button"
          className="flex items-center text-xs font-semibold text-textTertiary hover:text-textPrimary transition-colors"
        >
          <span>See all</span>
          <ChevronRight className="w-4 h-4 ml-0.5" />
        </button>
      </div>

      {/* Horizontal Scroll Cards */}
      <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar scroll-smooth pb-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="w-72 shrink-0 p-3 rounded-card bg-surface border border-border-subtle hover:border-border transition-colors flex flex-col justify-between"
          >
            <div>
              {/* Category Badge & Meta Date */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                >
                  {item.category}
                </span>
                <span className="text-[11px] text-textTertiary truncate">
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
                <span className="text-xs font-semibold text-textPrimary truncate">
                  {item.organization}
                </span>
                {item.isOfficial && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
              </div>

              {/* Title */}
              <p className="text-xs font-medium text-textPrimary line-clamp-2 leading-relaxed mb-3">
                {item.title}
              </p>
            </div>

            {/* Action Button */}
            <button
              type="button"
              className="w-full py-1.5 px-3 text-center text-xs font-semibold rounded-medium bg-surface-elevated hover:bg-border/60 border border-border-subtle text-textPrimary transition-colors cursor-pointer"
            >
              View Details
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
