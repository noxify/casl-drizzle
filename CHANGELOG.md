## @noxify/casl-drizzle@0.3.0

### Update dependencies and CI infrastructure

- Bump `drizzle-orm` peer dependency to `>=1.0.0-rc.4`
- Bump `@casl/ability` peer dependency to `^7.0.1`
- Update dev dependencies (`vitest`, `tsdown`, `oxfmt`, `oxlint`, `tsx`, `ultracite`, `@electric-sql/pglite`)
- Migrate release workflow from Changesets to Tegami
- Add dedicated `test` and `test-e2e` CI jobs
- Upgrade GitHub Actions (`actions/checkout@v7`)
- Add Node.js 26 to CI test matrix
- Update `packageManager` to `pnpm@11.15.1`

### Add `ofType()` method to `accessibleBy`

Adds an `.ofType("Subject")` method as an alternative to property access for retrieving subject-specific conditions. This aligns with the CASL/Prisma `accessibleBy(ability).ofType("Subject")` API pattern.

```ts
// New API:
const where = accessibleBy(ability, "read").ofType("posts")

// Existing API still works:
const where = accessibleBy(ability, "read").posts
```

# @noxify/casl-drizzle

## 0.2.0

### Minor Changes

- f1d7228: Upgrade `@casl/ability` to v7 and `drizzle@rc`

  ### Breaking Changes (upstream)

  We upgraded the peer dependency `@casl/ability` to version 7. This major release includes breaking changes, and this package was updated to be compatible with v7. As a result, this release is no longer compatible with `@casl/ability` v6.

  https://github.com/stalniy/casl/releases/tag/%40casl%2Fability%407.0.0

  ***

  We also updated the required `drizzle-orm` version and now target `1.0.0-rc.3`.

  There may be internal breaking changes when upgrading from the `beta` release line to `1.0.0-rc.3`.

## 0.1.0

### Minor Changes

- 9ce9290: Initial release of @noxify/casl-drizzle

  ## Features
  - Type-safe CASL integration for Drizzle ORM
  - Full relation support (one-to-one, one-to-many, many-to-many)
  - Complete operator support (eq, gt, gte, lt, lte, like, ilike, startsWith, endsWith, contains, in, etc.)
  - Relation helpers: `some()`, `every()`, `none()`
  - Raw SQL conditions via `RAW` field
  - Type-safe query conditions extracted from Drizzle schema
  - IDE autocomplete for subject-specific fields
  - Comprehensive test coverage for all relation types

## 0.0.1-beta.3

### Patch Changes

- 55553e9: use latest changesets action

## 0.0.1-beta.2

### Patch Changes

- a14cf19: update license year

## 0.0.1-beta.1

### Patch Changes

- d6f9e60: update npm publish

## 0.0.1-beta.0

### Patch Changes

- e963cef: init
