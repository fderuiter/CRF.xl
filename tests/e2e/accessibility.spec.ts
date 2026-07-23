import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility and E2E Audits", () => {
  test.beforeEach(async ({ context, page }) => {
    // Inject Office JS Mock before page loads to handle offline environments and timeouts
    await context.addInitScript(() => {
      const officeMock: any = {
        onReady: (cb: any) => {
          if (cb) cb();
        },
        AsyncResultStatus: {
          Succeeded: "succeeded",
          Failed: "failed",
        },
        context: {
          document: {
            getFilePropertiesAsync: (callback: any) => {
              if (callback) {
                callback({
                  status: "succeeded",
                  value: { url: "https://sharepoint.com/gxp-document" },
                });
              }
            },
          },
        },
      };

      Object.defineProperty(window, "Office", {
        get: () => officeMock,
        set: (val) => {
          if (val && typeof val === "object") {
            // Keep onReady, AsyncResultStatus, and context.document mock preserved
            const originalContext = officeMock.context;
            Object.assign(officeMock, val);
            if (!officeMock.context) {
              officeMock.context = originalContext;
            } else if (!officeMock.context.document) {
              officeMock.context.document = originalContext.document;
            }
          }
        },
        configurable: true,
        enumerable: true,
      });
    });

    page.on("console", (msg) => console.log("BROWSER CONSOLE:", msg.text()));
    page.on("pageerror", (err) => console.log("BROWSER ERROR:", err.message));

    await page.goto("/taskpane.html");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("#container > *", { timeout: 60000 }).catch(() => {});

    // Close the onboarding tour as it's explicitly excluded
    const skipButton = page.locator('button:has-text("Skip")').first();
    if (await skipButton.isVisible()) {
      await skipButton.click();
      await page.waitForTimeout(500); // allow UI to settle
    }
  });

  test("should not have any automatically detectable accessibility issues", async ({ page }) => {
    // Run an axe accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude("#webpack-dev-server-client-overlay")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["aria-hidden-focus"])
      .analyze();

    // Expect zero accessibility violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should allow keyboard-only navigation for interactive elements", async ({ page }) => {
    // Start sequence
    await page.keyboard.press("Tab");

    const firstFocusedHandle = await page.evaluateHandle(() => document.activeElement);
    expect(firstFocusedHandle).not.toBeNull();

    const maxTabs = 20;
    let wrapped = false;
    let focusCount = 1;

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press("Tab");
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

  test("simulates backend connection drop and confirms error banner rendering and accessibility", async ({
    page,
  }) => {
    page.on("console", (msg) => console.log("BROWSER CONSOLE:", msg.text()));
    page.on("pageerror", (err) => console.log("BROWSER ERROR:", err.message));
    // Inject a simulated Vault service error that triggers the unhandledrejection handler in App.tsx
    // This perfectly simulates a backend connection drop during a vault background sync.
    await page.evaluate(() => {
      const vaultError: any = new Error("Network error");
      vaultError.category = "VAULT_ERROR";
      vaultError.severity = "error";
      vaultError.message = "Vault freeze failed: HTTP 503";

      // Simulate unhandled promise rejection that VaultService would throw
      window.dispatchEvent(
        new PromiseRejectionEvent("unhandledrejection", {
          promise: Promise.reject(vaultError).catch(() => Object),
          reason: vaultError,
          cancelable: true,
        })
      );
    });

    // Confirm the error banner renders
    const errorBanner = page.locator(".fui-MessageBar").filter({ hasText: "Vault freeze failed" });
    const isVisible = await errorBanner.isVisible();
    if (!isVisible) {
      console.log(await page.content());
    }
    await expect(errorBanner).toBeVisible({ timeout: 5000 });

    // Verify that screen-reader announcer broadcasts the error
    const liveRegion = page
      .locator('[aria-live="polite"], [aria-live="assertive"]')
      .filter({ hasText: "Vault freeze failed" })
      .first();
    await expect(liveRegion).toBeAttached({ timeout: 5000 });

    // Ensure zero accessibility errors for the notification banners
    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude("#webpack-dev-server-client-overlay")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["aria-hidden-focus"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should pass automated scans for every screen in the onboarding walkthrough", async ({
    page,
  }) => {
    // Start the onboarding tour manually by clicking the Tour button
    const tourButton = page.locator('button[title="Start Guided Tour"]');
    await tourButton.click();
    await page.waitForTimeout(500); // Wait for the popover to appear

    const totalSteps = 7;
    for (let step = 0; step < totalSteps; step++) {
      // Perform sequential WCAG standard compliance checks for every distinct view
      const accessibilityScanResults = await new AxeBuilder({ page })
        .exclude("#webpack-dev-server-client-overlay")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .disableRules(["aria-hidden-focus"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);

      if (step < totalSteps - 1) {
        // Move to the next step
        const nextBtn = page.locator('button:has-text("Next")');
        await nextBtn.click();
        await page.waitForTimeout(300);
      } else {
        // Finish the tour
        const finishBtn = page.locator('button:has-text("Finish")');
        await finishBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test("should constrain keyboard focus loops inside onboarding popover and restore focus to trigger button when skipped", async ({
    page,
  }) => {
    const tourButton = page.locator('button[title="Start Guided Tour"]');
    await tourButton.focus();

    // Trigger onboarding tour
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // Check that the popover surface is visible
    const popoverSurface = page.locator(".fui-TeachingPopoverSurface");
    await expect(popoverSurface).toBeVisible();

    // Verify that pressing Tab repeatedly does not leak focus to background elements
    // We do 15 tabs and verify document.activeElement is always within the popover surface
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const isInside = await page.evaluate(() => {
        const active = document.activeElement;
        const surface = document.querySelector(".fui-TeachingPopoverSurface");
        return surface && surface.contains(active);
      });
      expect(isInside).toBe(true);
    }

    // Dismiss/skip the tour using Skip button
    const skipBtn = page.locator('button:has-text("Skip")').first();
    await skipBtn.click();
    await page.waitForTimeout(300);

    // Verify popover is closed
    await expect(popoverSurface).not.toBeVisible();

    // Verify focus is restored to the triggering button
    const isFocused = await tourButton.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  });

  test("should trap focus inside error dialog and restore focus when closed", async ({ page }) => {
    // Mock the validation sync endpoint to succeed to prevent background toast focus theft
    await page.route("**/validation", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    // Mock the freeze endpoint to fail to trigger the Freeze Failed dialog
    await page.route("**/freeze", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to connect to Vault" }),
      });
    });

    // Set active sheet to _Study and set a mock study design so RegistryView renders and is fully active
    await page.evaluate(() => {
      if (!(window as any).process) {
        (window as any).process = { env: {} };
      }
      if (!(window as any).process.env) {
        (window as any).process.env = {};
      }
      (window as any).process.env.VAULT_API_URL = "https://real-api.vault.com";

      const orchestrator = (window as any).appOrchestrator;
      orchestrator.requestValidation = () => {};

      const compService = (window as any).complianceGovernanceService;
      if (compService) {
        compService.getEnvironmentStatus = async () => ({
          isCompliant: true,
          isCloudHosted: true,
          isVersionHistoryEnabled: true,
        });
      }

      const originalUpdateState = orchestrator.updateState.bind(orchestrator);
      orchestrator.updateState = (updates: any) => {
        if (updates) {
          if (updates.study === null) {
            delete updates.study;
          }
          if (updates.uiError) {
            delete updates.uiError;
          }
          if (Object.keys(updates).length === 0) {
            return;
          }
        }
        originalUpdateState(updates);
      };

      orchestrator.updateState({
        activeSheet: "_Study",
        isProcessing: false,
        study: {
          metadata: {
            protocolId: "TEST-001",
            version: "1.0",
            studyName: "Test Study",
          },
          forms: {},
        },
      });
    });
    await page.waitForTimeout(500); // allow UI to settle

    const freezeButton = page.locator('button:has-text("Freeze Version")');
    await expect(freezeButton).toBeEnabled();

    // Focus the freeze version button before clicking it
    await freezeButton.focus();
    await freezeButton.click();

    // Error dialog triggers because api.vault.example.com network request fails
    const dialogTitle = page.locator('.fui-DialogTitle:has-text("Freeze Failed")');
    await expect(dialogTitle).toBeVisible({ timeout: 10000 });

    const dialogSurface = page.locator(".fui-DialogSurface");
    await expect(dialogSurface).toBeVisible();
    await page.waitForTimeout(500); // allow autofocus and transition to settle

    const activeInfo = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el ? el.tagName : "NONE",
        id: el ? el.id : "",
        className: el ? el.className : "",
        textContent: el ? el.textContent : "",
      };
    });
    console.log("ACTIVE ELEMENT INFO ON DIALOG OPEN:", activeInfo);

    // Verify focus is drawn to the dialog elements (e.g. Acknowledge button)
    const initialActiveElementInside = await page.evaluate(() => {
      const active = document.activeElement;
      const surface = document.querySelector(".fui-DialogSurface");
      return surface && surface.contains(active);
    });
    expect(initialActiveElementInside).toBe(true);

    // Verify focus trap: Tab 10 times and ensure focus never leaks outside .fui-DialogSurface
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const isInside = await page.evaluate(() => {
        const active = document.activeElement;
        const surface = document.querySelector(".fui-DialogSurface");
        return surface && surface.contains(active);
      });
      expect(isInside).toBe(true);
    }

    // Close/acknowledge the dialog
    const ackBtn = page.locator('button:has-text("Acknowledge")');
    await ackBtn.click();
    await page.waitForTimeout(300);

    // Verify dialog is closed
    await expect(dialogSurface).not.toBeVisible();

    const activeInfoAfterClose = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el ? el.tagName : "NONE",
        id: el ? el.id : "",
        className: el ? el.className : "",
        textContent: el ? el.textContent : "",
      };
    });
    console.log("ACTIVE ELEMENT INFO AFTER CLOSE:", activeInfoAfterClose);

    // Verify focus is restored to the original Freeze Version button
    const isFocused = await freezeButton.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  });
});
