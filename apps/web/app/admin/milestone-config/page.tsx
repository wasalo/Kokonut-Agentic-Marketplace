'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@heroui/react';
import { Settings, AlertCircle, Clock, Percent, Info } from 'lucide-react';
import NextLink from 'next/link';
import { card, btn } from '@/lib/design-system';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { useDefaultDisputeWindow, useMilestoneConfigAdmin } from '@/lib/hooks/useMilestoneConfig';

export default function MilestoneConfigAdminPage(): JSX.Element {
  useEffect(() => { document.title = 'Milestone Config | Admin | Kokonut'; }, []);
  const { isConnected } = useAccount();
  const { defaultWindow: defaultDisputeWindow } = useDefaultDisputeWindow();
  const { setDisputeWindow, isSettingWindow, setSlashBP, isSettingSlash } = useMilestoneConfigAdmin();

  const [overrideJobId, setOverrideJobId] = useState('');
  const [overrideWindow, setOverrideWindow] = useState('');
  const [newSlashBP, setNewSlashBP] = useState('');

  const handleSetDisputeWindow = () => {
    if (!overrideJobId || !overrideWindow) return;
    try {
      setDisputeWindow(BigInt(overrideJobId), BigInt(overrideWindow));
      setOverrideJobId('');
      setOverrideWindow('');
    } catch {
      toast.error('Invalid numeric value');
    }
  };

  const handleSetSlashBP = () => {
    if (!newSlashBP) return;
    try {
      setSlashBP(0n, BigInt(newSlashBP)); // 0 = default for all jobs
      setNewSlashBP('');
    } catch {
      toast.error('Invalid BP value');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Settings className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Milestone Config</h1>
            <p className="text-default-500">Dispute window + non-responsive slashing parameters</p>
          </div>
        </div>
        <NextLink href="/admin" className="text-sm text-default-500 hover:text-default-700">← Back to Admin</NextLink>
      </div>

      {!isConnected && (
        <Card className={card('padded', 'p-6 mb-6 bg-warning/5')}>
          <AlertCircle className="size-6 text-warning inline-block mr-2" />
          <span className="text-sm">Connect the client wallet to update milestone config.</span>
        </Card>
      )}

      <Card className={card('padded', 'p-6 mb-6')}>
        <div className="flex items-center gap-2 mb-3">
          <Info className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Default dispute window</h2>
        </div>
        <p className="text-sm text-default-500 mb-3">
          V9 uses a constant default (7 days). For per-job overrides, use the form below.
        </p>
        <p className="text-2xl font-mono mb-4">{defaultDisputeWindow?.toString() ?? '604800'} seconds (7 days)</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={card('padded', 'p-6')}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Set per-job dispute window</h2>
          </div>
          <p className="text-sm text-default-500 mb-3">
            Client-only. Overrides the default for a specific jobId.
          </p>
          <Input
            value={overrideJobId}
            onChange={e => setOverrideJobId(e.target.value)}
            placeholder="Job ID"
            type="number"
            className="mb-3"
          />
          <Input
            value={overrideWindow}
            onChange={e => setOverrideWindow(e.target.value)}
            placeholder="Window in seconds"
            type="number"
            className="mb-3"
          />
          <button type="button" onClick={handleSetDisputeWindow} disabled={!isConnected || !overrideJobId || !overrideWindow || isSettingWindow} className={btn('primary')}>
            Update dispute window
          </button>
        </Card>

        <Card className={card('padded', 'p-6')}>
          <div className="flex items-center gap-2 mb-3">
            <Percent className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Non-Responsive Slash BP</h2>
          </div>
          <p className="text-sm text-default-500 mb-3">
            Basis points (0-10000) slashed from an evaluator's stake when they fail to respond. Pass 0 to apply to all jobs.
          </p>
          <Input
            value={newSlashBP}
            onChange={e => setNewSlashBP(e.target.value)}
            placeholder="500 (= 5%)"
            type="number"
            className="mb-3"
          />
          <button type="button" onClick={handleSetSlashBP} disabled={!isConnected || !newSlashBP || isSettingSlash} className={btn('primary')}>
            Update slash BP
          </button>
        </Card>
      </div>
    </div>
  );
}
