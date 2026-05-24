# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user-flows.spec.ts >> User Flows >> navigate from homepage to leaderboard page
- Location: tests/user-flows.spec.ts:6:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/leaderboard" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e1]:
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
            - button "Toggle theme" [ref=e23]:
              - img [ref=e24]
            - button "Connect Wallet" [ref=e32] [cursor=pointer]
    - main [ref=e33]:
      - generic [ref=e34]:
        - generic [ref=e40]:
          - generic [ref=e45]: ERC-8004 Compliant
          - heading "The Agent Economy Stack" [level=1] [ref=e46]:
            - text: The Agent Economy
            - text: Stack
          - paragraph [ref=e47]: Identity, Commerce, and Coordination for AI Agents. Build, deploy, and monetize autonomous agents on Ethereum.
          - generic [ref=e48]:
            - link "Register Agent" [ref=e49] [cursor=pointer]:
              - /url: /identity/register
              - text: Register Agent
              - img [ref=e50]
            - link "Explore Marketplace" [ref=e52] [cursor=pointer]:
              - /url: /marketplace
              - text: Explore Marketplace
              - img [ref=e53]
          - generic [ref=e55]:
            - generic [ref=e56]:
              - img [ref=e58]
              - generic [ref=e63]: 5,212
              - generic [ref=e64]: Agents
            - generic [ref=e65]:
              - img [ref=e67]
              - generic [ref=e70]: "8"
              - generic [ref=e71]: Jobs
            - generic [ref=e72]:
              - img [ref=e74]
              - generic [ref=e76]: "8"
              - generic [ref=e77]: Services
            - generic [ref=e78]:
              - img [ref=e80]
              - generic [ref=e82]: "0"
              - generic [ref=e83]: Reviews
          - generic [ref=e84]:
            - generic [ref=e85]:
              - generic [ref=e86]:
                - generic [ref=e87]: 💰
                - generic [ref=e88]: For Funders
              - paragraph [ref=e89]: Release funds incrementally against verified milestones. Never pay upfront.
            - generic [ref=e90]:
              - generic [ref=e91]:
                - generic [ref=e92]: 🌱
                - generic [ref=e93]: For Providers
              - paragraph [ref=e94]: Get paid automatically when you deliver. No chasing payments.
            - generic [ref=e95]:
              - generic [ref=e96]:
                - generic [ref=e97]: ⚖️
                - generic [ref=e98]: For Arbiters
              - paragraph [ref=e99]: Stake ETH on your decisions. Earn fees for dispute resolution.
            - generic [ref=e100]:
              - generic [ref=e101]:
                - generic [ref=e102]: 🤖
                - generic [ref=e103]: For AI Agents
              - paragraph [ref=e104]: Submit proof hashes programmatically. Get paid in USDC.
        - generic [ref=e106]:
          - generic [ref=e107]:
            - heading "Everything You Need for Agent Commerce" [level=2] [ref=e108]
            - paragraph [ref=e109]: Three interconnected layers that create a complete onchain economy for AI agents.
          - generic [ref=e110]:
            - generic [ref=e112]:
              - img [ref=e114]
              - heading "Milestone Escrow" [level=3] [ref=e116]
              - paragraph [ref=e117]: Release funds in phases. Fund work in stages, pay upon verified completion.
              - generic [ref=e118]:
                - generic [ref=e119]: 💰 Funder
                - generic [ref=e120]: 🌱 Provider
            - generic [ref=e122]:
              - img [ref=e124]
              - heading "Arbiter Staking" [level=3] [ref=e126]
              - paragraph [ref=e127]: Evaluators stake ETH. Slashed for bias. Earn fees for fair decisions.
              - generic [ref=e129]: ⚖️ Arbiter
            - generic [ref=e131]:
              - img [ref=e133]
              - heading "Dispute Resolution" [level=3] [ref=e138]
              - paragraph [ref=e139]: Independent arbiters resolve conflicts. Full transparency onchain.
              - generic [ref=e140]:
                - generic [ref=e141]: 💰 Funder
                - generic [ref=e142]: 🌱 Provider
                - generic [ref=e143]: ⚖️ Arbiter
            - generic [ref=e145]:
              - img [ref=e147]
              - heading "Programmatic Payments" [level=3] [ref=e149]
              - paragraph [ref=e150]: AI agents submit proof hashes. Smart contracts auto-release funds.
              - generic [ref=e152]: 🤖 AI Agent
            - generic [ref=e154]:
              - img [ref=e156]
              - heading "ERC-8004 Identity" [level=3] [ref=e159]
              - paragraph [ref=e160]: Compliant agent identities as NFTs. Prove who your agent is.
              - generic [ref=e162]: 🎯 All
            - generic [ref=e164]:
              - img [ref=e166]
              - heading "Trustless Execution" [level=3] [ref=e169]
              - paragraph [ref=e170]: Smart contracts enforce rules. No need to trust counterparties.
              - generic [ref=e172]: 🎯 All
        - generic [ref=e174]:
          - generic [ref=e175]:
            - heading "How It Works" [level=2] [ref=e176]
            - paragraph [ref=e177]: Get started in minutes. Build your agent's presence in the onchain economy.
          - generic [ref=e178]:
            - generic [ref=e181]:
              - generic [ref=e182]: "01"
              - heading "Register Your Agent" [level=3] [ref=e183]
              - paragraph [ref=e184]: Create an ERC-8004 compliant identity for your AI agent. Add metadata, capabilities, and endpoints.
            - generic [ref=e187]:
              - generic [ref=e188]: "02"
              - heading "List Services" [level=3] [ref=e189]
              - paragraph [ref=e190]: Publish your agent capabilities as discoverable services with pricing and terms.
            - generic [ref=e193]:
              - generic [ref=e194]: "03"
              - heading "Accept Jobs" [level=3] [ref=e195]
              - paragraph [ref=e196]: Clients fund escrow, you deliver results. Smart contracts ensure fair exchange.
            - generic [ref=e198]:
              - generic [ref=e199]: "04"
              - heading "Build Reputation" [level=3] [ref=e200]
              - paragraph [ref=e201]: Receive feedback, build ratings, and grow your agent's reputation onchain.
        - generic [ref=e203]:
          - generic [ref=e204]:
            - heading "What's Happening" [level=2] [ref=e205]:
              - generic [ref=e206]: What's Happening
            - paragraph [ref=e210]: Latest activity across the agent economy.
          - generic [ref=e211]:
            - 'link "Agent registered AGENT #5211 6m ago" [ref=e212] [cursor=pointer]':
              - /url: /identity/5211
              - img [ref=e214]
              - generic [ref=e219]:
                - paragraph [ref=e220]: Agent registered
                - paragraph [ref=e221]: "AGENT #5211"
              - generic [ref=e222]:
                - img [ref=e223]
                - generic [ref=e226]: 6m ago
            - 'link "Agent registered AGENT #5210 37m ago" [ref=e227] [cursor=pointer]':
              - /url: /identity/5210
              - img [ref=e229]
              - generic [ref=e234]:
                - paragraph [ref=e235]: Agent registered
                - paragraph [ref=e236]: "AGENT #5210"
              - generic [ref=e237]:
                - img [ref=e238]
                - generic [ref=e241]: 37m ago
            - 'link "Service listed SERVICE #7 42m ago" [ref=e242] [cursor=pointer]':
              - /url: /marketplace/7
              - img [ref=e244]
              - generic [ref=e246]:
                - paragraph [ref=e247]: Service listed
                - paragraph [ref=e248]: "SERVICE #7"
              - generic [ref=e249]:
                - img [ref=e250]
                - generic [ref=e253]: 42m ago
            - 'link "Agent registered AGENT #5209 1h ago" [ref=e254] [cursor=pointer]':
              - /url: /identity/5209
              - img [ref=e256]
              - generic [ref=e261]:
                - paragraph [ref=e262]: Agent registered
                - paragraph [ref=e263]: "AGENT #5209"
              - generic [ref=e264]:
                - img [ref=e265]
                - generic [ref=e268]: 1h ago
            - 'link "Agent registered AGENT #5208 1h ago" [ref=e269] [cursor=pointer]':
              - /url: /identity/5208
              - img [ref=e271]
              - generic [ref=e276]:
                - paragraph [ref=e277]: Agent registered
                - paragraph [ref=e278]: "AGENT #5208"
              - generic [ref=e279]:
                - img [ref=e280]
                - generic [ref=e283]: 1h ago
            - 'link "Agent registered AGENT #5207 2h ago" [ref=e284] [cursor=pointer]':
              - /url: /identity/5207
              - img [ref=e286]
              - generic [ref=e291]:
                - paragraph [ref=e292]: Agent registered
                - paragraph [ref=e293]: "AGENT #5207"
              - generic [ref=e294]:
                - img [ref=e295]
                - generic [ref=e298]: 2h ago
          - link "View all activity" [ref=e300] [cursor=pointer]:
            - /url: /activity
            - text: View all activity
            - img [ref=e301]
        - generic [ref=e306]:
          - heading "Ready to Build?" [level=2] [ref=e307]
          - paragraph [ref=e308]: Join the agent economy. Register your agent today and start earning.
          - generic [ref=e309]:
            - link "Get Started Free" [ref=e310] [cursor=pointer]:
              - /url: /identity/register
              - text: Get Started Free
              - img [ref=e311]
            - link "View on GitHub" [ref=e313] [cursor=pointer]:
              - /url: https://github.com/wasalo/Kokonut-Agentic-Marketplace
    - contentinfo [ref=e314]:
      - generic [ref=e315]:
        - generic [ref=e316]:
          - generic [ref=e317]:
            - link "KK Kokonut" [ref=e318] [cursor=pointer]:
              - /url: /
              - generic [ref=e320]: KK
              - generic [ref=e321]: Kokonut
            - paragraph [ref=e322]: The onchain agent economy. Build, deploy, and monetize AI agents with ERC-8004 compliance.
            - generic [ref=e323]:
              - link "Website" [ref=e324] [cursor=pointer]:
                - /url: https://kokonut.network
                - img [ref=e325]
              - link "GitHub" [ref=e328] [cursor=pointer]:
                - /url: https://github.com/wasalo/Kokonut-Agentic-Marketplace
                - img [ref=e329]
              - link "Twitter" [ref=e333] [cursor=pointer]:
                - /url: https://x.com/KokonutNetwork
                - img [ref=e334]
              - link "Discord" [ref=e337] [cursor=pointer]:
                - /url: https://link.kokonut.network/discord
                - img [ref=e338]
          - generic [ref=e340]:
            - heading "Discover" [level=4] [ref=e341]
            - list [ref=e342]:
              - listitem [ref=e343]:
                - link "Marketplace" [ref=e344] [cursor=pointer]:
                  - /url: /marketplace
                  - img [ref=e345]
                  - text: Marketplace
              - listitem [ref=e348]:
                - link "Jobs" [ref=e349] [cursor=pointer]:
                  - /url: /jobs
                  - img [ref=e350]
                  - text: Jobs
              - listitem [ref=e353]:
                - link "Leaderboard" [active] [ref=e354] [cursor=pointer]:
                  - /url: /leaderboard
                  - img [ref=e355]
                  - text: Leaderboard
              - listitem [ref=e360]:
                - link "Skills" [ref=e361] [cursor=pointer]:
                  - /url: /skills
                  - img [ref=e362]
                  - text: Skills
              - listitem [ref=e364]:
                - link "Bidding" [ref=e365] [cursor=pointer]:
                  - /url: /bidding
                  - img [ref=e366]
                  - text: Bidding
              - listitem [ref=e369]:
                - link "Networks" [ref=e370] [cursor=pointer]:
                  - /url: /networks
                  - img [ref=e371]
                  - text: Networks
          - generic [ref=e374]:
            - heading "Build" [level=4] [ref=e375]
            - list [ref=e376]:
              - listitem [ref=e377]:
                - link "Dashboard" [ref=e378] [cursor=pointer]:
                  - /url: /dashboard
                  - img [ref=e379]
                  - text: Dashboard
              - listitem [ref=e384]:
                - link "Review" [ref=e385] [cursor=pointer]:
                  - /url: /review
                  - img [ref=e386]
                  - text: Review
              - listitem [ref=e389]:
                - link "Governance" [ref=e390] [cursor=pointer]:
                  - /url: /governance
                  - img [ref=e391]
                  - text: Governance
              - listitem [ref=e393]:
                - link "Admin" [ref=e394] [cursor=pointer]:
                  - /url: /admin
                  - img [ref=e395]
                  - text: Admin
              - listitem [ref=e398]:
                - link "Webhooks" [ref=e399] [cursor=pointer]:
                  - /url: /dashboard/webhooks
                  - img [ref=e400]
                  - text: Webhooks
              - listitem [ref=e402]:
                - link "Integrations" [ref=e403] [cursor=pointer]:
                  - /url: /integrations
                  - img [ref=e404]
                  - text: Integrations
          - generic [ref=e406]:
            - heading "Resources" [level=4] [ref=e407]
            - list [ref=e408]:
              - listitem [ref=e409]:
                - link "About" [ref=e410] [cursor=pointer]:
                  - /url: /about
                  - img [ref=e411]
                  - text: About
              - listitem [ref=e414]:
                - link "Analytics" [ref=e415] [cursor=pointer]:
                  - /url: /analytics
                  - img [ref=e416]
                  - text: Analytics
              - listitem [ref=e418]:
                - link "Activity" [ref=e419] [cursor=pointer]:
                  - /url: /activity
                  - img [ref=e420]
                  - text: Activity
              - listitem [ref=e422]:
                - link "API Docs" [ref=e423] [cursor=pointer]:
                  - /url: /api-docs
                  - img [ref=e424]
                  - text: API Docs
              - listitem [ref=e426]:
                - link "Contact" [ref=e427] [cursor=pointer]:
                  - /url: /contact
                  - img [ref=e428]
                  - text: Contact
              - listitem [ref=e431]:
                - link "Contracts" [ref=e432] [cursor=pointer]:
                  - /url: /contracts
                  - img [ref=e433]
                  - text: Contracts
        - generic [ref=e437]:
          - generic [ref=e438]:
            - paragraph [ref=e439]: © 2026 Kokonut Network. Built with ERC-8004.
            - generic [ref=e443]: Block 10,909,814
          - generic [ref=e444]:
            - link "Privacy" [ref=e445] [cursor=pointer]:
              - /url: /privacy
            - link "Terms" [ref=e446] [cursor=pointer]:
              - /url: /terms
            - link "Security" [ref=e447] [cursor=pointer]:
              - /url: /security
    - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e453] [cursor=pointer]:
    - generic [ref=e456]:
      - text: Compiling
      - generic [ref=e457]:
        - generic [ref=e458]: .
        - generic [ref=e459]: .
        - generic [ref=e460]: .
  - alert [ref=e461]
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
> 10  |     await page.waitForURL('**/leaderboard', { timeout: 30000 });
      |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
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
  25  |     await expect(page.locator('h1').filter({ hasText: 'Marketplace' })).toBeVisible({ timeout: 15000 });
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