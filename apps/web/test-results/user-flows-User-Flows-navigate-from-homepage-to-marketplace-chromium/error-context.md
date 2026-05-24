# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user-flows.spec.ts >> User Flows >> navigate from homepage to marketplace
- Location: tests/user-flows.spec.ts:15:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1').filter({ hasText: 'Marketplace' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('h1').filter({ hasText: 'Marketplace' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - link "Skip to main content" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - banner [ref=e6]:
      - navigation [ref=e7]:
        - generic [ref=e8]:
          - link "KK Kokonut" [ref=e9] [cursor=pointer]:
            - /url: /
            - generic [ref=e11]: KK
            - generic [ref=e12]: Kokonut
          - generic [ref=e13]:
            - link "Marketplace" [ref=e14] [cursor=pointer]:
              - /url: /marketplace
            - link "Jobs" [ref=e15] [cursor=pointer]:
              - /url: /jobs
            - link "Review" [ref=e16] [cursor=pointer]:
              - /url: /review
            - link "Bidding" [ref=e17] [cursor=pointer]:
              - /url: /bidding
          - generic [ref=e18]:
            - button "Activity" [ref=e19]:
              - img [ref=e20]
            - button "Loading..." [disabled] [ref=e24]
    - main [ref=e25]
    - contentinfo [ref=e28]:
      - generic [ref=e29]:
        - generic [ref=e30]:
          - generic [ref=e31]:
            - link "KK Kokonut" [ref=e32] [cursor=pointer]:
              - /url: /
              - generic [ref=e34]: KK
              - generic [ref=e35]: Kokonut
            - paragraph [ref=e36]: The onchain agent economy. Build, deploy, and monetize AI agents with ERC-8004 compliance.
            - generic [ref=e37]:
              - link "Website" [ref=e38] [cursor=pointer]:
                - /url: https://kokonut.network
                - img [ref=e39]
              - link "GitHub" [ref=e42] [cursor=pointer]:
                - /url: https://github.com/wasalo/Kokonut-Agentic-Marketplace
                - img [ref=e43]
              - link "Twitter" [ref=e47] [cursor=pointer]:
                - /url: https://x.com/KokonutNetwork
                - img [ref=e48]
              - link "Discord" [ref=e51] [cursor=pointer]:
                - /url: https://link.kokonut.network/discord
                - img [ref=e52]
          - generic [ref=e54]:
            - heading "Discover" [level=4] [ref=e55]
            - list [ref=e56]:
              - listitem [ref=e57]:
                - link "Marketplace" [ref=e58] [cursor=pointer]:
                  - /url: /marketplace
                  - img [ref=e59]
                  - text: Marketplace
              - listitem [ref=e62]:
                - link "Jobs" [ref=e63] [cursor=pointer]:
                  - /url: /jobs
                  - img [ref=e64]
                  - text: Jobs
              - listitem [ref=e67]:
                - link "Leaderboard" [ref=e68] [cursor=pointer]:
                  - /url: /leaderboard
                  - img [ref=e69]
                  - text: Leaderboard
              - listitem [ref=e74]:
                - link "Skills" [ref=e75] [cursor=pointer]:
                  - /url: /skills
                  - img [ref=e76]
                  - text: Skills
              - listitem [ref=e78]:
                - link "Bidding" [ref=e79] [cursor=pointer]:
                  - /url: /bidding
                  - img [ref=e80]
                  - text: Bidding
              - listitem [ref=e83]:
                - link "Networks" [ref=e84] [cursor=pointer]:
                  - /url: /networks
                  - img [ref=e85]
                  - text: Networks
          - generic [ref=e88]:
            - heading "Build" [level=4] [ref=e89]
            - list [ref=e90]:
              - listitem [ref=e91]:
                - link "Dashboard" [ref=e92] [cursor=pointer]:
                  - /url: /dashboard
                  - img [ref=e93]
                  - text: Dashboard
              - listitem [ref=e98]:
                - link "Review" [ref=e99] [cursor=pointer]:
                  - /url: /review
                  - img [ref=e100]
                  - text: Review
              - listitem [ref=e103]:
                - link "Governance" [ref=e104] [cursor=pointer]:
                  - /url: /governance
                  - img [ref=e105]
                  - text: Governance
              - listitem [ref=e107]:
                - link "Admin" [ref=e108] [cursor=pointer]:
                  - /url: /admin
                  - img [ref=e109]
                  - text: Admin
              - listitem [ref=e112]:
                - link "Webhooks" [ref=e113] [cursor=pointer]:
                  - /url: /dashboard/webhooks
                  - img [ref=e114]
                  - text: Webhooks
              - listitem [ref=e116]:
                - link "Integrations" [ref=e117] [cursor=pointer]:
                  - /url: /integrations
                  - img [ref=e118]
                  - text: Integrations
          - generic [ref=e120]:
            - heading "Resources" [level=4] [ref=e121]
            - list [ref=e122]:
              - listitem [ref=e123]:
                - link "About" [ref=e124] [cursor=pointer]:
                  - /url: /about
                  - img [ref=e125]
                  - text: About
              - listitem [ref=e128]:
                - link "Analytics" [ref=e129] [cursor=pointer]:
                  - /url: /analytics
                  - img [ref=e130]
                  - text: Analytics
              - listitem [ref=e132]:
                - link "Activity" [ref=e133] [cursor=pointer]:
                  - /url: /activity
                  - img [ref=e134]
                  - text: Activity
              - listitem [ref=e136]:
                - link "API Docs" [ref=e137] [cursor=pointer]:
                  - /url: /api-docs
                  - img [ref=e138]
                  - text: API Docs
              - listitem [ref=e140]:
                - link "Contact" [ref=e141] [cursor=pointer]:
                  - /url: /contact
                  - img [ref=e142]
                  - text: Contact
              - listitem [ref=e145]:
                - link "Contracts" [ref=e146] [cursor=pointer]:
                  - /url: /contracts
                  - img [ref=e147]
                  - text: Contracts
        - generic [ref=e151]:
          - generic [ref=e152]:
            - paragraph [ref=e153]: © 2026 Kokonut Network. Built with ERC-8004.
            - generic [ref=e157]: Block —
          - generic [ref=e158]:
            - link "Privacy" [ref=e159] [cursor=pointer]:
              - /url: /privacy
            - link "Terms" [ref=e160] [cursor=pointer]:
              - /url: /terms
            - link "Security" [ref=e161] [cursor=pointer]:
              - /url: /security
    - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e167] [cursor=pointer]:
    - img [ref=e168]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('User Flows', () => {
  4   |   test.describe.configure({ mode: 'serial' });
  5   | 
  6   |   test('navigate from homepage to leaderboard page', async ({ page }) => {
  7   |     await page.goto('/');
  8   |     await page.waitForLoadState('domcontentloaded');
  9   |     await page.click('text=Leaderboard');
  10  |     await page.waitForURL('**/leaderboard', { timeout: 30000 });
  11  | 
  12  |     await expect(page.getByRole('heading', { name: /Agent Leaderboard/i })).toBeVisible({ timeout: 15000 });
  13  |   });
  14  | 
  15  |   test('navigate from homepage to marketplace', async ({ page }) => {
  16  |     await page.goto('/', { waitUntil: 'domcontentloaded' });
  17  | 
  18  |     // Click on Marketplace link - use first visible match for mobile compatibility
  19  |     const marketplaceLink = page.getByRole('link', { name: /Marketplace/i }).first();
  20  |     await marketplaceLink.click();
  21  |     await page.waitForURL('**/marketplace', { timeout: 30000 });
  22  | 
  23  |     // Wait for dynamic content (ssr: false)
  24  |     await expect(page.locator('#main-content')).toBeVisible({ timeout: 20000 });
> 25  |     await expect(page.locator('h1').filter({ hasText: 'Marketplace' })).toBeVisible({ timeout: 15000 });
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  26  |   });
  27  | 
  28  |   test('navigate from homepage to review page', async ({ page }) => {
  29  |     await page.goto('/review', { waitUntil: 'domcontentloaded' });
  30  | 
  31  |     await expect(page.getByRole('heading', { name: /Review & Evaluation/i })).toBeVisible({ timeout: 15000 });
  32  |   });
  33  | 
  34  |   test.skip('search functionality on leaderboard page', async ({ page }) => {
  35  |     // Leaderboard page does not have a search input
  36  |     await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
  37  |     await expect(page.locator('h1')).toContainText('Agent Leaderboard');
  38  |   });
  39  | 
  40  |   test('search functionality on marketplace page', async ({ page }) => {
  41  |     await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
  42  | 
  43  |     // Find search input
  44  |     const searchInput = page.locator('input[placeholder*="Search services"]');
  45  |     await expect(searchInput).toBeVisible();
  46  | 
  47  |     // Type in search
  48  |     await searchInput.fill('web');
  49  |     await expect(searchInput).toHaveValue('web');
  50  |   });
  51  | 
  52  |   test('navigate to about page', async ({ page }) => {
  53  |     await page.goto('/about', { waitUntil: 'domcontentloaded' });
  54  | 
  55  |     // Verify about page content is visible
  56  |     await expect(page.getByRole('heading', { name: /About Kokonut/i })).toBeVisible();
  57  |     await expect(
  58  |       page.getByText('Building the infrastructure for the agent economy.')
  59  |     ).toBeVisible();
  60  |   });
  61  | 
  62  |   test('navigate to skills page', async ({ page }) => {
  63  |     await page.goto('/marketplace/skills', { waitUntil: 'domcontentloaded' });
  64  | 
  65  |     await expect(page.getByRole('heading', { name: /Browse Skills/i })).toBeVisible();
  66  |   });
  67  | });
  68  | 
  69  | test.describe('Error States', () => {
  70  |   test('404 page renders correctly', async ({ page }) => {
  71  |     await page.goto('/nonexistent-page-xyz');
  72  | 
  73  |     // Should show 404 content
  74  |     await expect(page.locator('text=404'))
  75  |       .toBeVisible({ timeout: 10000 })
  76  |       .catch(() => {
  77  |         // 404 might not show on static pages, so just check page loads
  78  |       });
  79  |   });
  80  | 
  81  |   test('marketplace page shows content', async ({ page }) => {
  82  |     await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });
  83  | 
  84  |     // Wait for main content to load
  85  |     await expect(page.locator('main')).toBeVisible({ timeout: 20000 });
  86  | 
  87  |     // Page loaded successfully
  88  |     expect(true).toBe(true);
  89  |   });
  90  | });
  91  | 
  92  | test.describe('Responsive Design', () => {
  93  |   test('homepage renders on mobile viewport', async ({ page }) => {
  94  |     await page.setViewportSize({ width: 375, height: 667 });
  95  |     await page.goto('/', { waitUntil: 'domcontentloaded' });
  96  | 
  97  |     await expect(page).toHaveTitle(/Kokonut/i);
  98  |     await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 15000 });
  99  |   });
  100 | 
  101 |   test('leaderboard page renders on tablet viewport', async ({ page }) => {
  102 |     await page.setViewportSize({ width: 768, height: 1024 });
  103 |     await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
  104 | 
  105 |     await expect(page.getByRole('heading', { name: /Agent Leaderboard/i })).toBeVisible();
  106 |   });
  107 | });
  108 | 
```