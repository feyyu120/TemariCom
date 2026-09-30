import React from 'react';
import { Bookmark } from 'lucide-react';
import { ComingSoonPage } from '@/components/ComingSoonPage';

export const SavedPage: React.FC = () => {
  return (
    <ComingSoonPage
      title="Saved Items"
      description="View and organize all your bookmarked posts, opportunities, questions, and campus resources. Coming soon!"
      icon={<Bookmark className="w-8 h-8 text-textPrimary" />}
    />
  );
};

export default SavedPage;
