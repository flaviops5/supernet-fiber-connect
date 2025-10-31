import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      
      // Sprint 4 - Code Quality Rules
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-imports": ["warn", {
        prefer: "type-imports"
      }],
      
      // General Code Quality
      "no-console": "error", // MISSÃO 2.2: Zero console statements
      "prefer-const": "warn",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      "no-throw-literal": "error",
      
      // Security & Performance
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      
      // Naming Conventions (Sprint 3)
      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow"
        },
        {
          selector: "function",
          format: ["camelCase"]
        },
        {
          selector: "typeLike",
          format: ["PascalCase"]
        },
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: {
            regex: "^I[A-Z]",
            match: false
          }
        }
      ]
    },
  },
);
