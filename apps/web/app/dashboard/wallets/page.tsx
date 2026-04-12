'use client';

import { Card } from '@heroui/react';
import { Wallet, Plus, Upload, Shield } from 'lucide-react';
import { WalletList } from '@/components/ows/wallet-card';
import { CreateWalletModal } from '@/components/ows/create-wallet-modal';
import { ImportWalletModal } from '@/components/ows/import-wallet-modal';
import { useState, useEffect } from 'react';
import { useWalletStore } from '@/lib/stores/wallet-store';

export default function WalletsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const loadWallets = useWalletStore(s => s.loadWallets);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Agent Wallets
          </h1>
          <p className="text-default-500 mt-1">
            Create non-custodial wallets for your agents with policy-based controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Wallet
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 border border-divider rounded-lg hover:bg-content2 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-4 border border-divider">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-default-500">Policy Templates</div>
              <div className="text-lg font-semibold">3 Available</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-divider">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Wallet className="w-5 h-5 text-success" />
            </div>
            <div>
              <div className="text-sm text-default-500">Supported Chains</div>
              <div className="text-lg font-semibold">7 Networks</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-divider">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Shield className="w-5 h-5 text-warning" />
            </div>
            <div>
              <div className="text-sm text-default-500">Encryption</div>
              <div className="text-lg font-semibold">AES-256-GCM</div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 border border-divider">
        <h2 className="text-lg font-semibold mb-4">Your Wallets</h2>
        <WalletList
          onCreateWallet={() => setShowCreate(true)}
          onImportWallet={() => setShowImport(true)}
        />
      </Card>

      <CreateWalletModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <ImportWalletModal isOpen={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}
