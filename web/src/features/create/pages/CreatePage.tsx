import React from 'react';
import { PlusCircle } from 'lucide-react';
import { ComingSoonPage } from '@/components/ComingSoonPage';

export const CreatePage: React.FC = () => {
  return (
    <ComingSoonPage
      title="Create"
      description="Create student posts, project showcases, study group discussions, and questions. Coming soon!"
      icon={<PlusCircle className="w-8 h-8 text-textPrimary" />}
    />
  );
};

export default CreatePage;
