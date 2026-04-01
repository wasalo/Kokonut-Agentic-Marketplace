import { test, expect } from '@playwright/test';

test.describe('Basic Page Loading', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Kokonut/i);
  });

  test('identity page loads', async ({ page }) => {
    await page.goto('/identity', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Identity');
  });

  test('marketplace page loads', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Marketplace');
  });

  test('review page loads', async ({ page }) => {
    await page.goto('/review', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Review');
  });

  // Skipped - requires wallet connection which causes timeout in CI
  test.skip('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('skills page loads', async ({ page }) => {
    await page.goto('/skills', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Agent Skills')).toBeVisible();
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
  test('stat cards render on identity page', async ({ page }) => {
    await page.goto('/identity', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Total Agents')).toBeVisible();
    await expect(page.locator('text=Active')).toBeVisible();
  });

  test('stat cards render on marketplace page', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Total Services')).toBeVisible();
    await expect(page.locator('text=Volume')).toBeVisible();
  });

  test('stat cards render on review page', async ({ page }) => {
    await page.goto('/review', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Active Proposals')).toBeVisible();
  });

  test('how evaluation works section on review page', async ({ page }) => {
    await page.goto('/review', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=How Evaluation Works')).toBeVisible();
  });
});
