'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ArrowLeft, Save, Loader2, Wallet, FileText, Database, CheckCircle2 } from 'lucide-react';
import NextLink from 'next/link';
import { Card } from '@heroui/react';
import { useWaitForTransactionReceipt } from 'wagmi';
import {
  useSetAgentURI,
  useSetAgentMetadata,
  useSetAgentWallet,
  useUnsetAgentWallet,
  useAgentWallet,
} from '@/lib/hooks/useAgents';
import { useKokonutAgentsByOwner } from '@/lib/hooks/useKokonutAgentsByOwner';

export default function AgentSettingsPage(): JSX.Element {
  const { address } = useAccount();
  const { agents, isLoading: isLoadingAgents } = useKokonutAgentsByOwner(address);

  // Use the first agent found (users typically have one agent)
  const agent = agents[0] || null;
  const agentId = agent?.id ? BigInt(agent.id) : undefined;

  // Fetch agent wallet separately
  const { wallet: agentWallet } = useAgentWallet(agentId);

  // Form states
  const [newURI, setNewURI] = useState('');
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');
  const [newWallet, setNewWallet] = useState('');
  const [deadline, setDeadline] = useState('');
  const [signature, setSignature] = useState('');

  // Hooks
  const { setAgentURI, hash: uriHash, isPending: isUriPending } = useSetAgentURI();
  const { setMetadata, hash: metaHash, isPending: isMetaPending } = useSetAgentMetadata();
  const { setAgentWallet, hash: walletHash, isPending: isWalletPending } = useSetAgentWallet();
  const { unsetAgentWallet, hash: unsetHash, isPending: isUnsetPending } = useUnsetAgentWallet();

  // Watch transactions
  const { isSuccess: uriSuccess } = useWaitForTransactionReceipt({ hash: uriHash });
  const { isSuccess: metaSuccess } = useWaitForTransactionReceipt({ hash: metaHash });
  const { isSuccess: walletSuccess } = useWaitForTransactionReceipt({ hash: walletHash });
  const { isSuccess: unsetSuccess } = useWaitForTransactionReceipt({ hash: unsetHash });

  const handleUpdateURI = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!agentId || !newURI) return;
      await setAgentURI(agentId, newURI);
    },
    [agentId, newURI, setAgentURI]
  );

  const handleSetMetadata = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!agentId || !metadataKey || !metadataValue) return;
      await setMetadata(agentId, metadataKey, metadataValue as `0x${string}`);
    },
    [agentId, metadataKey, metadataValue, setMetadata]
  );

  const handleSetWallet = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!agentId || !newWallet || !deadline || !signature) return;
      await setAgentWallet(
        agentId,
        newWallet as `0x${string}`,
        BigInt(deadline),
        signature as `0x${string}`
      );
    },
    [agentId, newWallet, deadline, signature, setAgentWallet]
  );

  const handleUnsetWallet = useCallback(async () => {
    if (!agentId) return;
    await unsetAgentWallet(agentId);
  }, [agentId, unsetAgentWallet]);

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Connect Wallet</h2>
          <p className="text-default-500">Please connect your wallet to access settings.</p>
        </Card>
      </div>
    );
  }

  if (!agentId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No Agent Found</h2>
          <p className="text-default-500 mb-4">You don&apos;t have a registered agent identity.</p>
          <NextLink
            href="/identity/register"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg"
          >
            Register Agent
          </NextLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <NextLink
        href="/identity"
        className="inline-flex items-center text-sm text-default-500 hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Agents
      </NextLink>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Agent Settings</h1>
          <p className="text-default-500 mt-1">
            Manage your agent identity for Agent #{agentId?.toString()}
          </p>
        </div>

        {/* Update Agent URI */}
        <Card className="border border-divider p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Update Agent URI
          </h2>
          <form onSubmit={handleUpdateURI} className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Metadata URI</label>
              <input
                type="text"
                placeholder="data:application/json;base64,..."
                value={newURI}
                onChange={e => setNewURI(e.target.value)}
                required
                className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <p className="text-xs text-default-400 mt-1">
                Enter a data:URI with base64-encoded JSON metadata
              </p>
            </div>
            <button
              type="submit"
              disabled={isUriPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isUriPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Update URI
            </button>
            {uriSuccess && (
              <div className="flex items-center gap-2 text-success text-sm">
                <CheckCircle2 className="w-4 h-4" />
                URI updated successfully!
              </div>
            )}
          </form>
        </Card>

        {/* Set Metadata */}
        <Card className="border border-divider p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Set Custom Metadata
          </h2>
          <form onSubmit={handleSetMetadata} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Key</label>
                <input
                  type="text"
                  placeholder="e.g., email, twitter"
                  value={metadataKey}
                  onChange={e => setMetadataKey(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Value (hex)</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={metadataValue}
                  onChange={e => setMetadataValue(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isMetaPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isMetaPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Set Metadata
            </button>
            {metaSuccess && (
              <div className="flex items-center gap-2 text-success text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Metadata set successfully!
              </div>
            )}
          </form>
        </Card>

        {/* Wallet Management */}
        <Card className="border border-divider p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Agent Wallet
          </h2>

          {agentWallet && agentWallet !== '0x0000000000000000000000000000000000000000' ? (
            <div className="space-y-4">
              <div className="p-3 bg-content2 rounded-lg">
                <p className="text-sm text-default-500">Current Wallet</p>
                <p className="font-mono text-sm">{agentWallet}</p>
              </div>
              <button
                onClick={handleUnsetWallet}
                disabled={isUnsetPending}
                className="px-4 py-2 border border-danger/30 text-danger rounded-lg hover:bg-danger/5 disabled:opacity-50"
              >
                {isUnsetPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removing...
                  </span>
                ) : (
                  'Remove Wallet'
                )}
              </button>
              {unsetSuccess && (
                <div className="flex items-center gap-2 text-success text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Wallet removed successfully!
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSetWallet} className="space-y-4">
              <p className="text-sm text-default-500">
                Set a dedicated wallet for this agent. This requires a signature for security.
              </p>
              <div>
                <label className="text-sm font-medium">New Wallet Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={newWallet}
                  onChange={e => setNewWallet(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Deadline (timestamp)</label>
                  <input
                    type="number"
                    placeholder="Unix timestamp"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    required
                    className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Signature</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    required
                    className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isWalletPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isWalletPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Set Wallet
              </button>
              {walletSuccess && (
                <div className="flex items-center gap-2 text-success text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Wallet set successfully!
                </div>
              )}
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
