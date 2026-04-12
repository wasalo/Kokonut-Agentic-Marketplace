'use client';

import { useState } from 'react';
import { OWSChain, OWS_POLICY_TEMPLATES } from '@/lib/ows/types';
import { useOWSWallet } from '@/lib/hooks/useOWSWallet';

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const chains: { key: OWSChain; label: string }[] = [
  { key: 'sepolia', label: 'Sepolia (Testnet)' },
  { key: 'ethereum', label: 'Ethereum Mainnet' },
  { key: 'polygon', label: 'Polygon' },
  { key: 'arbitrum', label: 'Arbitrum' },
  { key: 'optimism', label: 'Optimism' },
  { key: 'bsc', label: 'BNB Chain' },
  { key: 'avalanche', label: 'Avalanche' },
];

export function CreateWalletModal({ isOpen, onClose }: CreateWalletModalProps) {
  const { createWallet, isLoading } = useOWSWallet();

  const [step, setStep] = useState<'details' | 'passphrase' | 'seed' | 'confirm'>('details');
  const [name, setName] = useState('');
  const [chain, setChain] = useState<OWSChain>('sepolia');
  const [policyId, setPolicyId] = useState<string>('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showSeed, setShowSeed] = useState(false);
  const [seedConfirmed, setSeedConfirmed] = useState(false);
  const [chainDropdownOpen, setChainDropdownOpen] = useState(false);
  const [policyDropdownOpen, setPolicyDropdownOpen] = useState(false);

  const resetForm = () => {
    setStep('details');
    setName('');
    setChain('sepolia');
    setPolicyId('');
    setPassphrase('');
    setConfirmPassphrase('');
    setSeedPhrase('');
    setError('');
    setSeedConfirmed(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    try {
      const result = await createWallet(name.trim(), chain, passphrase, policyId || undefined);
      setSeedPhrase(result.seedPhrase);
      setStep('seed');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-background border border-divider rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-default-400 hover:text-foreground"
        >
          ✕
        </button>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xl">💼</span>
            <h2 className="text-xl font-semibold">Create New Wallet</h2>
          </div>

          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Wallet Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-divider rounded-lg bg-background"
                  placeholder="My Job Funding Wallet"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Network</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setChainDropdownOpen(!chainDropdownOpen)}
                    className="w-full px-3 py-2 border border-divider rounded-lg text-left bg-background flex items-center justify-between"
                  >
                    <span>{chains.find(c => c.key === chain)?.label}</span>
                    <span>▼</span>
                  </button>
                  {chainDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 border border-divider rounded-lg bg-background z-10 max-h-48 overflow-y-auto">
                      {chains.map(c => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => {
                            setChain(c.key);
                            setChainDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-content2"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Policy (Optional)</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPolicyDropdownOpen(!policyDropdownOpen)}
                    className="w-full px-3 py-2 border border-divider rounded-lg text-left bg-background flex items-center justify-between"
                  >
                    <span>
                      {policyId
                        ? OWS_POLICY_TEMPLATES.find(p => p.id === policyId)?.name || 'Custom'
                        : 'No Policy'}
                    </span>
                    <span>▼</span>
                  </button>
                  {policyDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 border border-divider rounded-lg bg-background z-10 max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setPolicyId('');
                          setPolicyDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-content2"
                      >
                        No Policy
                      </button>
                      {OWS_POLICY_TEMPLATES.map(template => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => {
                            setPolicyId(template.id);
                            setPolicyDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-content2"
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setStep('passphrase')}
                disabled={!name.trim()}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {step === 'passphrase' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Passphrase</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-divider rounded-lg bg-background"
                  placeholder="Enter a strong passphrase"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                />
                <p className="text-xs text-default-500 mt-1">Minimum 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm Passphrase</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-divider rounded-lg bg-background"
                  placeholder="Confirm your passphrase"
                  value={confirmPassphrase}
                  onChange={e => setConfirmPassphrase(e.target.value)}
                />
              </div>

              {error && <p className="text-danger text-sm">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('details')}
                  className="flex-1 px-4 py-2 border border-divider rounded-lg hover:bg-content2"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!passphrase || !confirmPassphrase || isLoading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Wallet'}
                </button>
              </div>
            </div>
          )}

          {step === 'seed' && (
            <div className="space-y-4">
              <div className="bg-warning/10 p-4 rounded-lg flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="font-medium text-warning">Save Your Seed Phrase</h4>
                  <p className="text-sm text-default-500">
                    Write down these 12 words in order and store them securely.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div
                  className={`font-mono text-sm p-4 bg-default-50 rounded-lg border min-h-[80px] ${showSeed ? '' : 'blur-sm'}`}
                >
                  {showSeed ? seedPhrase : '••••••••••••••••••••••••••••••••••••••'}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSeed(!showSeed)}
                  className="absolute top-2 right-2 px-2 py-1 text-xs border rounded"
                >
                  {showSeed ? 'Hide' : 'Show'}
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seedConfirmed}
                  onChange={e => setSeedConfirmed(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">I have securely stored my seed phrase</span>
              </label>

              <button
                onClick={handleClose}
                disabled={!seedConfirmed}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                I Understand - Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
