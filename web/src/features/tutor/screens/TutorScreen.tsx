import React from 'react';
import { GraduationCap } from 'lucide-react';
import { ComingSoonPage } from '@/components/ComingSoonPage';

export const TutorScreen: React.FC = () => {
  return (
    <ComingSoonPage
      title="Find Tutor"
      description="Connect with qualified peer tutors and academic mentors across university departments. Launching soon!"
      icon={<GraduationCap className="w-8 h-8 text-textPrimary" />}
    />
  );
};

export default TutorScreen;