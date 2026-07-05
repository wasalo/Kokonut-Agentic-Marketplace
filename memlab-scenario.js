// memlab-scenario.js
module.exports = {
  url: () => 'http://localhost:3000/marketplace',
  
  // Action to perform on the target page to trigger potential leaks
  action: async (page) => {
    // Wait for the search input selector to render
    await page.waitForSelector('input[placeholder="Search services..."]', { timeout: 10000 });

    const searchInput = await page.$('input[placeholder="Search services..."]');
    if (searchInput) {
      await searchInput.type('test-search-query');
      // Wait for debounce timeout using standard setTimeout promise
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Find filter buttons and click them to toggle domains
    const buttons = await page.$$('button.cursor-pointer');
    if (buttons && buttons.length > 0) {
      // Click the first skill domain button
      await buttons[0].click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  },

  // Revert action to return to the baseline state
  back: async (page) => {
    const searchInput = await page.$('input[placeholder="Search services..."]');
    if (searchInput) {
      // Focus on the input and clear it using keyboard select-all and backspace
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Click the skill domain button again to deselect/toggle off
    const buttons = await page.$$('button.cursor-pointer');
    if (buttons && buttons.length > 0) {
      await buttons[0].click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
};
