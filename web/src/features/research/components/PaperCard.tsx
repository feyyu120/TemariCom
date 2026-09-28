import React, { useState } from 'react';
import {
  Bookmark,
  ExternalLink,
  FileText,
  Share2,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ScholarXivPaper, SavedPaper } from '@/features/research/types';
import { useAuth } from '@/features/auth';

interface PaperCardProps {
  paper: ScholarXivPaper | SavedPaper;
  isSaved?: boolean;
  onToggleSave?: () => Promise<void> | void;
  isSaving?: boolean;
}

export const PaperCard: React.FC<PaperCardProps> = ({
  paper,
  isSaved = false,
  onToggleSave,
  isSaving = false,
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Normalize fields between ScholarXivPaper and SavedPaper
  const paperId = 'extractedID' in paper ? paper.extractedID || paper.id : paper.external_paper_id;
  const title = paper.title;
  const summary = paper.summary || '';
  const authors = paper.authors || [];
  const pdfUrl = 'pdfLink' in paper ? paper.pdfLink : paper.pdf_url;
  const paperUrl = 'absLink' in paper ? paper.absLink : paper.paper_url;
  const category = 'primaryCategory' in paper ? paper.primaryCategory : undefined;
  const publishedDate = 'published' in paper && paper.published
    ? new Date(paper.published).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
      })
    : 'created_at' in paper && paper.created_at
    ? new Date(paper.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
      })
    : null;

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (onToggleSave) {
      onToggleSave();
    }
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = paperUrl || pdfUrl || window.location.href;
    const shareData = {
      title: title,
      text: `Check out this research paper: "${title}"`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User aborted or unsupported; fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write errors
    }
  };

  return (
    <article className="p-4 sm:p-5 rounded-card bg-surface border border-border-subtle hover:border-border transition-colors duration-200 flex flex-col justify-between space-y-3">
      <div>
        {/* Top Badges & Published Date */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-[12px] text-textTertiary mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {category && (
              <span className="px-2 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-textSecondary font-medium">
                {category}
              </span>
            )}
            {paperId && (
              <span className="font-mono text-[11px] text-textTertiary">
                arXiv:{paperId}
              </span>
            )}
          </div>
          {publishedDate && (
            <time className="text-textTertiary font-medium">{publishedDate}</time>
          )}
        </div>

        {/* Paper Title */}
        <h3 className="text-[16px] sm:text-[17px] font-bold text-textPrimary leading-snug tracking-tight">
          {paperUrl ? (
            <a
              href={paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-textPrimary transition-colors inline-flex items-center gap-1.5"
            >
              <span>{title}</span>
              <ExternalLink className="w-3.5 h-3.5 inline-block text-textTertiary shrink-0" />
            </a>
          ) : (
            title
          )}
        </h3>

        {/* Authors */}
        {authors.length > 0 && (
          <p className="text-[13px] text-textSecondary mt-1.5 line-clamp-1">
            <span className="text-textTertiary">Authors: </span>
            {authors.slice(0, 4).join(', ')}
            {authors.length > 4 && ` +${authors.length - 4} more`}
          </p>
        )}

        {/* Summary / Abstract with Expand Toggle */}
        {summary && (
          <div className="mt-2.5 text-[13px] sm:text-[14px] text-textSecondary leading-relaxed">
            <p className={isExpanded ? '' : 'line-clamp-3'}>
              {summary}
            </p>
            {summary.length > 180 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1 text-[12px] font-semibold text-textPrimary hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <span>Show less</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Read abstract</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Footer: PDF button, Save button, Share button */}
      <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-border text-textPrimary text-[13px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-textSecondary" />
              <span>PDF</span>
            </a>
          )}

          {paperUrl && (
            <a
              href={paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-border text-textSecondary hover:text-textPrimary text-[13px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>arXiv</span>
            </a>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Save / Bookmark Button */}
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            aria-label={isSaved ? 'Remove from saved' : 'Save paper'}
            className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all duration-150 inline-flex items-center gap-1.5 cursor-pointer ${
              isSaved
                ? 'bg-active text-activeText border-active'
                : 'bg-surface-elevated hover:bg-surface border-border-subtle hover:border-border text-textSecondary hover:text-textPrimary'
            }`}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${
                isSaved ? 'fill-current text-activeText' : 'text-textSecondary'
              }`}
            />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          {/* Share Button with Copied Tooltip */}
          <button
            type="button"
            onClick={handleShareClick}
            aria-label="Share paper link"
            title="Share or copy paper link"
            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-border text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-verification" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
