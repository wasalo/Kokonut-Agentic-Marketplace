import { test, expect } from '@playwright/test';

test.describe('Form Validation - Job Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs/create');
  });

  test('shows disabled state when wallet not connected', async ({ page }) => {
    const submitButton = page.locator('button:has-text("Create Job")');
    await expect(submitButton).toBeDisabled();
  });

  test.skip('shows validation error for invalid provider address', async ({ page }) => {
    await page.locator('input[id="provider"]').fill('invalid-address');
    await page.locator('input[id="provider"]').blur();
    const error = page.locator('text=Must be a valid Ethereum address');
    await expect(error).toBeVisible({ timeout: 10000 });
  });

  test('shows validation error for budget below minimum', async ({ page }) => {
    await page.fill('input[id="budget"]', '0.001');
    await page.locator('input[id="budget"]').blur();

    const error = page.locator('text=Minimum budget is $0.01');
    await expect(error).toBeVisible();
  });

  test.skip('shows validation error for budget above maximum', async ({ page }) => {
    await page.locator('input[id="budget"]').fill('2000000');
    await page.locator('input[id="budget"]').blur();

    const error = page.locator('.text-danger, .text-xs').filter({ hasText: /Maximum|cannot exceed/i });
    await expect(error.first()).toBeVisible();
  });

  test('shows validation error for deadline in past', async ({ page }) => {
    const pastDate = new Date(Date.now() - 60000).toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', pastDate);
    await page.locator('input[type="datetime-local"]').blur();

    const error = page.locator('text=Must be at least');
    await expect(error).toBeVisible();
  });

  test('shows validation error for description too long', async ({ page }) => {
    const longDescription = 'x'.repeat(1001);
    await page.fill('textarea[id="description"]', longDescription);

    const counter = page.locator('text=/1000/');
    await expect(counter).toBeVisible();
  });

  test('shows open job (bidding) toggle', async ({ page }) => {
    const toggle = page.locator('text=Open Job (Bidding)');
    await expect(toggle).toBeVisible();
  });

  test('shows milestone toggle', async ({ page }) => {
    const toggle = page.locator('text=Milestone-Based Payment');
    await expect(toggle).toBeVisible();
  });

  test('shows evaluator fee toggle', async ({ page }) => {
    const toggle = page.locator('text=Evaluator Fee (1%)');
    await expect(toggle).toBeVisible();
  });

  test('shows payment token selector', async ({ page }) => {
    const usdc = page.locator('button:has-text("USDC")');
    const eth = page.locator('button:has-text("ETH")');
    await expect(usdc).toBeVisible();
    await expect(eth).toBeVisible();
  });
});

test.describe('Form Validation - Service Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace/create');
  });

  test('shows disabled state when wallet not connected', async ({ page }) => {
    const submitButton = page.locator('button:has-text("Create Service")');
    await expect(submitButton).toBeDisabled();
  });

  test('shows validation error for name too short', async ({ page }) => {
    await page.fill('input[id="name"]', '');
    await page.locator('input[id="name"]').blur();

    const error = page.locator('text=Service name is required');
    await expect(error).toBeVisible();
  });

  test('shows validation error for name too long', async ({ page }) => {
    const longName = 'x'.repeat(101);
    await page.fill(`input[id="name"]`, longName);
    await page.locator('input[id="name"]').blur();

    const error = page.locator('text=must be at most');
    await expect(error).toBeVisible();
  });

  test('shows validation error for price below minimum', async ({ page }) => {
    await page.fill('input[id="price"]', '0.001');
    await page.locator('input[id="price"]').blur();

    const error = page.locator('text=Minimum price is');
    await expect(error).toBeVisible();
  });

  test('shows validation error for description too long', async ({ page }) => {
    const longDesc = 'x'.repeat(501);
    await page.fill('textarea[id="description"]', longDesc);

    const counter = page.locator('text=/500/');
    await expect(counter).toBeVisible();
  });

  test('shows all form fields', async ({ page }) => {
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('textarea[id="description"]')).toBeVisible();
    await expect(page.locator('input[id="price"]')).toBeVisible();
    await expect(page.locator('input[id="metadata-uri"]')).toBeVisible();
  });
});

test.describe('Form Validation - Agent Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/identity/register');
  });

  test('shows registration form', async ({ page }) => {
    await expect(page.locator('text=Register Your Agent')).toBeVisible();
  });

  test('shows agent name input', async ({ page }) => {
    await expect(page.locator('input[id="name"]')).toBeVisible();
  });

  test('shows description textarea', async ({ page }) => {
    await expect(page.locator('textarea[id="description"]')).toBeVisible();
  });

  test('shows endpoint input', async ({ page }) => {
    await expect(page.locator('input[id="endpoint"]')).toBeVisible();
  });

  test('shows capabilities input', async ({ page }) => {
    await expect(page.locator('input[id="capabilities"]')).toBeVisible();
  });

  test('shows portfolio section', async ({ page }) => {
    await expect(page.locator('text=Portfolio')).toBeVisible();
  });
});

test.describe('Form Validation - Proposal/Review Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/review/create');
  });

  test('shows disabled state when wallet not connected', async ({ page }) => {
    const submitButton = page.locator('button:has-text("Create Proposal")');
    await expect(submitButton).toBeDisabled();
  });

  test('shows all form fields', async ({ page }) => {
    await expect(page.locator('input[id="title"]')).toBeVisible();
    await expect(page.locator('textarea[id="description"]')).toBeVisible();
    await expect(page.locator('input[id="reward"]')).toBeVisible();
    await expect(page.locator('input[id="decision-deadline"]')).toBeVisible();
  });

  test('shows evaluator visibility options', async ({ page }) => {
    await expect(page.locator('text=Public')).toBeVisible();
    await expect(page.locator('text=Private')).toBeVisible();
  });
});

test.describe('Form Validation - Bidding Session Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bidding/create');
  });

  test('shows disabled state when wallet not connected', async ({ page }) => {
    const submitButton = page.locator('button:has-text("Create Session")');
    await expect(submitButton).toBeDisabled();
  });

  test('shows all form fields', async ({ page }) => {
    await expect(page.locator('input[id="evaluator"]')).toBeVisible();
    await expect(page.locator('input[id="max-budget"]')).toBeVisible();
    await expect(page.locator('input[id="deadline"]')).toBeVisible();
    await expect(page.locator('input[id="metadata"]')).toBeVisible();
  });

  test('shows validation error for invalid evaluator address', async ({ page }) => {
    await page.fill('input[id="evaluator"]', '0x123');
    await page.locator('input[id="evaluator"]').blur();

    const error = page.locator('text=Invalid Ethereum');
    await expect(error).toBeVisible();
  });

  test('shows validation error for budget below minimum', async ({ page }) => {
    await page.fill('input[id="max-budget"]', '0.001');
    await page.locator('input[id="max-budget"]').blur();

    const error = page.locator('text=Minimum budget is');
    await expect(error).toBeVisible();
  });

  test('shows validation error for deadline too short', async ({ page }) => {
    await page.fill('input[id="deadline"]', '1');
    await page.locator('input[id="deadline"]').blur();

    const error = page.locator('text=Minimum deadline is');
    await expect(error).toBeVisible();
  });
});

test.describe('Form Validation - Skill Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/skills');
  });

  test('shows skill registration form', async ({ page }) => {
    await expect(page.locator('text=Register Skill')).toBeVisible();
  });

  test('shows all form fields', async ({ page }) => {
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('input[id="version"]')).toBeVisible();
    await expect(page.locator('textarea[id="description"]')).toBeVisible();
    await expect(page.locator('input[id="endpoint"]')).toBeVisible();
  });

  test('shows validation error for invalid version format', async ({ page }) => {
    await page.fill('input[id="version"]', 'invalid');
    await page.locator('input[id="version"]').blur();

    const error = page.locator('text=Invalid version');
    await expect(error).toBeVisible();
  });
});

test.describe('Form Validation - Webhook Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/webhooks');
  });

  test('shows webhook form', async ({ page }) => {
    await expect(page.locator('text=Webhooks')).toBeVisible();
  });

  test('shows validation error for HTTP URL', async ({ page }) => {
    await page.fill('input[id="url"]', 'http://example.com/webhook');
    await page.locator('input[id="url"]').blur();

    const error = page.locator('text=HTTPS');
    await expect(error).toBeVisible();
  });

  test('shows event selection buttons', async ({ page }) => {
    await expect(page.locator('text=job.created')).toBeVisible();
    await expect(page.locator('text=job.funded')).toBeVisible();
    await expect(page.locator('text=service.created')).toBeVisible();
  });
});