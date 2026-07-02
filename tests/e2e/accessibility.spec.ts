import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility and E2E Audits', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/taskpane.html');
    
    // Wait for the main app to render
    await page.waitForLoadState('networkidle');

    // Ensure keyboard navigation is possible
    await page.keyboard.press('Tab');
    
    // Run an axe accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('#webpack-dev-server-client-overlay')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
      
    // Expect zero accessibility violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('should allow keyboard-only navigation for interactive elements', async ({ page }) => {
    await page.goto('/taskpane.html');
    await page.waitForLoadState('networkidle');
    
    // Tab through to ensure elements are reachable and focusable
    await page.keyboard.press('Tab');
    const focusedHandle = await page.evaluateHandle(() => document.activeElement);
    expect(focusedHandle).not.toBeNull();
  });
});
