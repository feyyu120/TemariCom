import React from 'react';
import { BookOpen } from 'lucide-react';
import { ComingSoonPage } from '@/components/ComingSoonPage';

export const LearnPage: React.FC = () => {
  return (
    <ComingSoonPage
      title="Learn"
      description="Access course notes, curated study guides, and past exams organized by department. Coming soon!"
      icon={<BookOpen className="w-8 h-8 text-textPrimary" />}
    />
  );
};

export default LearnPage;
