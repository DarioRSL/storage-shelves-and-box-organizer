import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import eslintPluginAstro from "eslint-plugin-astro";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginReact from "eslint-plugin-react";
import reactCompiler from "eslint-plugin-react-compiler";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

// File path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

const baseConfig = tseslint.config({
  extends: [eslint.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic],
  rules: {
    "no-console": "warn",
    "no-unused-vars": "off",
  },
});

const jsxA11yConfig = tseslint.config({
  files: ["**/*.{js,jsx,ts,tsx}"],
  extends: [jsxA11y.flatConfigs.recommended],
  languageOptions: {
    ...jsxA11y.flatConfigs.recommended.languageOptions,
  },
  rules: {
    ...jsxA11y.flatConfigs.recommended.rules,
  },
});

const reactConfig = tseslint.config({
  files: ["**/*.{js,jsx,ts,tsx}"],
  extends: [pluginReact.configs.flat.recommended],
  languageOptions: {
    ...pluginReact.configs.flat.recommended.languageOptions,
    globals: {
      window: true,
      document: true,
    },
  },
  plugins: {
    "react-hooks": eslintPluginReactHooks,
    "react-compiler": reactCompiler,
  },
  settings: { react: { version: "detect" } },
  rules: {
    ...eslintPluginReactHooks.configs.recommended.rules,
    "react/react-in-jsx-scope": "off",
    "react-compiler/react-compiler": "error",
  },
});

export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  baseConfig,
  jsxA11yConfig,
  reactConfig,
  eslintPluginAstro.configs["flat/recommended"],
  eslintPluginPrettier,
  {
    // Disable prettier for .astro files to avoid parsing errors with define:vars syntax
    // This override must come AFTER eslintPluginPrettier to take effect
    files: ["**/*.astro"],
    rules: {
      "prettier/prettier": "off",
    },
  },
  {
    // Node.js script files - allow Node.js globals
    files: ["scripts/**/*.{js,mjs,cjs}", "*.config.{js,mjs,cjs,ts}", "test-*.js"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        Buffer: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      // Allow unused vars in scripts (common for optional features)
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Test files - allow Node.js globals and relax some rules
    files: ["tests/**/*.{ts,tsx,js,mjs}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        Response: "readonly",
        Request: "readonly",
        Headers: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        File: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
      },
    },
    rules: {
      // Allow non-null assertions in test files where we know values exist
      "@typescript-eslint/no-non-null-assertion": "off",
      // Allow unused vars in tests (common for test setup)
      "@typescript-eslint/no-unused-vars": "off",
      // Allow explicit any in tests for mocking purposes
      "@typescript-eslint/no-explicit-any": "off",
      // Allow empty functions in tests (common for mocks)
      "@typescript-eslint/no-empty-function": "off",
      // Allow useless constructors in tests (for testing purposes)
      "@typescript-eslint/no-useless-constructor": "off",
    },
  },
  {
    // Specifically ignore Astro files with inline scripts due to syntax incompatibility
    ignores: ["**/theme/ThemeInitializer.astro", "**/auth/callback.astro"],
  }
);
