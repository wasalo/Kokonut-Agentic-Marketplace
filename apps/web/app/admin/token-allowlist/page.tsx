'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { Card } from '@heroui/react';
import { Coins, AlertCircle, RefreshCw, Trash2, Plus, Link2 } from 'lucide-react';
import NextLink from 'next/link';
import { getContractAddress, ZERO_ADDRESS } from '@/lib/contracts/config';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { DS, card } from '@/lib/design-system';
import { formatAmount } from '@/lib/tokenUtils';
import { useTokenAllowlistAdmin } from '@/lib/hooks/useTokenAllowlistAdmin';
import { toast } from 'sonner';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');

interface TokenRow {
  address: `0x${string}`;
  decimals: number;
  isStablecoin: boolean;
  price: bigint;
  minBudget: bigint;
}

export default function TokenAllowlistAdminPage(): JSX.Element {
  useEffect(() => { document.title = 'Token Allowlist | Admin | Kokonut'; }, []);
  const { isConnected } = useAccount();

  const { refetch: refetchAllowed } = useReadContracts({
    contracts: [
      {
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'allowedTokens',
        args: [ZERO_ADDRESS],
      },
    ],
    query: { staleTime: 60_000 },
  });

  const {
    addAllowedToken,
    removeAllowedToken,
    setStablecoin,
    setPriceFeed,
  } = useTokenAllowlistAdmin();

  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [newTokenDecimals, setNewTokenDecimals] = useState('18');
  const [newTokenStable, setNewTokenStable] = useState(false);
  const [newPriceFeedToken, setNewPriceFeedToken] = useState('');
  const [newPriceFeedAddress, setNewPriceFeedAddress] = useState('');

  const load = async () => {
    setIsLoading(true);
    setTokens([]);
    setIsLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleAddToken = async () => {
    if (!newToken) return;
    try {
      const hash = await addAllowedToken(newToken as `0x${string}`);
      toast.success(`Token added: ${hash}`);
      setNewToken('');
      await refetchAllowed();
    } catch {
      toast.error('Add failed');
    }
  };

  const handleRemoveToken = async (token: `0x${string}`) => {
    try {
      const hash = await removeAllowedToken(token);
      toast.success(`Token removed: ${hash}`);
      await refetchAllowed();
    } catch {
      toast.error('Remove failed');
    }
  };

  const handleSetStable = async (token: `0x${string}`, stable: boolean) => {
    try {
      const hash = await setStablecoin(token, stable);
      toast.success(`Stablecoin flag updated: ${hash}`);
    } catch {
      toast.error('Update failed');
    }
  };

  const handleSetPriceFeed = async () => {
    if (!newPriceFeedToken || !newPriceFeedAddress) return;
    try {
      const hash = await setPriceFeed(
        newPriceFeedToken as `0x${string}`,
        newPriceFeedAddress as `0x${string}`,
        parseInt(newTokenDecimals || '18', 10)
      );
      toast.success(`Price feed set: ${hash}`);
      setNewPriceFeedToken('');
      setNewPriceFeedAddress('');
    } catch {
      toast.error('Set feed failed');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Coins className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Token Allowlist</h1>
            <p className="text-default-500">Manage accepted tokens, price feeds, and per-token fees</p>
          </div>
        </div>
        <NextLink href="/admin" className="text-sm text-default-500 hover:text-default-700">← Back to Admin</NextLink>
      </div>

      {!isConnected && (
        <Card className={card('padded', 'p-6 mb-6 bg-warning/5')}>
          <AlertCircle className="size-6 text-warning inline-block mr-2" />
          <span className="text-sm">Connect the owner wallet to manage the allowlist.</span>
        </Card>
      )}

      <Card className={card('padded', 'p-6 mb-6')}>
        <h2 className="text-lg font-semibold mb-3">Add token</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input
            value={newToken}
            onChange={e => setNewToken(e.target.value)}
            placeholder="0x... (token address)"
            className="md:col-span-2 px-3 py-2 bg-content1 border border-divider rounded-lg font-mono text-sm"
          />
          <input
            value={newTokenDecimals}
            onChange={e => setNewTokenDecimals(e.target.value)}
            placeholder="18"
            className="px-3 py-2 bg-content1 border border-divider rounded-lg font-mono text-sm"
          />
        </div>
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={newTokenStable}
            onChange={e => setNewTokenStable(e.target.checked)}
                        className="size-4 accent-primary"
          />
          <span className="text-sm">Stablecoin</span>
        </label>
        <button onClick={handleAddToken} disabled={!isConnected || !newToken} className={DS.buttons.primary}>
          <Plus className="size-4 mr-1 inline" /> Add token
        </button>
      </Card>

      <Card className={card('padded', 'p-6 mb-6')}>
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Set price feed</h2>
        </div>
        <p className="text-sm text-default-500 mb-3">
          Wire a Chainlink-style aggregator to a token. Token must already be allowed.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            value={newPriceFeedToken}
            onChange={e => setNewPriceFeedToken(e.target.value)}
            placeholder="0x... (token)"
            className="px-3 py-2 bg-content1 border border-divider rounded-lg font-mono text-sm"
          />
          <input
            value={newPriceFeedAddress}
            onChange={e => setNewPriceFeedAddress(e.target.value)}
            placeholder="0x... (aggregator)"
            className="px-3 py-2 bg-content1 border border-divider rounded-lg font-mono text-sm"
          />
        </div>
        <button onClick={handleSetPriceFeed} disabled={!isConnected || !newPriceFeedToken || !newPriceFeedAddress} className={DS.buttons.primary}>
          Set price feed
        </button>
      </Card>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={load} disabled={isLoading} className={DS.buttons.secondary}>
          <RefreshCw className="size-4 mr-1 inline" /> Refresh
        </button>
        <span className="text-sm text-default-500 ml-auto">{tokens.length} tokens</span>
      </div>

      <Card className={card('base')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-content2">
              <tr>
                <th className="text-left p-3">Address</th>
                <th className="text-left p-3">Decimals</th>
                <th className="text-left p-3">Stable</th>
                <th className="text-left p-3">Price (USD)</th>
                <th className="text-left p-3">Min Budget</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-default-500">
                  {isLoading ? 'Loading…' : 'No tokens in allowlist'}
                </td></tr>
              ) : (
                tokens.map(t => (
                  <tr key={t.address} className="border-t border-divider">
                    <td className="p-3 font-mono text-xs">{t.address}</td>
                    <td className="p-3">{t.decimals}</td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={t.isStablecoin}
                        onChange={e => handleSetStable(t.address, e.target.checked)}
                        disabled={!isConnected}
            className="size-4 accent-primary"
                      />
                    </td>
                    <td className="p-3 font-mono text-xs">{t.price > 0n ? formatAmount(t.price, 8) : '—'}</td>
                    <td className="p-3">{t.minBudget > 0n ? formatAmount(t.minBudget, t.decimals) : '—'}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleRemoveToken(t.address)}
                        disabled={!isConnected}
                        className="px-2 py-1 text-xs border border-divider rounded hover:bg-content2 inline-flex items-center"
                      >
                        <Trash2 className="size-3 mr-1" /> Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
