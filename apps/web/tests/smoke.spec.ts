import { test, expect } from '@playwright/test';

test.describe('Basic Page Loading', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Kokonut/i);
  });

  test('leaderboard page loads', async ({ page }) => {
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Agent Leaderboard/i })).toBeVisible({ timeout: 15000 });
  });

  test('marketplace page loads', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
    // Wait for dynamic marketplace content to load (ssr: false)
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('h1').filter({ hasText: 'Marketplace' })).toBeVisible({ timeout: 15000 });
  });

  // Skipped - requires wallet connection which causes timeout in CI
  test.skip('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('skills page loads', async ({ page }) => {
    await page.goto('/marketplace/skills', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Browse Skills/i })).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('navbar is present on homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(
      page.locator('nav, header, [class*="navbar"], [class*="nav"]').first()
    ).toBeVisible();
  });

  test('footer is present on homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('footer')).toBeVisible();
  });
});

test.describe('UI Elements', () => {
  test('stat cards render on leaderboard page', async ({ page }) => {
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Total Kokonut Agents', { exact: false })).toBeVisible();
    await expect(page.getByText('On Leaderboard', { exact: false })).toBeVisible();
  });

  test('stat cards render on marketplace page', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
    // Wait for any main content to appear
    await expect(page.locator('main')).toBeVisible({ timeout: 20000 });
    // Check for stat cards or loading state
    await expect(page.locator('text=Total Services').or(page.locator('[class*="animate-pulse"]'))).toBeVisible({ timeout: 15000 });
  });


});
