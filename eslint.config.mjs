import officeAddins from "eslint-plugin-office-addins";
import eslintPluginJsxA11y from "eslint-plugin-jsx-a11y";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";

export default [
  ...officeAddins.configs.react,
  eslintPluginJsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    plugins: {
      "office-addins": officeAddins,
      "@typescript-eslint": tsPlugin,
      "react-hooks": {
        rules: {
          "exhaustive-deps": {
            create: () => ({})
          },
          "rules-of-hooks": {
            create: () => ({})
          }
        }
      }
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
      "@typescript-eslint/no-unused-vars": "off",
      "no-redeclare": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/no-noninteractive-tabindex": "off",
      "react/no-unescaped-entities": "off",
      "jsx-a11y/label-has-associated-control": "off",
      "office-addins/no-context-sync-in-loop": "off",
      "no-case-declarations": "off",
      "office-addins/load-object-before-read": "off",
      "office-addins/call-sync-before-read": "off",
      "office-addins/no-navigational-load": "off",
      "office-addins/call-sync-after-load": "off",
      "no-useless-escape": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off"
    }
  }
];
