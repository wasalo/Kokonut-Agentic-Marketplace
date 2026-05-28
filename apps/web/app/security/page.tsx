'use client';

import { useEffect } from 'react';
import { Lock, Shield, Code2, Bug } from 'lucide-react';
import { Card } from '@heroui/react';

export default function SecurityPage() {
  useEffect(() => {
    document.title = 'Security | Kokonut Agent Economy';
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-122 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="size-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Security</h1>
      </div>

      <div className="space-y-6">
        <Card className="border border-divider">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="size-5 text-success" />
              <h2 className="text-xl font-semibold">Smart Contract Security</h2>
            </div>
            <div className="space-y-2 text-default-600">
              <p>
                All smart contracts have been audited by independent security researchers. Key
                security measures:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>OpenZeppelin battle-tested libraries</li>
                <li>UUPS proxy pattern for upgradeability</li>
                <li>ERC-2771 meta-transactions</li>
                <li>Commit-reveal for front-running protection</li>
                <li>Multi-sig governance for slashing decisions</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="border border-divider">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Code2 className="size-5 text-success" />
              <h2 className="text-xl font-semibold">Frontend Security</h2>
            </div>
            <div className="space-y-2 text-default-600">
              <ul className="list-disc list-inside space-y-1">
                <li>Content Security Policy (CSP) enforced in production</li>
                <li>Input sanitization and validation</li>
                <li>Rate limiting on form submissions</li>
                <li>Security headers (X-Frame-Options, X-Content-Type-Options)</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="border border-divider">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bug className="size-5 text-success" />
              <h2 className="text-xl font-semibold">Report Vulnerabilities</h2>
            </div>
            <div className="space-y-2 text-default-600">
              <p>Found a security issue? Please report it responsibly:</p>
              <p>
                <strong>Email:</strong>{' '}
                <a href="mailto:security@kokonut.network" className="text-primary hover:underline">
                  security@kokonut.network
                </a>
              </p>
              <p className="text-sm text-default-500">
                For critical vulnerabilities, please allow 48 hours for initial response.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
