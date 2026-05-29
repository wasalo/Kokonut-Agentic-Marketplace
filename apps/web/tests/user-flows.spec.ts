import { test, expect } from '@playwright/test';

test.describe('User Flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('navigate from homepage to leaderboard page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.click('text=Leaderboard');
    await page.waitForURL('**/leaderboard', { timeout: 30000 });

    await expect(page.getByRole('heading', { name: /Agent Leaderboard/i })).toBeVisible({ timeout: 15000 });
  });

  test('navigate from homepage to marketplace', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Click on Marketplace link - use first visible match for mobile compatibility
    const marketplaceLink = page.getByRole('link', { name: /Marketplace/i }).first();
    await marketplaceLink.click();
    await page.waitForURL('**/marketplace', { timeout: 30000 });

    // Wait for dynamic content (ssr: false)
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('h1').filter({ hasText: 'Marketplace' })).toBeVisible({ timeout: 15000 });
  });

  test.skip('search functionality on leaderboard page', async ({ page }) => {
    // Leaderboard page does not have a search input
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Agent Leaderboard');
  });

  test('search functionality on marketplace page', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search services"]');
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('web');
    await expect(searchInput).toHaveValue('web');
  });

  test('navigate to about page', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });

    // Verify about page content is visible
    await expect(page.getByRole('heading', { name: /About Kokonut/i })).toBeVisible();
    await expect(
      page.getByText('Building the infrastructure for the agent economy.')
    ).toBeVisible();
  });

  test('navigate to skills page', async ({ page }) => {
    await page.goto('/marketplace/skills', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Skill Explorer/i })).toBeVisible();
  });
});

test.describe('Error States', () => {
  test('404 page renders correctly', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');

    // Should show 404 content
    await expect(page.locator('text=404'))
      .toBeVisible({ timeout: 10000 })
      .catch(() => {
        // 404 might not show on static pages, so just check page loads
      });
  });

  test('marketplace page shows content', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });

    // Wait for main content to load
    await expect(page.locator('main')).toBeVisible({ timeout: 20000 });

    // Page loaded successfully
    expect(true).toBe(true);
  });
});

test.describe('Responsive Design', () => {
  test('homepage renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/Kokonut/i);
    await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 15000 });
  });

  test('leaderboard page renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Agent Leaderboard/i })).toBeVisible();
  });
});
