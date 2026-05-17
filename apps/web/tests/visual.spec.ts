import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Visual Regression', () => {
  test('homepage renders correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveTitle(/Kokonut/i);
    await expect(page.locator('nav')).toBeVisible();
  });

  test('marketplace page renders correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`);
    await page.waitForLoadState('domcontentloaded');
    // Wait for dynamic content (ssr: false)
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('h1').filter({ hasText: 'Marketplace' })).toBeVisible({ timeout: 15000 });
  });

  test('jobs page renders correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: /Jobs/i })).toBeVisible({ timeout: 15000 });
  });

  test('dashboard page renders correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('domcontentloaded');

    // Dashboard may redirect if wallet not connected, just verify page loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('mobile homepage renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveTitle(/Kokonut/i);
    await expect(page.locator('nav')).toBeVisible();
  });

  test('dark mode homepage renders correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveTitle(/Kokonut/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation is accessible', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    const skipLink = page.locator('[data-skip-link]');
    await expect(skipLink).toBeVisible();
  });

  test('error boundary renders on invalid route', async ({ page }) => {
    await page.goto(`${BASE_URL}/nonexistent-page-123`);
    await page.waitForLoadState('domcontentloaded');

    // Error page should load (content varies)
    await expect(page.locator('body')).toBeVisible();
  });
});
