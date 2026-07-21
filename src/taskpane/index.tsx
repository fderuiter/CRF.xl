/// <reference types="office-js" />
/**
 * @issue #28
 */
import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider, webLightTheme, webDarkTheme, teamsHighContrastTheme } from "@fluentui/react-components";
import { initLocale } from "./core/locale-config";

/* global document, Office, module, require, HTMLElement, window */

const title = "Contoso Task Pane Add-in";

function isDarkTheme(hex?: string) {
  if (!hex) return false;
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }
  const r = parseInt(color.substring(0, 2), 16) / 255;
  const g = parseInt(color.substring(2, 4), 16) / 255;
  const b = parseInt(color.substring(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 0.5;
}

const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = React.useState(webLightTheme);

  React.useEffect(() => {
    const updateTheme = (officeTheme?: any) => {
      if (window.matchMedia && window.matchMedia("(forced-colors: active)").matches) {
        setTheme(teamsHighContrastTheme);
        return;
      }
      
      if (officeTheme && officeTheme.primaryBackgroundColor) {
        if (isDarkTheme(officeTheme.primaryBackgroundColor)) {
          setTheme(webDarkTheme);
          return;
        } else {
          setTheme(webLightTheme);
          return;
        }
      }
      
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme(webDarkTheme);
        return;
      }
      
      setTheme(webLightTheme);
    };

    updateTheme(typeof Office !== "undefined" && Office.context ? (Office.context as any).officeTheme : undefined);

    const matchMediaHC = window.matchMedia ? window.matchMedia("(forced-colors: active)") : null;
    const matchMediaDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

    const mediaListener = () => {
      updateTheme(typeof Office !== "undefined" && Office.context ? (Office.context as any).officeTheme : undefined);
    };

    if (matchMediaHC) matchMediaHC.addEventListener("change", mediaListener);
    if (matchMediaDark) matchMediaDark.addEventListener("change", mediaListener);

    if (typeof Office !== "undefined" && Office.context && (Office.context as any).addEventListener && (Office as any).EventType && (Office as any).EventType.OfficeThemeChanged) {
      try {
        (Office.context as any).addEventListener((Office as any).EventType.OfficeThemeChanged, (args: any) => {
          updateTheme(args.officeTheme);
        });
      } catch (e) {
        // Ignore fallback
      }
    }

    return () => {
      if (matchMediaHC) matchMediaHC.removeEventListener("change", mediaListener);
      if (matchMediaDark) matchMediaDark.removeEventListener("change", mediaListener);
    };
  }, []);

  return <FluentProvider theme={theme}>{children}</FluentProvider>;
};

const rootElement: HTMLElement | null = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

/* Render application after Office initializes */
if (typeof Office !== "undefined") {
  Office.onReady(() => {
    const hostLocale = Office.context.displayLanguage || "en-US";
    initLocale(hostLocale);

    root?.render(
      <ThemeWrapper>
        <App title={title} />
      </ThemeWrapper>
    );
  });
} else {
  // Fallback for standalone browser testing
  root?.render(
    <ThemeWrapper>
      <App title={title} />
    </ThemeWrapper>
  );
}

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    root?.render(
      <ThemeWrapper>
        <NextApp title={title} />
      </ThemeWrapper>
    );
  });
}
