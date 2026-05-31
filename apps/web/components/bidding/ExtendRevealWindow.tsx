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
      <p className="font-medium">Reveal Window</p>
      <p className="text-sm text-default-500 mt-1 mb-4">Extend the reveal period if providers need more time.</p>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label htmlFor="extend-seconds" className="text-sm font-medium mb-1 block">
            Additional time (seconds)
          </label>
          <input
            id="extend-seconds"
            type="number"
            value={extendSeconds}
            onChange={e => onSecondsChange(e.target.value)}
            placeholder="3600"
            className="w-full px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
          />
        </div>
        <button
          type="button"
          onClick={onExtend}
          disabled={isExtendPending || !extendSeconds}
          className="w-full sm:w-auto px-6 py-2 bg-content2 border border-divider font-medium rounded-lg hover:bg-content3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
