import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const compat = new FlatCompat({ baseDirectory: currentDirectory });

const eslintConfig = [
  { ignores: [".next/**","node_modules/**","out/**","build/**","coverage/**","next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["components/AdminManagementPageBuilder.tsx","components/AdminNotificationsInbox.tsx"],
    rules: { "react-hooks/exhaustive-deps": "off" },
  },
  {
    files: ["components/PublicPageBuilderRenderer.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
];

export default eslintConfig;
