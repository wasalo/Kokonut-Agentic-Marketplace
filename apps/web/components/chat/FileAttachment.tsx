'use client';

import { cn } from '@/lib/utils';
import type { Attachment } from '@/lib/types/chat';
import { FileText, Image as ImageIcon, Download, ExternalLink } from 'lucide-react';

interface FileAttachmentProps {
  attachment: Attachment;
  isOwn?: boolean;
  className?: string;
}

export function FileAttachment({ attachment, isOwn, className }: FileAttachmentProps) {
  const isImage = attachment.type.startsWith('image/');
  const isPreviewable = isImage || attachment.type === 'application/pdf';

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs max-w-[240px]',
        isOwn ? 'bg-white/10' : 'bg-background',
        className
      )}
    >
      {isImage ? (
        <ImageIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <FileText className="size-4 shrink-0 text-default-400" aria-hidden="true" />
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{attachment.name}</p>
        <p className="text-default-400 text-[10px]">
          {(attachment.size / 1024).toFixed(1)}KB
        </p>
      </div>
      {isPreviewable && attachment.url && (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-primary hover:text-primary-600 transition-colors"
          aria-label={`Open ${attachment.name}`}
        >
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}
