import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config | import("eslint").Linter.Config[]} */
const overrides = {
  rules: {
    "react/prop-types": "off",
    "turbo/no-undeclared-env-vars": "off",
  },
  languageOptions: {
    globals: {
      process: "readonly",
    },
  },
  ignores: [".next/**"],
};

const config = Array.isArray(nextJsConfig)
  ? nextJsConfig.map((c) => ({
      ...(c || {}),
      rules: { ...(c.rules || {}), ...(overrides.rules || {}) },
      languageOptions: { ...(c.languageOptions || {}), ...(overrides.languageOptions || {}) },
      ignores: [...(c.ignores || []), ...(overrides.ignores || [])],
    }))
  : {
      ...(nextJsConfig || {}),
      rules: { ...(nextJsConfig?.rules || {}), ...(overrides.rules || {}) },
      languageOptions: {
        ...(nextJsConfig?.languageOptions || {}),
        ...(overrides.languageOptions || {}),
      },
      ignores: [...(nextJsConfig?.ignores || []), ...(overrides.ignores || [])],
    };

export default config;
