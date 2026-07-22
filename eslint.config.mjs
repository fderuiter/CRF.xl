import officeAddins from "eslint-plugin-office-addins";
import eslintPluginJsxA11y from "eslint-plugin-jsx-a11y";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsdoc from "eslint-plugin-jsdoc";

export default [
  ...officeAddins.configs.react,
  eslintPluginJsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    plugins: {
      "office-addins": officeAddins,
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooksPlugin
    },
    languageOptions: {
      parser: tsParser,
      globals: {
        "browser": true,
        "node": true,
        "es2021": true,
        "jest": true
      }
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", {
        "vars": "all",
        "args": "none",
        "caughtErrors": "all",
        "ignoreRestSiblings": true
      }],
      "no-redeclare": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/no-noninteractive-tabindex": "off",
      "react/no-unescaped-entities": "off",
      "jsx-a11y/label-has-associated-control": "off",
      "office-addins/no-context-sync-in-loop": "error",
      "no-case-declarations": "off",
      "office-addins/load-object-before-read": "error",
      "office-addins/call-sync-before-read": "error",
      "office-addins/no-navigational-load": "off",
      "office-addins/call-sync-after-load": "error",
      "no-useless-escape": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react/forbid-dom-props": ["error", { "forbid": ["style"] }],
      "react/forbid-component-props": ["error", { "forbid": ["style"] }]
    }
  },
  {
    files: ["src/taskpane/core/**/*.ts", "src/taskpane/core/**/*.tsx"],
    plugins: {
      jsdoc: jsdoc
    },
    rules: {
      "jsdoc/check-param-names": "error",
      "jsdoc/require-param": "error",
      "jsdoc/require-param-name": "error",
      "jsdoc/require-param-type": "off",

      "jsdoc/require-returns": "error",
      "jsdoc/require-returns-check": "error",
      "jsdoc/require-returns-type": "off"
    },
    settings: {
      jsdoc: {
        mode: "typescript"
      }
    }
  },
  {
    files: ["src/taskpane/core/validators/**/*", "src/taskpane/core/generators/**/*"],
    rules: {
      "no-restricted-imports": ["error", {
        "patterns": [
          {
            "group": ["**/components/**", "**/hooks/**", "**/providers/**", "**/theme", "**/theme.*"],
            "message": "Presentation/UI modules and themes are forbidden in core logic (Clean Architecture boundary)."
          }
        ]
      }]
    }
  }
];
