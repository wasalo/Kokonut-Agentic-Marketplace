'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Settings, AlertCircle, ShieldAlert, Wallet, XCircle, Loader } from 'lucide-react';
import { Card, Input } from '@heroui/react';
import { CONTRACTS } from '@/lib/wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { useAdminBlacklist } from '@/lib/hooks/useAdminBlacklist';
import { DS, card } from '@/lib/design-system';
import { toast } from 'sonner';

const AGENTIC_COMMERCE_ADDRESS = CONTRACTS[11155111].agenticCommerce as `0x${string}`;


export default function AdminPage(): JSX.Element {
  useEffect(() => {
    document.title = 'Admin | Kokonut Agent Economy';
  }, []);

  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'info' | 'agents' | 'wallets'>('info');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Settings className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-default-500">Manage contract settings and blacklists</p>
        </div>
      </div>

      {!isConnected ? (
        <Card className={card('padded', 'p-8 text-center')}>
          <AlertCircle className="size-12 text-default-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Wallet Not Connected</h2>
          <p className="text-default-500">Connect your wallet to access the admin dashboard.</p>
        </Card>
      ) : (
        <div>
          <div className="flex gap-2 mb-6">
            <button type="button"
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'info'
                  ? 'bg-primary text-white'
                  : DS.buttons.ghost
              }`}
            >
              Contract Info
            </button>
            <button type="button"
              onClick={() => setActiveTab('agents')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'agents'
                  ? 'bg-danger text-white'
                  : DS.buttons.ghost
              }`}
            >
              Agent Blacklist
            </button>
            <button type="button"
              onClick={() => setActiveTab('wallets')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'wallets'
                  ? 'bg-danger text-white'
                  : DS.buttons.ghost
              }`}
            >
              Wallet Blacklist
            </button>
          </div>

          {activeTab === 'info' && <ContractInfo />}
          {activeTab === 'agents' && <AgentBlacklist />}
          {activeTab === 'wallets' && <WalletBlacklist />}
        </div>
      )}
    </div>
  );
}

function ContractInfo() {
  const { data: feeDenominator } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'FEE_DENOMINATOR',
  });

  const { data: evaluatorFeeBp } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'EVALUATOR_FEE_BP',
  });

  const platformFeePercent = evaluatorFeeBp ? Number(evaluatorFeeBp) / 100 : 1;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className={card('padded', 'p-6')}>
        <h2 className="text-lg font-semibold mb-4">Contract Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-content2 rounded-lg">
            <p className="text-sm text-default-400 mb-1">Contract Address</p>
            <p className="font-mono text-sm break-all">{AGENTIC_COMMERCE_ADDRESS}</p>
          </div>
          <div className="p-4 bg-content2 rounded-lg">
            <p className="text-sm text-default-400 mb-1">Total Proposals Created</p>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="p-4 bg-content2 rounded-lg">
            <p className="text-sm text-default-400 mb-1">Evaluator Fee (basis points)</p>
            <p className="text-2xl font-bold text-success">{evaluatorFeeBp?.toString() || '0'}</p>
          </div>
          <div className="p-4 bg-content2 rounded-lg">
            <p className="text-sm text-default-400 mb-1">Platform Fee (basis points)</p>
            <p className="text-2xl font-bold text-success">{feeDenominator?.toString() || '0'}</p>
          </div>
        </div>
      </Card>

      <Card className={card('padded', 'p-6')}>
        <h2 className="text-lg font-semibold mb-4">Platform Fee Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-default-500 mb-2 block">
              Current Evaluator Fee
            </label>
            <div className="p-4 bg-content2 rounded-lg">
              <p className="text-2xl font-bold text-success">{platformFeePercent}%</p>
              <p className="text-xs text-default-400 mt-1">
                Fee is charged on job payments (in basis points)
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className={card('padded', 'p-6')}>
        <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href={`https://sepolia.etherscan.io/address/${AGENTIC_COMMERCE_ADDRESS}#readContract`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-content2 rounded-lg hover:bg-content3 transition-colors"
          >
            <p className="font-medium text-primary">Read Contract</p>
            <p className="text-sm text-default-400 mt-1">View contract state on Etherscan</p>
          </a>
          <a
            href={`https://sepolia.etherscan.io/address/${AGENTIC_COMMERCE_ADDRESS}#writeContract`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-content2 rounded-lg hover:bg-content3 transition-colors"
          >
            <p className="font-medium text-primary">Write Contract</p>
            <p className="text-sm text-default-400 mt-1">Interact with contract on Etherscan</p>
          </a>
        </div>
      </Card>
    </div>
  );
}

function AgentBlacklist() {
  const [agentId, setAgentId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    agentCount, 
    blacklistAgent, 
    unblacklistAgent, 
    isBlacklistingAgent, 
    isUnblacklistingAgent,
    refetchAgentCount 
  } = useAdminBlacklist();

  const canBlacklist = agentId && reason && !isSubmitting;
  const canUnblacklist = agentId && !isSubmitting;

  const handleBlacklist = async () => {
    if (!canBlacklist) return;
    setIsSubmitting(true);
    try {
      await blacklistAgent(BigInt(agentId), reason);
      toast.success(`Agent ${agentId} blacklisted`);
      setAgentId('');
      setReason('');
      refetchAgentCount();
    } catch {
      toast.error('Failed to blacklist agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnblacklist = async () => {
    if (!canUnblacklist) return;
    setIsSubmitting(true);
    try {
      await unblacklistAgent(BigInt(agentId));
      toast.success(`Agent ${agentId} removed from blacklist`);
      setAgentId('');
      refetchAgentCount();
    } catch {
      toast.error('Failed to unblacklist agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isBlacklistingAgent || isUnblacklistingAgent;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className={card('padded', 'p-6')}>
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="size-5 text-danger" />
          <h2 className="text-lg font-semibold">Agent Blacklist</h2>
        </div>
        
        <p className="text-sm text-default-500 mb-4">
          Blacklisted agents cannot create services, jobs, or participate in the marketplace.
          Blacklist has a 1-hour grace period before activation.
        </p>

        <div className="space-y-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              type="number"
              placeholder="Agent ID"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="md:w-40"
              disabled={isLoading}
            />
            <Input
              placeholder="Reason for blacklist"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex gap-2">
            <button type="button"
              onClick={handleBlacklist}
              disabled={!canBlacklist || isLoading}
              className={DS.buttons.danger + ' flex items-center gap-2'}
            >
              {isBlacklistingAgent && <Loader className="size-4 animate-spin" />}
              <ShieldAlert className="size-4" />
              Blacklist Agent
            </button>
            <button type="button"
              onClick={handleUnblacklist}
              disabled={!canUnblacklist || isLoading}
              className={DS.buttons.ghost + ' flex items-center gap-2'}
            >
              <XCircle className="size-4" />
              Remove from Blacklist
            </button>
          </div>
        </div>

        <div className="p-3 bg-content2 rounded-lg">
          <p className="text-sm">
            <span className="text-default-400">Total Blacklisted:</span>{' '}
            <span className="font-semibold">{agentCount}</span>
          </p>
        </div>
      </Card>
    </div>
  );
}

function WalletBlacklist() {
  const [wallet, setWallet] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    walletCount, 
    blacklistWallet, 
    unblacklistWallet, 
    isBlacklistingWallet, 
    isUnblacklistingWallet,
    refetchWalletCount 
  } = useAdminBlacklist();

  const isValidAddress = wallet && wallet.startsWith('0x') && wallet.length === 42;
  const canBlacklist = isValidAddress && reason && !isSubmitting;
  const canUnblacklist = isValidAddress && !isSubmitting;

  const handleBlacklist = async () => {
    if (!canBlacklist) return;
    setIsSubmitting(true);
    try {
      await blacklistWallet(wallet as `0x${string}`, reason);
      toast.success(`Wallet ${wallet.slice(0, 10)}... blacklisted`);
      setWallet('');
      setReason('');
      refetchWalletCount();
    } catch {
      toast.error('Failed to blacklist wallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnblacklist = async () => {
    if (!canUnblacklist) return;
    setIsSubmitting(true);
    try {
      await unblacklistWallet(wallet as `0x${string}`);
      toast.success(`Wallet ${wallet.slice(0, 10)}... removed from blacklist`);
      setWallet('');
      refetchWalletCount();
    } catch {
      toast.error('Failed to unblacklist wallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isBlacklistingWallet || isUnblacklistingWallet;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className={card('padded', 'p-6')}>
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="size-5 text-danger" />
          <h2 className="text-lg font-semibold">Wallet Blacklist</h2>
        </div>

        <p className="text-sm text-default-500 mb-4">
          Blacklisted wallets cannot interact with services, jobs, or the marketplace.
          Blacklist has a 1-hour grace period before activation.
        </p>

        <div className="space-y-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Wallet address (0x...)"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              className="flex-1 md:w-80"
              disabled={isLoading}
            />
            <Input
              placeholder="Reason for blacklist"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex gap-2">
            <button type="button"
              onClick={handleBlacklist}
              disabled={!canBlacklist || isLoading}
              className={DS.buttons.danger + ' flex items-center gap-2'}
            >
              {isBlacklistingWallet && <Loader className="size-4 animate-spin" />}
              <ShieldAlert className="size-4" />
              Blacklist Wallet
            </button>
            <button type="button"
              onClick={handleUnblacklist}
              disabled={!canUnblacklist || isLoading}
              className={DS.buttons.ghost + ' flex items-center gap-2'}
            >
              <XCircle className="size-4" />
              Remove from Blacklist
            </button>
          </div>
        </div>

        <div className="p-3 bg-content2 rounded-lg">
          <p className="text-sm">
            <span className="text-default-400">Total Blacklisted:</span>{' '}
            <span className="font-semibold">{walletCount}</span>
          </p>
        </div>
      </Card>
    </div>
  );
}