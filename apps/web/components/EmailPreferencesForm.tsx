'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { Mail, Bell, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@heroui/react';
import { useEmailStore } from '@/lib/emails/store';
import type { EmailPreferences } from '@/lib/emails/types';
import { createOwnerAuthHeaders } from '@/lib/client-auth';

interface EmailPreferencesFormProps {
  onSuccess?: () => void;
}

export function EmailPreferencesForm({ onSuccess }: EmailPreferencesFormProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { getPreferences, setPreferences } = useEmailStore();

  const [email, setEmail] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState<'instant' | 'daily' | 'weekly'>('instant');
  const [types, setTypes] = useState({
    payment: true,
    job: true,
    proposal: true,
    weekly_digest: true,
    marketing: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address && isConnected) {
      const prefs = getPreferences(address);
      if (prefs) {
        setEmail(prefs.email || '');
        setEnabled(prefs.enabled);
        setFrequency(prefs.frequency);
        setTypes(prefs.types);
      }
    }
  }, [address, isConnected, getPreferences]);

  const handleToggleType = (type: keyof typeof types) => {
    setTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !walletClient) return;

    if (enabled && !email) {
      setError('Email address is required when notifications are enabled');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const prefs: Partial<EmailPreferences> = {
        email: email || undefined,
        enabled,
        frequency,
        types,
      };

      setPreferences(address, prefs);

      if (email) {
        const authHeaders = await createOwnerAuthHeaders(address, walletClient);
        await fetch('/api/emails/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ address, ...prefs }),
        });
      }

      setSaveSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="border border-divider p-6">
        <div className="text-center text-default-500">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Connect your wallet to manage email preferences</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-divider p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        Email Preferences
      </h2>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex items-center justify-between p-3 bg-content2 rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-default-500" />
            <div>
              <p className="font-medium">Enable Email Notifications</p>
              <p className="text-xs text-default-500">Receive updates via email</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-default-200 rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        {enabled && (
          <>
            <div>
              <label className="text-sm font-medium mb-2 block">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Notification Frequency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['instant', 'daily', 'weekly'] as const).map(freq => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setFrequency(freq)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      frequency === freq
                        ? 'bg-primary text-white'
                        : 'bg-content2 text-default-600 hover:bg-content3'
                    }`}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-3">Notification Types</label>
              <div className="space-y-2">
                {Object.entries(types).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-content2 transition-colors"
                  >
                    <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => handleToggleType(key as keyof typeof types)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-default-200 rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-danger/10 text-danger rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-success/10 text-success rounded-lg text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Preferences saved successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </button>
      </form>
    </Card>
  );
}
