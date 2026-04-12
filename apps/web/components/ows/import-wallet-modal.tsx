'use client';

import { useState } from 'react';
import { OWSChain, OWS_POLICY_TEMPLATES, OWSImportData } from '@/lib/ows/types';
import { useOWSWallet } from '@/lib/hooks/useOWSWallet';

interface ImportWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportType = 'seed' | 'privateKey' | 'json';

const chains: { key: OWSChain; label: string }[] = [
  { key: 'sepolia', label: 'Sepolia (Testnet)' },
  { key: 'ethereum', label: 'Ethereum Mainnet' },
  { key: 'polygon', label: 'Polygon' },
  { key: 'arbitrum', label: 'Arbitrum' },
  { key: 'optimism', label: 'Optimism' },
  { key: 'bsc', label: 'BNB Chain' },
  { key: 'avalanche', label: 'Avalanche' },
];

export function ImportWalletModal({ isOpen, onClose }: ImportWalletModalProps) {
  const { importWallet, isLoading } = useOWSWallet();

  const [step, setStep] = useState<'type' | 'details' | 'passphrase'>('type');
  const [importType, setImportType] = useState<ImportType>('seed');
  const [name, setName] = useState('');
  const [chain, setChain] = useState<OWSChain>('sepolia');
  const [policyId, setPolicyId] = useState<string>('');
  const [passphrase, setPassphrase] = useState('');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [jsonContent, setJsonContent] = useState('');
  const [jsonPassword, setJsonPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [chainDropdownOpen, setChainDropdownOpen] = useState(false);
  const [policyDropdownOpen, setPolicyDropdownOpen] = useState(false);

  const resetForm = () => {
    setStep('type');
    setImportType('seed');
    setName('');
    setChain('sepolia');
    setPolicyId('');
    setPassphrase('');
    setSeedPhrase('');
    setPrivateKey('');
    setJsonContent('');
    setJsonPassword('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleImport = async () => {
    if (!name.trim()) {
      setError('Please enter a wallet name');
      return;
    }
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }

    let importData: OWSImportData;
    if (importType === 'seed' && !seedPhrase.trim()) {
      setError('Please enter your seed phrase');
      return;
    }
    if (importType === 'privateKey' && !privateKey.trim()) {
      setError('Please enter your private key');
      return;
    }
    if (importType === 'json' && !jsonContent.trim()) {
      setError('Please paste your wallet JSON');
      return;
    }

    switch (importType) {
      case 'seed':
        importData = { type: 'seed', seed: seedPhrase.trim() };
        break;
      case 'privateKey':
        importData = { type: 'privateKey', privateKey: privateKey.trim() };
        break;
      case 'json':
        importData = { type: 'json', json: jsonContent.trim(), password: jsonPassword };
        break;
    }

    try {
      await importWallet(name.trim(), chain, passphrase, importData, policyId || undefined);
      handleClose();
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
            <span className="text-xl">📤</span>
            <h2 className="text-xl font-semibold">Import Wallet</h2>
          </div>

          {step === 'type' && (
            <div className="space-y-4">
              <p className="text-default-500">Select how you want to import your wallet</p>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setImportType('seed')}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    importType === 'seed'
                      ? 'border-primary bg-primary/10'
                      : 'border-divider hover:border-default-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔑</span>
                    <div>
                      <div className="font-medium">Seed Phrase</div>
                      <div className="text-sm text-default-500">
                        Import using 12 or 24 word recovery phrase
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setImportType('privateKey')}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    importType === 'privateKey'
                      ? 'border-primary bg-primary/10'
                      : 'border-divider hover:border-default-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔐</span>
                    <div>
                      <div className="font-medium">Private Key</div>
                      <div className="text-sm text-default-500">
                        Import using hex private key (0x...)
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setImportType('json')}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    importType === 'json'
                      ? 'border-primary bg-primary/10'
                      : 'border-divider hover:border-default-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div>
                      <div className="font-medium">JSON File</div>
                      <div className="text-sm text-default-500">
                        Import from encrypted wallet JSON backup
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep('details')}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600"
              >
                Continue
              </button>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Wallet Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-divider rounded-lg bg-background"
                  placeholder="My Imported Wallet"
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

              {importType === 'seed' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Seed Phrase</label>
                  <textarea
                    className="w-full px-3 py-2 border border-divider rounded-lg bg-background font-mono text-sm"
                    rows={3}
                    placeholder="word1 word2 word3 ... word12"
                    value={seedPhrase}
                    onChange={e => setSeedPhrase(e.target.value)}
                  />
                  <p className="text-xs text-default-500 mt-1">
                    Enter your 12 or 24 word seed phrase, words separated by spaces
                  </p>
                </div>
              )}

              {importType === 'privateKey' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Private Key</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-divider rounded-lg bg-background font-mono text-sm"
                    placeholder="0x..."
                    value={privateKey}
                    onChange={e => setPrivateKey(e.target.value)}
                  />
                </div>
              )}

              {importType === 'json' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Wallet JSON</label>
                    <textarea
                      className="w-full px-3 py-2 border border-divider rounded-lg bg-background font-mono text-sm"
                      rows={4}
                      placeholder='{"encryptedPrivateKey": "...", "salt": "...", "iv": "..."}'
                      value={jsonContent}
                      onChange={e => setJsonContent(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">JSON Password</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-divider rounded-lg bg-background"
                      placeholder="Password used to encrypt this JSON"
                      value={jsonPassword}
                      onChange={e => setJsonPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('type')}
                  className="flex-1 px-4 py-2 border border-divider rounded-lg hover:bg-content2"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('passphrase')}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 'passphrase' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Encryption Passphrase</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-divider rounded-lg bg-background"
                  placeholder="Create a passphrase to secure this wallet"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                />
                <p className="text-xs text-default-500 mt-1">Minimum 8 characters</p>
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
                  onClick={handleImport}
                  disabled={!passphrase || passphrase.length < 8 || isLoading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  {isLoading ? 'Importing...' : 'Import Wallet'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
