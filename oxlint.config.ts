import { defineConfig } from "oxlint"
import core from "ultracite/oxlint/core"
import next from "ultracite/oxlint/next"
import react from "ultracite/oxlint/react"
import vitest from "ultracite/oxlint/vitest"

export default defineConfig({
  extends: [core, vitest, react, next],
  overrides: [
    {
      files: ["tests/**/*.test.ts"],
      rules: {
        "vitest/max-expects": "off",
      },
    },
    {
      files: ["**/*.{ts,tsx}"],
      rules: {
        "vitest/max-expects": ["error", 10],
        "no-use-before-define": [
          "error",
          {
            allowNamedExports: true,
            functions: false,
            ignoreTypeReferences: true,
          },
        ],
      },
    },
  ],
  rules: {
    "func-style": "off",
    "no-console": "error",
    "no-inline-comments": "off",
    "no-nested-ternary": "off",
    "vitest/max-expects": ["error", 10],
    // Keep disabled globally; re-enable selectively via overrides for runtime-heavy paths.
    "no-use-before-define": "off",
    "no-restricted-imports": [
      "error",
      {
        importNames: ["env"],
        message:
          "Use `import { env } from '~/env'` instead to ensure validated types.",
        name: "process",
      },
    ],
    "no-restricted-properties": [
      "error",
      {
        message:
          "Use `import { env } from '~/env'` instead to ensure validated types.",
        object: "process",
        property: "env",
      },
    ],
    "require-await": "off",
    "sort-keys": "off",
    "unicorn/no-nested-ternary": "off",
  },
})
