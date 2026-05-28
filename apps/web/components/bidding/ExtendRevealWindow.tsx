'use client';

import { Loader2 } from 'lucide-react';

interface ExtendRevealWindowProps {
  extendSeconds: string;
  isExtendPending: boolean;
  onSecondsChange: (value: string) => void;
  onExtend: () => void;
}

export function ExtendRevealWindow({
  extendSeconds,
  isExtendPending,
  onSecondsChange,
  onExtend,
}: ExtendRevealWindowProps) {
  return (
    <div className="mt-6 pt-6 border-t border-divider">
      <p className="text-sm text-default-500 mb-4">Extend reveal window if needed:</p>
      <div className="flex items-center gap-4">
        <input
          type="number"
          value={extendSeconds}
          onChange={e => onSecondsChange(e.target.value)}
          placeholder="3600"
          className="w-32 px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
        />
        <span className="text-default-500">seconds</span>
        <button
          type="button"
          onClick={onExtend}
          disabled={isExtendPending || !extendSeconds}
          className="px-6 py-2 bg-content2 border border-divider font-medium rounded-lg hover:bg-content3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExtendPending ? (
            <Loader2 className="size-4 animate-spin inline" />
          ) : (
            'Extend Window'
          )}
        </button>
      </div>
    </div>
  );
}
