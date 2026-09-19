import React from 'react';
import {
  Plus,
  Megaphone,
  GraduationCap,
  Briefcase,
  Search,
  Calendar,
} from 'lucide-react';

interface StoryItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isCreate?: boolean;
  gradient?: string;
}

export const MobileStories: React.FC = () => {
  const stories: StoryItem[] = [
    {
      id: 'create',
      label: 'Create',
      icon: <Plus className="w-5 h-5 text-textPrimary" />,
      isCreate: true,
    },
    {
      id: 'announcements',
      label: 'Announce',
      icon: <Megaphone className="w-5 h-5 text-blue-400" />,
      gradient: 'from-blue-500 via-indigo-500 to-cyan-400',
    },
    {
      id: 'scholarships',
      label: 'Scholarships',
      icon: <GraduationCap className="w-5 h-5 text-purple-400" />,
      gradient: 'from-purple-500 via-fuchsia-500 to-pink-500',
    },
    {
      id: 'internships',
      label: 'Internships',
      icon: <Briefcase className="w-5 h-5 text-emerald-400" />,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    },
    {
      id: 'lost_items',
      label: 'Lost & Found',
      icon: <Search className="w-5 h-5 text-amber-400" />,
      gradient: 'from-amber-500 via-orange-500 to-yellow-400',
    },
    {
      id: 'events',
      label: 'Events',
      icon: <Calendar className="w-5 h-5 text-rose-400" />,
      gradient: 'from-rose-500 via-pink-500 to-red-400',
    },
  ];

  return (
    <div className="lg:hidden w-full border-b border-border-subtle bg-background py-3 select-none">
      <div className="flex items-center gap-3.5 px-4 overflow-x-auto no-scrollbar scroll-smooth">
        {stories.map((story) => (
          <button
            key={story.id}
            type="button"
            className="flex flex-col items-center gap-1 shrink-0 group focus:outline-none cursor-pointer"
          >
            {story.isCreate ? (
              <div className="w-[58px] h-[58px] rounded-full border-2 border-dashed border-border flex items-center justify-center bg-surface hover:bg-surface-elevated transition-colors">
                <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center">
                  <Plus className="w-5 h-5 text-textPrimary group-hover:scale-110 transition-transform" />
                </div>
              </div>
            ) : (
              <div
                className={`p-[2px] rounded-full bg-gradient-to-tr ${story.gradient} group-hover:opacity-90 transition-opacity`}
              >
                <div className="w-[54px] h-[54px] rounded-full bg-surface border-2 border-background flex items-center justify-center">
                  {story.icon}
                </div>
              </div>
            )}
            <span className="text-[11px] font-medium text-textSecondary max-w-[62px] truncate text-center group-hover:text-textPrimary transition-colors">
              {story.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
