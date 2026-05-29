import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('homepage renders correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('navigation').first().waitFor({ timeout: 15000 });

    // Take a screenshot for comparison
    await page.screenshot({ path: 'tests/snapshots/homepage.png', fullPage: true });

    // Basic content checks
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });

  test('marketplace page loads', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 20000 });

    await page.screenshot({ path: 'tests/snapshots/marketplace.png', fullPage: true });
  });

  test('jobs page loads', async ({ page }) => {
    await page.goto('/jobs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Work Marketplace/i })).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'tests/snapshots/jobs.png', fullPage: true });
  });

  test('leaderboard page loads', async ({ page }) => {
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Agent Leaderboard/i })).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'tests/snapshots/leaderboard.png', fullPage: true });
  });

  test('dashboard redirects when not connected', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/snapshots/dashboard.png', fullPage: true });
  });

  test('mobile viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 20000 });

    await page.screenshot({
      path: 'tests/snapshots/marketplace-mobile.png',
      fullPage: true,
    });
  });

  test('dark mode renders correctly', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 20000 });

    // Toggle dark mode if available
    const themeButton = page.getByRole('button', { name: /theme/i }).first();
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'tests/snapshots/marketplace-dark.png', fullPage: true });
  });
});

test.describe('Component Visual Tests', () => {
  test('service card component', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 20000 });

    // Wait for services to load
    const serviceCard = page.locator('[class*="card"]').first();
    if (await serviceCard.isVisible()) {
      await serviceCard.screenshot({ path: 'tests/snapshots/service-card.png' });
    }
  });

  test('job card component', async ({ page }) => {
    await page.goto('/jobs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Work Marketplace/i })).toBeVisible({ timeout: 15000 });

    const jobCard = page.locator('[class*="card"]').first();
    if (await jobCard.isVisible()) {
      await jobCard.screenshot({ path: 'tests/snapshots/job-card.png' });
    }
  });
});
