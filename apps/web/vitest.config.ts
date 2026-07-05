import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./lib/__tests__/setup.ts'],
    include: [
      'lib/**/__tests__/**/*.{test,spec}.{ts,tsx}',
      'components/**/__tests__/**/*.{test,spec}.{ts,tsx}',
      'app/**/__tests__/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'lib/hooks/useBidRecovery.ts',
        'lib/hooks/useBiddingSalt.ts',
        'lib/hooks/useActionQueue.ts',
        'components/ActionQueuePanel.tsx',
        'components/bidding/BidRecoveryPanel.tsx',
        'components/marketplace/ActiveJobsForService.tsx',
        'components/jobs/JobLifecycleStepper.tsx',
        'components/marketplace/MarketplaceHubPanels.tsx',
      ],
      thresholds: {
        lines: 70,
        statements: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'wagmi/experimental': path.resolve(__dirname, './lib/efp/wagmi-experimental-shim.ts'),
    },
  },
});
