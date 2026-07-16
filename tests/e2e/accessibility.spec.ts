import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility and E2E Audits', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/taskpane.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#container > *', { timeout: 10000 }).catch(() => {});

    // Close the onboarding tour as it's explicitly excluded
    const skipButton = page.locator('button:has-text("Skip")').first();
    if (await skipButton.isVisible()) {
      await skipButton.click();
      await page.waitForTimeout(500); // allow UI to settle
    }
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    // Run an axe accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('#webpack-dev-server-client-overlay')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['aria-hidden-focus'])
      .analyze();
      
    // Expect zero accessibility violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('should allow keyboard-only navigation for interactive elements', async ({ page }) => {
    // Start sequence
    await page.keyboard.press('Tab');
    
    const firstFocusedHandle = await page.evaluateHandle(() => document.activeElement);
    expect(firstFocusedHandle).not.toBeNull();

    const maxTabs = 20;
    let wrapped = false;
    let focusCount = 1;

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');
      const currentFocusedHandle = await page.evaluateHandle(() => document.activeElement);
      
      const isSameNode = await page.evaluate(
        ([el1, el2]) => el1 === el2,
        [firstFocusedHandle, currentFocusedHandle]
      );
      
      if (isSameNode) {
        wrapped = true;
        break;
      }
      focusCount++;
    }

    // Verify it wrapped around to the first element
    expect(wrapped).toBe(true);
    // Verify there are multiple interactive elements on the page
    expect(focusCount).toBeGreaterThan(1);
  });
});
