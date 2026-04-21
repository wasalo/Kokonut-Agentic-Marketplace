'use client';

import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Settings, AlertCircle, ShieldAlert, Wallet } from 'lucide-react';
import { Card, Input } from '@heroui/react';
import { CONTRACTS } from '@/lib/wagmi';
import { AGENTIC_COMMERCE_ABI, ADMIN_REGISTRY_BLACKLIST_ABI } from '@/lib/contracts/abis';
import { getContractAddress } from '@/lib/contracts/config';

const AGENTIC_COMMERCE_ADDRESS = CONTRACTS[11155111].agenticCommerce as `0x${string}`;
const ADMIN_REGISTRY_ADDRESS = getContractAddress('ADMIN_REGISTRY');

export default function AdminPage(): JSX.Element {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'info' | 'agents' | 'wallets'>('info');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-default-500">Manage contract settings and blacklists</p>
        </div>
      </div>

      {!isConnected ? (
        <Card className="border border-divider p-8 text-center">
          <AlertCircle className="w-12 h-12 text-default-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Wallet Not Connected</h2>
          <p className="text-default-500">Connect your wallet to access the admin dashboard.</p>
        </Card>
      ) : (
        <div>
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'info'
                  ? 'bg-primary text-white'
                  : 'bg-content2 text-default-600 hover:bg-content3'
              }`}
            >
              Contract Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('agents')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'agents'
                  ? 'bg-danger text-white'
                  : 'bg-content2 text-default-600 hover:bg-content3'
              }`}
            >
              Agent Blacklist
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wallets')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'wallets'
                  ? 'bg-danger text-white'
                  : 'bg-content2 text-default-600 hover:bg-content3'
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
      <Card className="border border-divider p-6">
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

      <Card className="border border-divider p-6">
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

      <Card className="border border-divider p-6">
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

  const { data: agentCount } = useReadContract({
    address: ADMIN_REGISTRY_ADDRESS,
    abi: ADMIN_REGISTRY_BLACKLIST_ABI,
    functionName: 'getBlacklistedAgentCount',
  } as any);

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="border border-divider p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="w-5 h-5 text-danger" />
          <h2 className="text-lg font-semibold">Agent Blacklist</h2>
        </div>
        
        <p className="text-sm text-default-500 mb-4">
          Blacklisted agents cannot create services, jobs, or participate in the marketplace.
          Blacklist has a 1-hour grace period before activation.
        </p>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            type="number"
            placeholder="Agent ID"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="md:w-40"
          />
          <Input
            placeholder="Reason for blacklist"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex-1"
          />
        </div>

        <div className="p-3 bg-content2 rounded-lg mb-4">
          <p className="text-sm">
            <span className="text-default-400">Total Blacklisted:</span>{' '}
            <span className="font-semibold">{agentCount?.toString() || '0'}</span>
          </p>
        </div>

        <Card className="border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm text-warning">
            Write functions (blacklistAgent, unblacklistAgent) are available for direct contract interaction on Etherscan.
            This UI displays blacklist stats only.
          </p>
        </Card>
      </Card>
    </div>
  );
}

function WalletBlacklist() {
  const [wallet, setWallet] = useState('');
  const [reason, setReason] = useState('');

  const { data: walletCount } = useReadContract({
    address: ADMIN_REGISTRY_ADDRESS,
    abi: ADMIN_REGISTRY_BLACKLIST_ABI,
    functionName: 'getBlacklistedWalletCount',
  } as any);

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="border border-divider p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="w-5 h-5 text-danger" />
          <h2 className="text-lg font-semibold">Wallet Blacklist</h2>
        </div>

        <p className="text-sm text-default-500 mb-4">
          Blacklisted wallets cannot interact with services, jobs, or the marketplace.
          Blacklist has a 1-hour grace period before activation.
        </p>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Wallet address (0x...)"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="flex-1 md:w-80"
          />
          <Input
            placeholder="Reason for blacklist"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex-1"
          />
        </div>

        <div className="p-3 bg-content2 rounded-lg">
          <p className="text-sm">
            <span className="text-default-400">Total Blacklisted:</span>{' '}
            <span className="font-semibold">{walletCount?.toString() || '0'}</span>
          </p>
        </div>

        <Card className="border border-warning/30 bg-warning/5 p-4 mt-4">
          <p className="text-sm text-warning">
            Write functions (blacklistWallet, unblacklistWallet) are available for direct contract interaction on Etherscan.
            This UI displays blacklist stats only.
          </p>
        </Card>
      </Card>
    </div>
  );
}