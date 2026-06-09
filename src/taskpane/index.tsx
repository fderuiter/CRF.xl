/**
 * @issue #28
 */
import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { initLocale } from "./core/locale-config";

/* global document, Office, module, require, HTMLElement */

const title = "Contoso Task Pane Add-in";

const rootElement: HTMLElement | null = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

/* Render application after Office initializes */
Office.onReady(async () => {
  const hostLocale = Office.context.displayLanguage || "en-US";
  initLocale(hostLocale);

  if (process.env.NODE_ENV !== "production" && window.location.search.includes("e2e=true")) {
    const { runAllTests } = await import("./e2e-tests");
    runAllTests();
  }

  if (process.env.NODE_ENV !== "production") {
    const { speculativeSyncManager } = await import("./core/services/speculative-sync-service");
    (window as any).automationHooks = {
      speculativeSyncManager
    };
  }

  root?.render(
    <FluentProvider theme={webLightTheme}>
      <App title={title} />
    </FluentProvider>
  );
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    root?.render(
      <FluentProvider theme={webLightTheme}>
        <NextApp title={title} />
      </FluentProvider>
    );
  });
}
