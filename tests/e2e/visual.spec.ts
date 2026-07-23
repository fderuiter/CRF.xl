import { test, expect } from "@playwright/test";

const themes = [
  {
    name: "light",
    emulateOptions: { colorScheme: "light" as const, forcedColors: "none" as const },
    officeThemeMock: { bodyBackgroundColor: "#FFFFFF", bodyForegroundColor: "#000000" },
  },
  {
    name: "dark",
    emulateOptions: { colorScheme: "dark" as const, forcedColors: "none" as const },
    officeThemeMock: { bodyBackgroundColor: "#212121", bodyForegroundColor: "#FFFFFF" },
  },
  {
    name: "high-contrast",
    emulateOptions: { forcedColors: "active" as const },
    officeThemeMock: null,
  },
];

test.describe("Visual Regression Tests - Dictionary Sidecar & Integrity Hub", () => {
  for (const theme of themes) {
    test.describe(`Theme: ${theme.name}`, () => {
      test.use(theme.emulateOptions);

      test.beforeEach(async ({ page }) => {
        // Intercept validation and freeze endpoints to prevent background failures and ensure clean visual snapshots
        await page.route("**/validation", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        });
        await page.route("**/freeze", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        });

        await page.addInitScript((mockOfficeTheme) => {
          const win = window as any;
          win.Office = win.Office || {
            onReady: (cb: any) =>
              setTimeout(() => {
                if (cb) cb({ host: "Excel" });
              }, 0),
            context: {
              officeTheme: mockOfficeTheme,
              displayLanguage: "en-US",
              document: {
                getFilePropertiesAsync: (cb: any) => {
                  if (cb) cb({ status: "Succeeded", value: { url: "local" } });
                },
              },
            },
          };

          win.matchMedia = (query: any) => {
            return {
              matches: query === "(forced-colors: active)" && mockOfficeTheme === null,
              addEventListener: () => {},
              removeEventListener: () => {},
            };
          };
        }, theme.officeThemeMock);

        await page.goto("/taskpane.html");
        await page.waitForLoadState("networkidle");

        await page.waitForSelector("#container > *", { timeout: 10000 }).catch(() => {});
        const skipButton = page.locator('button:has-text("Skip")').first();
        if (await skipButton.isVisible()) {
          await skipButton.click({ force: true });
        }
      });

      test("Integrity Hub View visual snapshot", async ({ page }) => {
        await page.evaluate(() => {
          if (!(window as any).process) {
            (window as any).process = { env: {} };
          }
          if (!(window as any).process.env) {
            (window as any).process.env = {};
          }
          (window as any).process.env.VAULT_API_URL = "https://real-api.vault.com";

          const orch = (window as any).appOrchestrator;
          if (orch) {
            orch.injectValidationIssue({
              level: "Error",
              message: "Visual test error mock",
              location: "Visual test",
            });
            // Set state so that study is not null to ensure Integrity Hub renders
            orch["updateState"]({
              isProcessing: true,
              study: {
                metadata: { protocolId: "TEST", version: "1", defaultLanguage: "en-US" },
                forms: {},
                codelists: {},
              },
            });
          }
        });

        await page.locator("#tour-integrity").click({ force: true });
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(`integrity-hub-${theme.name}.png`, {
          maxDiffPixelRatio: 0.005,
        });
      });

      test("Dictionary Sidecar visual snapshot", async ({ page }) => {
        await page.evaluate(() => {
          const orch = (window as any).appOrchestrator;
          if (orch) {
            orch["updateState"]({
              isProcessing: true,
              isCodelistActive: true,
              activeSheet: "_Codelists",
              study: {
                metadata: { protocolId: "TEST", version: "1", defaultLanguage: "en-US" },
                forms: {},
                codelists: {},
              },
            });
          }
        });

        await page.locator("#tab-design").click({ force: true });

        await expect(page.locator("text=Select a Dictionary"))
          .toBeVisible({ timeout: 5000 })
          .catch(() => {});
        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot(`dictionary-sidecar-${theme.name}.png`, {
          maxDiffPixelRatio: 0.005,
        });
      });
    });
  }
});
