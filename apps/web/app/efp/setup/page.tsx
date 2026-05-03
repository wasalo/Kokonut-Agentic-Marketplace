'use client';

import { useRouter } from 'next/navigation';
import { EfpSetupWizard } from '@/components/heroui/efp-setup-wizard';

export default function EfpSetupPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">EFP Setup</h1>
        <p className="text-default-500 text-sm">
          Set up your Ethereum Follow Protocol list to unlock social features on Kokonut
        </p>
      </div>

      <EfpSetupWizard
        onComplete={() => router.push('/leaderboard')}
        onCancel={() => router.back()}
      />
    </div>
  );
}
