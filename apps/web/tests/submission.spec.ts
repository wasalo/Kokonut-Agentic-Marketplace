import { test, expect } from '@playwright/test';

const MIN_USDC = '0.01';

test.describe('Form View Tests - No Wallet Required', () => {
  test('Job Creation form loads with all fields', async ({ page }) => {
    await page.goto('/jobs/create');
    // Wait for dynamic form to load (ssr: false)
    await page.locator('form').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').filter({ hasText: 'Create Job' })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('input[id="budget"]')).toBeVisible();
    await expect(page.locator('textarea[id="description"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create Job")')).toBeVisible();
  });

  // Requires registered agents - skipped in CI
  test.skip('Service Creation form loads with all fields', async ({ page }) => {
    await page.goto('/marketplace/create');
    await expect(page.locator('h1:has-text("Create Service")')).toBeVisible();
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('input[id="price"]')).toBeVisible();
    await expect(page.locator('textarea[id="description"]')).toBeVisible();
  });

  test('Proposal Creation form loads with all fields', async ({ page }) => {
    await page.goto('/review/create');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').filter({ hasText: 'Create Proposal' })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('input[id="title"]')).toBeVisible();
    await expect(page.locator('input[id="reward"]')).toBeVisible();
  });

  // Requires wallet connection - skipped in CI
  test.skip('Bidding form loads with all fields', async ({ page }) => {
    await page.goto('/bidding/create');
    await expect(page.locator('text=Create Session')).toBeVisible();
    await expect(page.locator('input[id="evaluator"]')).toBeVisible();
    await expect(page.locator('input[id="max-budget"]')).toBeVisible();
  });

  // Requires wallet connection - skipped in CI
  test.skip('Skill registration form loads', async ({ page }) => {
    await page.goto('/dashboard/skills');
    await expect(page.locator('text=Register Skill')).toBeVisible();
  });
});

test.describe('Form Validation - Real-time', () => {
  // Requires contract calls (min budget) - skipped in CI
  test.skip('Job budget validates below minimum', async ({ page }) => {
    await page.goto('/jobs/create');
    await page.locator('input[id="budget"]').fill('0.001');
    await page.locator('input[id="budget"]').blur();
    await expect(page.locator('text=Minimum budget is')).toBeVisible();
  });

  test('Job deadline validates past date', async ({ page }) => {
    await page.goto('/jobs/create');
    // Wait for dynamic form to load (ssr: false)
    await page.locator('form').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForLoadState('networkidle');
    const pastDate = '2020-01-01T00:00';
    await page.locator('input[id="deadline"]').fill(pastDate);
    await page.locator('input[id="deadline"]').blur();
    await expect(page.locator('text=Must be at least').or(page.locator('text=invalid'))).toBeVisible({ timeout: 10000 });
  });

  // Requires registered agents - skipped in CI
  test.skip('Service price validates below minimum', async ({ page }) => {
    await page.goto('/marketplace/create');
    await page.locator('input[id="price"]').fill('0.001');
    await page.locator('input[id="price"]').blur();
    await expect(page.locator('text=Minimum price is')).toBeVisible();
  });

  // Requires registered agents - skipped in CI
  test.skip('Service name validates empty', async ({ page }) => {
    await page.goto('/marketplace/create');
    await page.locator('input[id="name"]').fill('');
    await page.locator('input[id="name"]').blur();
    await expect(page.locator('text=Service name is required')).toBeVisible();
  });

  // Requires form submission (wallet) - skipped in CI
  test.skip('Proposal reward validates below minimum', async ({ page }) => {
    await page.goto('/review/create');
    await page.locator('input[id="reward"]').fill('0.005');
    await page.locator('input[id="reward"]').blur();
    await expect(page.locator('text=Minimum reward is')).toBeVisible();
  });

  // Requires wallet connection - skipped in CI
  test.skip('Bidding budget validates below minimum', async ({ page }) => {
    await page.goto('/bidding/create');
    await page.locator('input[id="max-budget"]').fill('0.001');
    await page.locator('input[id="max-budget"]').blur();
    await expect(page.locator('text=Minimum budget is')).toBeVisible();
  });
});

test.describe('Dashboard Pages', () => {
  // Requires wallet connection - skipped in CI
  test.skip('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  // Requires wallet connection - skipped in CI
  test.skip('services page loads', async ({ page }) => {
    await page.goto('/dashboard/services');
    await expect(page.locator('text=Your Services')).toBeVisible({ timeout: 10000 });
  });

  // Page does not exist yet - test agents page instead
  // Requires wallet connection - skipped in CI
  test.skip('agents page loads', async ({ page }) => {
    await page.goto('/dashboard/agents');
    await expect(page.locator('text=Your Agents')).toBeVisible({ timeout: 10000 });
  });

  // Requires wallet connection - skipped in CI
  test.skip('skills page loads', async ({ page }) => {
    await page.goto('/dashboard/skills');
    await expect(page.locator('text=Your Skills')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Rate Limiting', () => {
  // Requires complex form fill including provider address - skipped in CI
  test.skip('shows rate limit message on rapid submissions', async ({ page }) => {
    await page.goto('/jobs/create');
    await page.locator('input[id="budget"]').fill(MIN_USDC);
    await page.locator('textarea[id="description"]').fill('Test');
    await page.locator('button:has-text("Create Job")').click();
    await page.waitForTimeout(100);
    await page.locator('button:has-text("Create Job")').click();
    await expect(page.locator('text=Please wait')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test.skip('shows disabled button when wallet not connected - jobs', async ({ page }) => {
    await page.goto('/jobs/create');
    const button = page.locator('button:has-text("Create Job")');
    await expect(button).toBeDisabled();
  });

  test.skip('shows disabled button when wallet not connected - marketplace', async ({ page }) => {
    await page.goto('/marketplace/create');
    await page.waitForTimeout(1000);
    const button = page.locator('button[type="submit"]:has-text("Create Service")');
    await expect(button).toBeDisabled();
  });

  test.skip('shows disabled button when wallet not connected - review', async ({ page }) => {
    await page.goto('/review/create');
    const button = page.locator('button:has-text("Create Proposal")');
    await expect(button).toBeDisabled();
  });

  test.skip('shows disabled button when wallet not connected - bidding', async ({ page }) => {
    await page.goto('/bidding/create');
    await page.waitForTimeout(1000);
    const button = page.locator('button[type="submit"]');
    await expect(button).toBeDisabled();
  });
});