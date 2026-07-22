---
packages:
  "npm:@noxify/casl-drizzle": patch
---

### Update dependencies and CI infrastructure

- Bump `drizzle-orm` peer dependency to `>=1.0.0-rc.4`
- Bump `@casl/ability` peer dependency to `^7.0.1`
- Update dev dependencies (`vitest`, `tsdown`, `oxfmt`, `oxlint`, `tsx`, `ultracite`, `@electric-sql/pglite`)
- Migrate release workflow from Changesets to Tegami
- Add dedicated `test` and `test-e2e` CI jobs
- Upgrade GitHub Actions (`actions/checkout@v7`)
- Add Node.js 26 to CI test matrix
- Update `packageManager` to `pnpm@11.15.1`
