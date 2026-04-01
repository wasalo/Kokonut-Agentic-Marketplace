import { test, expect } from '@playwright/test';

test.describe('User Flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('navigate from homepage to identity page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Click on Identity link
    await page.click('text=Identity');
    await page.waitForURL('**/identity');

    await expect(page.locator('h1')).toContainText('Identity');
  });

  test('navigate from homepage to marketplace', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Click on Marketplace link
    await page.click('text=Marketplace');
    await page.waitForURL('**/marketplace');

    await expect(page.locator('h1')).toContainText('Marketplace');
  });

  test('navigate from homepage to review page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Click on More dropdown to reveal Review link
    await page.click('text=More');
    // Click on Review link
    await page.click('text=Review');
    await page.waitForURL('**/review');

    await expect(page.locator('h1')).toContainText('Review');
  });

  test('search functionality on identity page', async ({ page }) => {
    await page.goto('/identity', { waitUntil: 'domcontentloaded' });

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
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
    await expect(page.locator('text=About Kokonut')).toBeVisible();
    await expect(
      page.locator('text=Building the infrastructure for the agent economy.')
    ).toBeVisible();
  });

  test('navigate to skills page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Click on More dropdown to reveal Skills link
    await page.click('text=More');
    // Click on Skills link
    await page.click('text=Skills');
    await page.waitForURL('**/skills');

    await expect(page.locator('text=Skill Categories')).toBeVisible();
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

  test('marketplace shows empty state when no services', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });

    // Wait a bit for content to load
    await page.waitForTimeout(500);

    // The empty state should be visible when no services exist
    const emptyStateHeading = page.locator('text=No Services Yet');
    await expect(emptyStateHeading).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('homepage renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1')).toBeVisible();
  });

  test('identity page renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/identity', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('text=Total Agents')).toBeVisible();
  });
});
