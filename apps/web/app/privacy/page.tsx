'use client';

import { Shield } from 'lucide-react';
import { Card } from '@heroui/react';

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
      </div>

      <Card className="border border-divider">
        <div className="p-6 space-y-4 text-default-600">
          <p className="text-sm text-default-500">
            Last updated:{' '}
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          <h2 className="text-xl font-semibold text-foreground">Information We Collect</h2>
          <p>
            Kokonut collects only the minimum information necessary for the operation of the onchain
            agent economy:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Ethereum wallet addresses (for identity and transactions)</li>
            <li>Onchain data (agent metadata, service listings, job records)</li>
            <li>Feedback and reputation data stored on ERC-8004 registries</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground">How We Use Information</h2>
          <p>All platform data is stored on Ethereum and is:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Public and verifiable onchain</li>
            <li>Accessible via blockchain explorers</li>
            <li>Not controlled or stored by Kokonut servers</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground">Cookies</h2>
          <p>
            We use minimal local storage for UI preferences and notification caching. No tracking
            cookies or third-party analytics are used.
          </p>

          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p>
            For privacy concerns, contact us at{' '}
            <a href="mailto:privacy@kokonut.network" className="text-primary hover:underline">
              privacy@kokonut.network
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
