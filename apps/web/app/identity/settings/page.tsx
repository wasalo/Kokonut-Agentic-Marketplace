'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import {
  ArrowLeft,
  Save,
  Loader2,
  Database,
  CheckCircle2,
  ChevronDown,
  Shield,
  TrendingUp,
  DollarSign,
  Star,
  Calendar,
} from 'lucide-react';
import NextLink from 'next/link';
import { Card } from '@heroui/react';
import { useWaitForTransactionReceipt } from 'wagmi';
import {
  useSetAgentURI,
  useSetAgentMetadata,
  useAgentStats,
} from '@/lib/hooks/useAgentSettings';

// Note: Removed unused imports:
// - useGenerateWalletSignature (was for Agent Wallet - EIP-712 broken)
// - useSetAgentWallet / useUnsetAgentWallet (was for Agent Wallet - EIP-712 broken)
// - useAgentWallet (was for Agent Wallet display - removed)
// - createDeadline (was for blockchain timestamp - no longer needed)
import { useAgentsByOwnerFromSubgraph } from '@/lib/hooks';
import { generateAgentMetadata, decodeAgentMetadata, type AgentMetadata8004 } from '@/lib/metadata';
import { showToast } from '@/lib/toast';
import { EmailPreferencesForm } from '@/components/EmailPreferencesForm';
import { PortfolioForm, type PortfolioItem } from '@/components/PortfolioForm';

export default function AgentSettingsPage(): JSX.Element {
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const { agents, isLoading: isLoadingAgents } = useAgentsByOwnerFromSubgraph(address);

  const urlAgentId = searchParams.get('agentId');
  const [selectedAgentIndex, setSelectedAgentIndex] = useState<number>(0);

  const selectedAgent = useMemo(() => {
    if (agents.length === 0) return null;
    if (urlAgentId) {
      const idx = agents.findIndex(a => a.id.toString() === urlAgentId);
      if (idx !== -1) {
        setSelectedAgentIndex(idx);
        return agents[idx];
      }
    }
    return agents[selectedAgentIndex] || null;
  }, [agents, urlAgentId, selectedAgentIndex]);

  const agent = selectedAgent;
  const agentId = agent?.id ? BigInt(agent.id) : undefined;

  useEffect(() => {
    if (selectedAgentIndex >= agents.length && agents.length > 0) {
      setSelectedAgentIndex(0);
    }
  }, [agents.length, selectedAgentIndex]);

  const { jobsCompleted, rating, feedbackCount } = useAgentStats(agentId);

  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isSavingPortfolio, setIsSavingPortfolio] = useState(false);
  const [portfolioSuccess, setPortfolioSuccess] = useState(false);

  useEffect(() => {
    if (agent?.agentURI) {
      const decoded = decodeAgentMetadata(agent.agentURI);
      if (decoded?.portfolio) {
        setPortfolio(decoded.portfolio);
      }
    }
  }, [agent?.agentURI]);

  const { setAgentURI, hash: uriHash, isPending: isUriPending } = useSetAgentURI();
  const { setMetadata, hash: metaHash, isPending: isMetaPending } = useSetAgentMetadata();

  const { isSuccess: uriSuccess } = useWaitForTransactionReceipt({ hash: uriHash });
  const { isSuccess: metaSuccess } = useWaitForTransactionReceipt({ hash: metaHash });

  useEffect(() => {
    if (uriSuccess) showToast.success('Agent identity updated!', 'Your changes are on-chain.');
  }, [uriSuccess]);

  useEffect(() => {
    if (metaSuccess) showToast.success('Metadata saved!', 'Your metadata has been updated.');
  }, [metaSuccess]);

  const handleSetMetadata = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!agentId || !metadataKey || !metadataValue) return;
      setMetadata(agentId, metadataKey, metadataValue as `0x${string}`);
    },
    [agentId, metadataKey, metadataValue, setMetadata]
  );

  const handleSavePortfolio = useCallback(
    async (newPortfolio: PortfolioItem[]) => {
      if (!agentId || !agent?.agentURI) return;
      setIsSavingPortfolio(true);
      setPortfolioSuccess(false);
      try {
        const decoded = decodeAgentMetadata(agent.agentURI) || {
          name: agent.name || '',
          description: agent.description || '',
          version: '1.0.0',
          capabilities: [],
          source: 'kokonut-marketplace',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updated: AgentMetadata8004 = {
          ...decoded,
          portfolio: newPortfolio.length > 0 ? newPortfolio : undefined,
          updatedAt: new Date().toISOString(),
        };
        const newURI = generateAgentMetadata(updated);
        setAgentURI(agentId, newURI);
        setPortfolio(newPortfolio);
        setPortfolioSuccess(true);
      } finally {
        setIsSavingPortfolio(false);
      }
    },
    [agentId, agent, setAgentURI]
  );

  const handlePortfolioChange = useCallback(
    (newPortfolio: PortfolioItem[]) => {
      handleSavePortfolio(newPortfolio);
    },
    [handleSavePortfolio]
  );

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

  if (isLoadingAgents) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-default-500">Loading your agents...</p>
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
        href="/dashboard/agents"
        className="inline-flex items-center text-sm text-default-500 hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </NextLink>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="w-7 h-7 text-success" />
                Agent Settings
              </h1>
              <p className="text-default-500 mt-1">Manage your agent identity</p>
            </div>

            {agents.length > 1 && (
              <div className="relative">
                <select
                  value={selectedAgentIndex}
                  onChange={e => setSelectedAgentIndex(Number(e.target.value))}
                  className="appearance-none bg-content2 border border-divider rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {agents.map((a, idx) => (
                    <option key={a.id} value={idx}>
                      Agent #{a.id} - {a.name || 'Unnamed'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-default-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Agent Info Card */}
          <div className="mt-4 flex items-center gap-3 p-4 bg-content2 rounded-lg border border-divider">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#009F4D] to-[#FFCD00] flex items-center justify-center text-white font-semibold">
              #{agent?.id}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg truncate">{agent?.name || `Agent #${agent?.id}`}</p>
              {agent?.description && (
                <p className="text-sm text-default-500 truncate">{agent.description}</p>
              )}
            </div>
            <NextLink
              href={`/identity/${agent?.id}`}
              className="text-sm text-primary hover:underline"
            >
              View Profile →
            </NextLink>
          </div>
        </div>

        {/* Quick Stats */}
        <Card className="border border-divider p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Quick Stats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-content2 rounded-lg">
              <DollarSign className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-xl font-bold">{jobsCompleted}</p>
              <p className="text-xs text-default-500">Jobs Completed</p>
            </div>
            <div className="text-center p-3 bg-content2 rounded-lg">
              <DollarSign className="w-5 h-5 text-warning mx-auto mb-1" />
              <p className="text-xl font-bold">$0</p>
              <p className="text-xs text-default-500">Total Earned</p>
            </div>
            <div className="text-center p-3 bg-content2 rounded-lg">
              <Star className="w-5 h-5 text-warning mx-auto mb-1" />
              <p className="text-xl font-bold">{rating > 0 ? rating.toFixed(1) : '—'}</p>
              <p className="text-xs text-default-500">Rating</p>
            </div>
            <div className="text-center p-3 bg-content2 rounded-lg">
              <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold">{feedbackCount}</p>
              <p className="text-xs text-default-500">Reviews</p>
            </div>
          </div>
        </Card>

        {/* Set Custom Metadata */}
        <Card className="border border-divider p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Set Custom Metadata
          </h2>
          <form onSubmit={handleSetMetadata} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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

        {/* Portfolio */}
        <PortfolioForm
          portfolio={portfolio}
          onChange={handlePortfolioChange}
          isSaving={isSavingPortfolio || isUriPending}
          saveSuccess={portfolioSuccess || uriSuccess}
        />

        {/* Email Preferences */}
        <EmailPreferencesForm />
      </div>
    </div>
  );
}