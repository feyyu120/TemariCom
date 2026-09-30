import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { ComingSoonPage } from '@/components/ComingSoonPage';

export const MarketplacePage: React.FC = () => {
  return (
    <ComingSoonPage
      title="Marketplace"
      description="Buy and sell textbooks, dorm gear, calculators, lab coats, and student essentials safely on campus. Coming soon!"
      icon={<ShoppingCart className="w-8 h-8 text-textPrimary" />}
    />
  );
};

export default MarketplacePage;
