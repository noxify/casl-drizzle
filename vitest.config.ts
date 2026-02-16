import { defineConfig } from "vitest/config"

const isCI = !!process.env.CI

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    environment: "node",
    passWithNoTests: true,
    testTimeout: 10000,
    pool: isCI ? "forks" : "threads",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "**/*.config.*", "**/*.test.*", "tests/**"],
    },
    projects: [
      {
        test: {
          include: ["tests/**/*.test.ts"],
        },
      },
    ],
  },
})
