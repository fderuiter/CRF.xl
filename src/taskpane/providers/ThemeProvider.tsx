/** @issue #28 */
import * as React from "react";
import { FluentProvider, webLightTheme, webDarkTheme, teamsHighContrastTheme, Theme } from "@fluentui/react-components";

export type ThemeType = "light" | "dark" | "high-contrast";

interface ThemeContextValue {
  themeType: ThemeType;
}

export const ThemeContext = React.createContext<ThemeContextValue>({ themeType: "light" });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeType, setThemeType] = React.useState<ThemeType>("light");

  React.useEffect(() => {
    // Media query for OS high contrast mode
    const hcQuery = window.matchMedia("(forced-colors: active)");
    
    // Check if the current Office theme is dark based on its bodyBackgroundColor
    const isDarkColor = (color: string) => {
      if (!color || color[0] !== '#') return false;
      const hex = color.slice(1);
      if (hex.length === 3 || hex.length === 6) {
        const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
        const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
        const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128; // Standard threshold for dark colors
      }
      return false;
    };

    const detectTheme = (officeTheme?: any): ThemeType => {
      // High contrast overrides all
      if (hcQuery.matches) {
        return "high-contrast";
      }

      if (officeTheme && officeTheme.bodyBackgroundColor) {
        if (isDarkColor(officeTheme.bodyBackgroundColor)) {
          return "dark";
        }
      } else if (typeof Office !== "undefined" && Office.context && Office.context.officeTheme) {
        // Fallback to reading from context directly if not passed in
        if (isDarkColor(Office.context.officeTheme.bodyBackgroundColor)) {
          return "dark";
        }
      }

      return "light";
    };

    const updateTheme = (officeTheme?: any) => {
      const newTheme = detectTheme(officeTheme);
      setThemeType(newTheme);
    };

    // Event handler for Office theme change
    const handleOfficeThemeChange = (eventArgs: any) => {
      if (eventArgs && eventArgs.officeTheme) {
        updateTheme(eventArgs.officeTheme);
      } else {
        updateTheme();
      }
    };

    // Event handler for high-contrast mode change
    const handleHcChange = () => {
      updateTheme();
    };

    // Initialize state
    if (typeof Office !== "undefined") {
      Office.onReady(() => {
        updateTheme();

        // Subscribe to Office Theme Changes
        if (Office.context && (Office.context as any).addEventListener) {
          (Office.context as any).addEventListener(
            (Office as any).EventType.OfficeThemeChanged,
            handleOfficeThemeChange
          );
        }
      });
    } else {
      updateTheme();
    }

    // Subscribe to High-Contrast Changes
    if (hcQuery.addEventListener) {
      hcQuery.addEventListener("change", handleHcChange);
    } else if ((hcQuery as any).addListener) {
      (hcQuery as any).addListener(handleHcChange); // IE/Edge fallback
    }

    return () => {
      // Clean up Office listener
      if (typeof Office !== "undefined" && Office.context && (Office.context as any).removeEventListener) {
        (Office.context as any).removeEventListener(
          (Office as any).EventType.OfficeThemeChanged,
          handleOfficeThemeChange
        );
      }

      // Clean up HC listener
      if (hcQuery.removeEventListener) {
        hcQuery.removeEventListener("change", handleHcChange);
      } else if ((hcQuery as any).removeListener) {
        (hcQuery as any).removeListener(handleHcChange);
      }
    };
  }, []);

  let fluentTheme: Theme = webLightTheme;
  if (themeType === "dark") {
    fluentTheme = webDarkTheme;
  } else if (themeType === "high-contrast") {
    fluentTheme = teamsHighContrastTheme;
  }

  // Unified context wrapping the Fluent UI Provider
  return (
    <ThemeContext.Provider value={{ themeType }}>
      {/* eslint-disable-next-line react/forbid-component-props */}
      <FluentProvider theme={fluentTheme} style={{ minHeight: "100vh", backgroundColor: "transparent" }}>
        {children}
      </FluentProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => React.useContext(ThemeContext);
