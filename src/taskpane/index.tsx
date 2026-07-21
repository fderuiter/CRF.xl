/// <reference types="office-js" />
/**
 * @issue #28
 */
import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { ThemeProvider } from "./providers/ThemeProvider";
import { initLocale } from "./core/locale-config";

/* global document, Office, module, require, HTMLElement */

const title = "Contoso Task Pane Add-in";

const rootElement: HTMLElement | null = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

/* Render application after Office initializes */
if (typeof Office !== "undefined") {
  Office.onReady(() => {
    const hostLocale = Office.context.displayLanguage || "en-US";
    initLocale(hostLocale);

    root?.render(
      <ThemeProvider>
        <App title={title} />
      </ThemeProvider>
    );
  });
} else {
  // Fallback for standalone browser testing
  root?.render(
    <ThemeProvider>
      <App title={title} />
    </ThemeProvider>
  );
}

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    root?.render(
      <ThemeProvider>
        <NextApp title={title} />
      </ThemeProvider>
    );
  });
}
