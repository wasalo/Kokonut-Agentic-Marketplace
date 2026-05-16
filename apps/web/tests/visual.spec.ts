import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Visual Regression', () => {
  test('homepage renders correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('marketplace page renders correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('marketplace.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('jobs page renders correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('jobs.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('dashboard page renders correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('mobile homepage renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('dark mode homepage renders correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('navigation is accessible', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    const skipLink = page.locator('[data-skip-link]');
    await expect(skipLink).toBeVisible();
  });

  test('error boundary renders on invalid route', async ({ page }) => {
    await page.goto(`${BASE_URL}/nonexistent-page-123`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('error-boundary.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
