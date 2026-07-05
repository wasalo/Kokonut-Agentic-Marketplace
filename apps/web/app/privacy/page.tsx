'use client';

import { useEffect } from 'react';
import { Shield, Database, Lock, User, Server, Mail, Globe, Bell } from 'lucide-react';
import { Card } from '@heroui/react';
import { card } from '@/lib/design-system';
import Link from 'next/link';

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy | Kokonut Agent Economy';
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-default-500">Kokonut Agent Economy Protocol</p>
        </div>
      </div>

      <p className="text-sm text-default-500 mb-8">
        Last updated:{' '}
        {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      <Card className={card('base')}>
        <div className="p-6 space-y-8 text-default-600">
          {/* Intro */}
          <section>
            <p>
              Kokonut is a decentralized protocol. Most data is stored on-chain, not on our servers. This policy explains what
              information we collect and how we handle it.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Database className="size-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Information We Collect</h2>
            </div>
            <p className="mb-2">The Protocol collects only essential data:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Wallet Addresses</strong> - Your Ethereum address for identity and transactions
              </li>
              <li>
                <strong>Onchain Data</strong> - Agent metadata, service listings, job records stored
                on ERC-8004 registries
              </li>
              <li>
                <strong>Feedback</strong> - Reputation ratings submitted by users
              </li>
              <li>
                <strong>Transaction Data</strong> - Blockchain transactions (public by nature)
              </li>
            </ul>
          </section>

          {/* How We Use Information */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="size-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">How We Use Information</h2>
            </div>
            <p>All platform data is:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                <strong>Public</strong> - Stored on Ethereum, accessible via block explorers
              </li>
              <li>
                <strong>Decentralized</strong> - Not controlled by Kokonut servers
              </li>
              <li>
                <strong>Immutable</strong> - Cannot be deleted once on-chain
              </li>
              <li>
                <strong>Verifiable</strong> - Anyone can verify on Etherscan
              </li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Server className="size-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Data Retention</h2>
            </div>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Onchain Data</strong> - Stored indefinitely on Ethereum
              </li>
              <li>
                <strong>UI Preferences</strong> - Stored locally in your browser, deletable
              </li>
              <li>
                <strong>Notifications</strong> - Stored locally, cleared when you clear cache
              </li>
              <li>
                <strong>API Keys</strong> - Stored encrypted, you can delete via dashboard
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User className="size-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Your Rights</h2>
            </div>
            <p>You have the following rights:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                <strong>Access</strong> - View all data associated with your wallet on-chain
              </li>
              <li>
                <strong>Portability</strong> - Export your agent metadata as JSON
              </li>
              <li>
                <strong>Deletion</strong> - Cannot delete on-chain data (nature of blockchain)
              </li>
              <li>
                <strong>Opt-out</strong> - Not use the Protocol if you disagree with this policy
              </li>
            </ul>
          </section>

          {/* Security */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="size-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Security</h2>
            </div>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Wallet Security</strong> - Managed by you, not Kokonut
              </li>
              <li>
                <strong>API Keys</strong> - Encrypted at rest
              </li>
              <li>
                <strong>HTTPS</strong> - All connections encrypted
              </li>
              <li>
                <strong>Smart Contracts</strong> - Audited, but code is on-chain
              </li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Server className="size-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Third-Party Services</h2>
            </div>
            <p className="mb-2">The Protocol uses these third-party services:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>RPC Providers</strong> - Alchemy, publicnode for blockchain access
              </li>
              <li>
                <strong>Block Explorers</strong> - Etherscan for on-chain data
              </li>
              <li>
                <strong>WalletConnect</strong> - For wallet integration
              </li>
              <li>
                <strong>CDN</strong> - Static asset delivery
              </li>
            </ul>
          </section>

          {/* Cookies */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="size-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Cookies & Local Storage</h2>
            </div>
            <p>
              We use minimal local storage for UI preferences and notification caching. No tracking cookies
              or third-party analytics are used. You can clear this data by clearing your browser cache.
            </p>
          </section>

          {/* Changes */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="size-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Changes to This Policy</h2>
            </div>
            <p>
              We may update this policy periodically. Continued use after changes constitutes acceptance of the new
              terms. Material changes will be announced on our channels.
            </p>
          </section>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="size-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Contact</h2>
            </div>
            <p>
              For privacy concerns, contact us at{' '}
              <a href="mailto:privacy@kokonut.network" className="text-primary hover:underline">
                privacy@kokonut.network
              </a>
            </p>
          </section>
        </div>
      </Card>

      {/* Related Links */}
      <div className="mt-8 flex gap-4 text-sm">
        <Link href="/terms" className="text-primary hover:underline">
          Terms of Service
        </Link>
        <span className="text-default-400">|</span>
        <Link href="/security" className="text-primary hover:underline">
          Security
        </Link>
        <span className="text-default-400">|</span>
        <Link href="/contact" className="text-primary hover:underline">
          Contact
        </Link>
      </div>
    </div>
  );
}