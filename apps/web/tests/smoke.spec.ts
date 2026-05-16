import { test, expect } from '@playwright/test';

test.describe('Basic Page Loading', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Kokonut/i);
  });

  test('leaderboard page loads', async ({ page }) => {
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Agent Leaderboard');
  });

  test('marketplace page loads', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Marketplace');
  });

  test('review page loads', async ({ page }) => {
    await page.goto('/review', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Review & Evaluation');
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
    await expect(page.getByText('Total Services')).toBeVisible();
  });

  test('stat cards render on review page', async ({ page }) => {
    await page.goto('/review', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Active Proposals')).toBeVisible();
  });

  test('how evaluation works section on review page', async ({ page }) => {
    await page.goto('/review', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /How Evaluation Works/i })).toBeVisible();
  });
});
