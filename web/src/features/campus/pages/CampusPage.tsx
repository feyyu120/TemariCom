import React from 'react';
import { Building2 } from 'lucide-react';
import { ComingSoonPage } from '@/components/ComingSoonPage';

export const CampusPage: React.FC = () => {
  return (
    <ComingSoonPage
      title="Campus"
      description="Explore campus events, university student directories, clubs, and facilities. Coming soon!"
      icon={<Building2 className="w-8 h-8 text-textPrimary" />}
    />
  );
};

export default CampusPage;
