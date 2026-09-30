import React from 'react';
import { BadgePercent } from 'lucide-react';
import { ComingSoonPage } from '@/components/ComingSoonPage';

export const PromotePage: React.FC = () => {
  return (
    <ComingSoonPage
      title="Promote"
      description="Promote student projects, campus startups, events, and academic services to the campus community. Coming soon!"
      icon={<BadgePercent className="w-8 h-8 text-textPrimary" />}
    />
  );
};

export default PromotePage;
