import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import imports from "eslint-plugin-import";

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"] },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    plugins: { react, "react-hooks": reactHooks, "jsx-a11y": jsxA11y, import: imports, "@typescript-eslint": tsPlugin },
    settings: { react: { version: "detect" } },
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "warn"
    }
  },
  {
    files: ["components/AdminManagementPageBuilder.tsx", "components/AdminNotificationsInbox.tsx", "app/programs/**/page.tsx"],
    rules: { "react-hooks/exhaustive-deps": "off" }
  }
];
export default eslintConfig;
