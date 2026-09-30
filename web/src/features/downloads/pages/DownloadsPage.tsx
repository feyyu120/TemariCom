import React from 'react';
import { Download } from 'lucide-react';
import { ComingSoonPage } from '@/components/ComingSoonPage';

export const DownloadsPage: React.FC = () => {
  return (
    <ComingSoonPage
      title="Downloads"
      description="Access your offline downloaded study materials, course handouts, and research PDFs here. Coming soon!"
      icon={<Download className="w-8 h-8 text-textPrimary" />}
    />
  );
};

export default DownloadsPage;
