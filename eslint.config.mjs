import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import nextPlugin from "@next/eslint-plugin-next";

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"] },
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tsPlugin,
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react/prop-types": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" } },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["components/AdminManagementPageBuilder.tsx", "components/AdminNotificationsInbox.tsx", "app/programs/**/page.tsx"],
    rules: { "react-hooks/exhaustive-deps": "off" },
  },
  {
    files: ["components/PublicPageBuilderRenderer.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
];
export default eslintConfig;
