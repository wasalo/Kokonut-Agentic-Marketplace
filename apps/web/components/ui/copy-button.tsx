'use client';

import { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@heroui/react';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'danger-soft' | 'outline' | 'tertiary';
}

export function CopyButton({
  text,
  className = '',
  size = 'sm',
  variant = 'secondary',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts or SSR
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  return (
    <Button
      isIconOnly
      size={size}
      variant={variant}
      className={className}
      onPress={handleCopy}
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}

interface CopyTextProps {
  text: string;
  className?: string;
  displayLength?: number;
}

export function CopyText({ text, className = '', displayLength = 16 }: CopyTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts or SSR
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  const displayText =
    text.length > displayLength ? `${text.slice(0, displayLength)}...${text.slice(-4)}` : text;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex items-center gap-1 font-mono text-sm hover:text-primary transition-colors ${className}`}
    >
      {displayText}
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}
