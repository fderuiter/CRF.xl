import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import App from "./components/App";
import { FluentProvider, webLightTheme, webDarkTheme } from "@fluentui/react-components";

/* global document, Office, window, module, require, HTMLElement */

const title = "Contoso Task Pane Add-in";

const rootElement: HTMLElement | null = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

const RootComponent = () => {
  const [theme, setTheme] = useState(webLightTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? webDarkTheme : webLightTheme);
    };

    setTheme(mediaQuery.matches ? webDarkTheme : webLightTheme);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <FluentProvider theme={theme}>
      <App title={title} />
    </FluentProvider>
  );
};

/* Render application after Office initializes */
Office.onReady(() => {
  root?.render(<RootComponent />);
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    root?.render(NextApp);
  });
}
