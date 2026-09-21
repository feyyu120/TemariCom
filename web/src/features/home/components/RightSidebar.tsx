import React, { useEffect, useState } from 'react';
import {
  Search,
  Bell,
  Megaphone,
  BriefcaseBusiness,
  ChevronRight,
  Smartphone,
  CreditCard,
  Package,
} from 'lucide-react';
import {
  OfficialAnnouncement,
  Opportunity,
  LostFoundItem,
} from '@/features/home/types';
import { homeService } from '@/features/home/services/homeService';
import { WidgetSkeleton } from '@/features/home/components/SkeletonLoader';

export const RightSidebar: React.FC = () => {
  const [announcements, setAnnouncements] = useState<OfficialAnnouncement[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [lostItems, setLostItems] = useState<LostFoundItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
        console.error('Failed to load right sidebar data', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getLostItemIcon = (item: LostFoundItem) => {
    if (
      item.category === 'phone' ||
      item.title.toLowerCase().includes('phone') ||
      item.title.toLowerCase().includes('iphone')
    ) {
      return <Smartphone className="w-4 h-4 text-textPrimary" />;
    }
    if (
      item.category === 'id_card' ||
      item.title.toLowerCase().includes('id') ||
      item.title.toLowerCase().includes('card')
    ) {
      return <CreditCard className="w-4 h-4 text-textPrimary" />;
    }
    if (
      item.category === 'backpack' ||
      item.title.toLowerCase().includes('backpack') ||
      item.title.toLowerCase().includes('bag')
    ) {
      return <Package className="w-4 h-4 text-textPrimary" />;
    }
    return <Search className="w-4 h-4 text-textPrimary" />;
  };

  return (
    <aside className="w-96 h-screen shrink-0 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-background flex flex-col select-none border-l border-border-subtle">
      {/* 1. PINNED TOP HEADER: Search & Notification (Aligned with Left & Center headers) */}
      <div className="h-[53px] flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10 px-4 border-b border-border-subtle shrink-0">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-textPrimary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TemariCom..."
            className="w-full pl-10 pr-4 py-2 text-[14px] rounded-full bg-surface-elevated border border-border-subtle text-textPrimary placeholder:text-textTertiary focus:outline-none focus:border-border focus:ring-1 focus:ring-border"
          />
        </div>

        {/* Notification Bell Button with Badge */}
        <button
          type="button"
          className="relative p-2 rounded-full hover:bg-surface-elevated text-textPrimary transition-colors shrink-0 cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-textPrimary" />
          <span className="absolute top-1 right-1 bg-danger text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
            3
          </span>
        </button>
      </div>

      {/* 2. SCROLLABLE WIDGETS BODY */}
      <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 space-y-5">
        {/* Widget 1: Official Announcements */}
        {isLoading ? (
          <WidgetSkeleton itemsCount={3} />
        ) : (
          <section className="bg-surface rounded-card border border-border-subtle p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-textPrimary" />
                <h3 className="font-bold text-[15px] text-textPrimary">
                  Official Announcements
                </h3>
              </div>
              <button
                type="button"
                className="text-[13px] text-textPrimary hover:underline font-medium transition-colors cursor-pointer"
              >
                See all
              </button>
            </div>

            <div className="space-y-1.5">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-2.5 rounded-card hover:bg-surface-elevated transition-colors duration-150 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={item.institutionLogoUrl}
                      alt={item.institutionName}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      {/* Institution Name */}
                      <p className="text-[14px] font-bold text-textPrimary truncate">
                        {item.institutionName}
                      </p>
                      {/* Title: distinct in size and color */}
                      <p className="text-[13px] font-medium text-textSecondary truncate group-hover:underline transition-colors mt-0.5">
                        {item.title}
                      </p>
                      {/* Date */}
                      <p className="text-[12px] text-textTertiary mt-0.5">
                        {item.date}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-textPrimary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Widget 2: Opportunities */}
        {isLoading ? (
          <WidgetSkeleton itemsCount={4} />
        ) : (
          <section className="bg-surface rounded-card border border-border-subtle p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="w-5 h-5 text-textPrimary" />
                <h3 className="font-bold text-[15px] text-textPrimary">
                  Opportunities
                </h3>
              </div>
              <button
                type="button"
                className="text-[13px] text-textPrimary hover:underline font-medium transition-colors cursor-pointer"
              >
                See all
              </button>
            </div>

            <div className="space-y-1.5">
              {opportunities.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-2.5 rounded-card hover:bg-surface-elevated transition-colors duration-150 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={item.organizationLogoUrl}
                      alt={item.organization}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      {/* Category Badge on its own line above title */}
                      <div className="mb-1">
                        <span className="inline-block text-[11px] font-semibold text-textPrimary bg-surface-elevated px-2 py-0.5 rounded-full border border-border-subtle leading-tight">
                          {item.type}
                        </span>
                      </div>
                      {/* Item Title */}
                      <p className="text-[14px] font-bold text-textPrimary truncate group-hover:underline transition-colors">
                        {item.title}
                      </p>
                      {/* Deadline / Date */}
                      <p className="text-[12px] text-textTertiary mt-0.5">
                        {item.deadlineOrDate}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-textPrimary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Widget 3: Lost Item */}
        {isLoading ? (
          <WidgetSkeleton itemsCount={3} />
        ) : (
          <section className="bg-surface rounded-card border border-border-subtle p-4 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-textPrimary" />
                <h3 className="font-bold text-[15px] text-textPrimary">
                  Lost Item
                </h3>
              </div>
              <button
                type="button"
                className="text-[13px] text-textPrimary hover:underline font-medium transition-colors cursor-pointer"
              >
                See all
              </button>
            </div>

            <div className="space-y-1.5">
              {lostItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-2.5 rounded-card hover:bg-surface-elevated transition-colors duration-150 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0">
                      {getLostItemIcon(item)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-block text-[11px] font-bold px-1.5 py-0.5 rounded mb-0.5 ${
                          item.status === 'Lost'
                            ? 'text-danger bg-danger/10'
                            : 'text-textPrimary bg-surface-elevated border border-border-subtle'
                        }`}
                      >
                        {item.status}
                      </span>
                      <p className="text-[14px] font-medium text-textPrimary truncate group-hover:underline transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[12px] text-textTertiary mt-0.5">
                        {item.location} · {item.timeAgo}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-textPrimary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};
