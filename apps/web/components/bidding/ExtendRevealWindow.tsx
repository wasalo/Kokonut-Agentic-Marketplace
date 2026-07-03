'use client';

import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { btn } from '@/lib/design-system';

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
          <Input
            id="extend-seconds"
            type="number"
            label="Additional time (seconds)"
            value={extendSeconds}
            onChange={e => onSecondsChange(e.target.value)}
            placeholder="3600"
            variant="subtle"
          />
        </div>
        <button
          type="button"
          onClick={onExtend}
          disabled={isExtendPending || !extendSeconds}
          className={btn('ghost', 'w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed')}
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
