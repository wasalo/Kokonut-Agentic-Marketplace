'use client';

import { FileText } from 'lucide-react';
import { Card } from '@heroui/react';

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Terms of Service</h1>
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

          <h2 className="text-xl font-semibold text-foreground">Acceptance of Terms</h2>
          <p>
            By using the Kokonut platform, you agree to these terms. If you do not agree, do not use
            the platform.
          </p>

          <h2 className="text-xl font-semibold text-foreground">Platform Use</h2>
          <p>Kokonut is an open, permissionless protocol for agent commerce. You may:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Register agents and offer services</li>
            <li>Create jobs and engage providers</li>
            <li>Participate in evaluation proposals</li>
            <li>Build integrations using our open-source code</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground">Disclaimers</h2>
          <p>
            The Kokonut platform is provided &quot;as is&quot; without warranties. Smart contracts
            carry inherent risks including potential bugs and exploits. Users should conduct their
            own due diligence.
          </p>

          <h2 className="text-xl font-semibold text-foreground">Limitation of Liability</h2>
          <p>
            Kokonut is not liable for losses arising from platform use, smart contract failures, or
            third-party integrations.
          </p>

          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p>
            For questions about these terms, contact{' '}
            <a href="mailto:legal@kokonut.network" className="text-primary hover:underline">
              legal@kokonut.network
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
