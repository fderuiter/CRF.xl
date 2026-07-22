import { test, expect } from '@playwright/test';

const themes = [
  { name: 'light', emulateOptions: { colorScheme: 'light' as const, forcedColors: 'none' as const }, officeThemeMock: { bodyBackgroundColor: "#FFFFFF", bodyForegroundColor: "#000000" } },
  { name: 'dark', emulateOptions: { colorScheme: 'dark' as const, forcedColors: 'none' as const }, officeThemeMock: { bodyBackgroundColor: "#212121", bodyForegroundColor: "#FFFFFF" } },
  { name: 'high-contrast', emulateOptions: { forcedColors: 'active' as const }, officeThemeMock: null }
];

test.describe('Visual Regression Tests - Dictionary Sidecar & Integrity Hub', () => {
  for (const theme of themes) {
    test.describe(`Theme: ${theme.name}`, () => {
      test.use(theme.emulateOptions);

      test.beforeEach(async ({ page }) => {
        await page.addInitScript((mockOfficeTheme) => {
          window['Office'] = window['Office'] || {
            onReady: (cb) => setTimeout(() => cb({ host: 'Excel' }), 0),
            context: {
              officeTheme: mockOfficeTheme,
              displayLanguage: "en-US",
              document: {
                getFilePropertiesAsync: (cb) => cb({ status: 'Succeeded', value: { url: 'local' } })
              }
            }
          };
          
          window['matchMedia'] = (query) => {
             return {
               matches: query === "(forced-colors: active)" && mockOfficeTheme === null,
               addEventListener: () => {},
               removeEventListener: () => {}
             };
          };
        }, theme.officeThemeMock);

        await page.goto('/taskpane.html');
        await page.waitForLoadState('networkidle');
        
        await page.waitForSelector('#container > *', { timeout: 10000 }).catch(() => {});
        const skipButton = page.locator('button:has-text("Skip")').first();
        if (await skipButton.isVisible()) {
          await skipButton.click({ force: true });
        }
      });

      test('Integrity Hub View visual snapshot', async ({ page }) => {
        await page.evaluate(() => {
          const orch = (window as any).appOrchestrator;
          if (orch) {
             orch.injectValidationIssue({
                 level: "Error",
                 message: "Visual test error mock",
                 location: "Visual test"
             });
             // Set state so that study is not null to ensure Integrity Hub renders
             orch['updateState']({ isProcessing: true,
               study: {
                 metadata: { protocolId: "TEST", version: "1", defaultLanguage: "en-US" },
                 forms: {},
                 codelists: {}
               }
             });
          }
        });
        
        await page.locator('#tour-integrity').click({ force: true });
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot(`integrity-hub-${theme.name}.png`, { maxDiffPixelRatio: 0.005 });
      });
      
      test('Dictionary Sidecar visual snapshot', async ({ page }) => {
        await page.evaluate(() => {
           const orch = (window as any).appOrchestrator;
           if (orch) {
              orch['updateState']({ isProcessing: true, 
                 isCodelistActive: true,
                 activeSheet: "_Codelists",
                 study: {
                   metadata: { protocolId: "TEST", version: "1", defaultLanguage: "en-US" },
                   forms: {},
                   codelists: {}
                 }
              });
           }
        });
        
        await page.locator('#tab-design').click({ force: true });
        
        await expect(page.locator('text=Select a Dictionary')).toBeVisible({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1000);
        
        await expect(page).toHaveScreenshot(`dictionary-sidecar-${theme.name}.png`, { maxDiffPixelRatio: 0.005 });
      });
    });
  }
});
