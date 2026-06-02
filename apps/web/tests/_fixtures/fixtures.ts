/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Playwright fixtures for common page states.
 * Use via: `import { test, expect } from '../_fixtures/fixtures';`
 *
 * The `use` callbacks below are Playwright fixture destructure args, not React
 * hooks. The rule is disabled for this file because ESLint cannot distinguish.
 */
import { test as base, type Page } from '@playwright/test';
import { installMockWallet, connectMockWallet } from './wallet-mock';

type Fixtures = {
  freshPage: Page;
  connectedPage: Page;
  walletPage: Page;
};

export const test = base.extend<Fixtures>({
  freshPage: async ({ context, page }, use) => {
    await installMockWallet(context);
    await use(page);
  },
  walletPage: async ({ context, page }, use) => {
    await installMockWallet(context);
    await use(page);
  },
  connectedPage: async ({ context, page }, use) => {
    await installMockWallet(context);
    await page.goto('/');
    await connectMockWallet(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
