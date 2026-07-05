'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DS } from '@/lib/design-system';
import { Send, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import type { Attachment } from '@/lib/types/chat';

interface MessageInputProps {
  onSend: (content: string, attachments: Attachment[]) => void | Promise<void>;
  onUpload?: (file: File) => Promise<Attachment>;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_FILES = 5;

export function MessageInput({ onSend, onUpload, disabled, placeholder = 'Type a message...' }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    if (!content.trim() && attachments.length === 0) return;
    await onSend(content, attachments);
    setContent('');
    setAttachments([]);
    textareaRef.current?.focus();
  }, [content, attachments, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const remaining = MAX_FILES - attachments.length;
      const toUpload = files.slice(0, remaining);

      if (!onUpload) return;

      setIsUploading(true);
      try {
        const uploaded = await Promise.all(toUpload.map(f => onUpload(f)));
        setAttachments(prev => [...prev, ...uploaded]);
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [onUpload, attachments.length]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const canSend = (content.trim() || attachments.length > 0) && !disabled && !isUploading;

  return (
    <div className="border-t border-divider bg-background p-3">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map(att => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 bg-content2 rounded-lg px-2.5 py-1.5 text-xs"
            >
              {att.type.startsWith('image/') ? (
                <ImageIcon className="size-3 text-primary" aria-hidden="true" />
              ) : (
                <FileText className="size-3 text-default-400" aria-hidden="true" />
              )}
              <span className="truncate max-w-[120px]">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="text-default-400 hover:text-danger transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.txt,.md,.json,.zip"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || attachments.length >= MAX_FILES}
          className={cn(DS.buttons.icon, 'shrink-0 mb-0.5')}
          aria-label="Attach file"
        >
          <Paperclip className="size-4" />
        </button>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            DS.inputs.base,
            'resize-none min-h-[40px] max-h-[120px] py-2 flex-1'
          )}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(DS.buttons.primary, 'shrink-0 mb-0.5 px-3 py-2')}
          aria-label="Send message"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
