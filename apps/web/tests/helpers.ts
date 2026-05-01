import { test as base, Page, Locator } from '@playwright/test';

export const VALID_PROVIDER_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
export const VALID_EVALUATOR_ADDRESS = '0x853d955aCE821b0782e5d2852f57218397d6f62';
export const INVALID_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44123';

export const VALID_SERVICE_NAME = 'Test Service';
export const VALID_SERVICE_DESCRIPTION = 'This is a test service for E2E testing';
export const VALID_PRICE = '100'; // $100 USDC

export const MIN_BUDGET = '0.01';
export const MAX_BUDGET = '1000';

export async function getByLabel(page: Page, label: string): Promise<Locator> {
  return page.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea, select');
}

export async function fillInput(page: Page, label: string, value: string): Promise<void> {
  const input = page.locator(`input[id="${label.toLowerCase().replace(/\s+/g, '-')}"], textarea[id="${label.toLowerCase().replace(/\s+/g, '-')}"]`);
  await input.fill(value);
}

export async function clickButton(page: Page, text: string): Promise<void> {
  await page.locator(`button:has-text("${text}")`).click();
}

export async function waitForToast(page: Page, text: string, timeout = 5000): Promise<void> {
  await page.locator(`[class*="toast"]:has-text("${text}")`).waitFor({ timeout });
}

export async function waitForError(page: Page, text: string, timeout = 5000): Promise<void> {
  await page.locator(`.text-danger:has-text("${text}")`).waitFor({ timeout });
}

export async function connectWallet(page: Page): Promise<void> {
  await page.locator('button:has-text("Connect Wallet")').click();
}

export async function disconnectWallet(page: Page): Promise<void> {
  await page.locator('[class*="wallet-connect"], [class*="rainbowkit"]').first().click();
  await page.locator('button:has-text("Disconnect")').click().catch(() => {});
}

export async function clearInput(page: Page, selector: string): Promise<void> {
  await page.locator(selector).fill('');
}

export function createFormTests(suiteName: string, baseUrl: string) {
  return base.describe(suiteName, () => {
    base.beforeEach(async ({ page }) => {
      await page.goto(baseUrl);
    });
  });
}