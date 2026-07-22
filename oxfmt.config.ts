import { defineConfig } from "oxfmt"
import ultracite from "ultracite/oxfmt"

export default defineConfig({
  ...ultracite,
  lineWidth: 100,
  semi: false,
  sortImports: true,
  sortTailwindcss: true,
  trailingComma: "es5",
  ignorePatterns: [".tegami/publish-lock.yaml"],
})
