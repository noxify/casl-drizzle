# Simplified API (CASL-Prisma Style)

The simplified API provides a more direct, type-safe way to define abilities similar to CASL Prisma's approach. No wrapper functions needed!

## Overview

Instead of using factory wrappers like `createDrizzleAbility({ schema, relations })`, you define query types explicitly and compose them using `defineAbility()` for the best autocomplete experience.

```typescript
import type { QueryInput, RelationalQueryInput } from "ucastle"
import { defineAbility } from "ucastle"

// Define query types
type UserQuery = RelationalQueryInput<typeof relations, "users">
type PostQuery = RelationalQueryInput<typeof relations, "posts">

// Use defineAbility for subject-specific autocomplete
const ability = defineAbility<{
  users: UserQuery
  posts: PostQuery
}>((can, cannot) => {
  can("read", "users", { age: { gte: 18 } }) // ✅ Only user fields autocomplete!
  can("manage", "posts", { authorId: 1 }) // ✅ Only post fields autocomplete!
})
```

## Two Ways to Define Abilities

### Option 1: `defineAbility()` (Recommended)

Best autocomplete - conditions are subject-specific:

```typescript
import { defineAbility } from "ucastle"

const ability = defineAbility<{
  users: UserQuery
  posts: PostQuery
}>((can, cannot) => {
  can("read", "users", { id: 1 }) // ✅ Shows only user fields
  can("read", "posts", { authorId: 1 }) // ✅ Shows only post fields
})
```

### Option 2: `AbilityBuilder` (Traditional)

Standard CASL pattern:

```typescript
import type { DefineAbility } from "ucastle"
import { AbilityBuilder } from "@casl/ability"
import { createDrizzleAbilityFor } from "ucastle"

type AppAbility = DefineAbility<{
  users: UserQuery
  posts: PostQuery
}>

const { can, cannot, build } = new AbilityBuilder<AppAbility>(createDrizzleAbilityFor())

can("read", "users", { id: 1 })
cannot("delete", "posts")

const ability = build()
```

## Key Types

### `RelationalQueryInput<TSchema, TTableName>`

For tables **with relations** (when you've used `defineRelations()`):

```typescript
import { defineRelations } from "drizzle-orm"

const relations = defineRelations({ users, posts, comments }, (r) => ({
  // ... relations config
}))

// Extract query type with relation support
type PostQuery = RelationalQueryInput<typeof relations, "posts">

// Includes:
// - All field conditions (published, authorId, etc.)
// - All Drizzle operators (eq, gte, lt, in, like, etc.)
// - Relation filters (author, comments, etc.)
// - Compound operators (AND, OR, NOT)
```

### `QueryInput<TSchema, TTableName>`

For tables **without relations**:

```typescript
import type { ExtractTablesFromSchema } from "drizzle-orm/relations"

const schema = { users, articles } as const
type Tables = typeof schema

// Extract query type without relations
type ArticleQuery = QueryInput<Tables, "articles">

// Includes:
// - All field conditions
// - All Drizzle operators
// - Compound operators (AND, OR, NOT)
// - No relation support (as expected)
```

### `Subjects<T>`

Helper to create CASL subjects from a mapping of table names to query types:

```typescript
type AppAbility = PureAbility<
  [
    string,
    Subjects<{
      users: UserQuery
      posts: PostQuery
      comments: CommentQuery
    }>,
  ]
>
```

## Complete Examples

### Example 1: Schema Without Relations

```typescript
import type { PureAbility } from "@casl/ability"
import type { QueryInput, Subjects } from "ucastle"
import { AbilityBuilder } from "@casl/ability"
import { integer, pgTable, text } from "drizzle-orm/pg-core"
import { createDrizzleAbilityFor } from "ucastle"

// Define simple tables
const users = pgTable("users", {
  id: integer().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
})

const articles = pgTable("articles", {
  id: integer().primaryKey(),
  title: text().notNull(),
  published: boolean().notNull(),
})

const schema = { users, articles } as const
type Tables = typeof schema

// Define query types
type UserQuery = QueryInput<Tables, "users">
type ArticleQuery = QueryInput<Tables, "articles">

// Create ability type
type AppAbility = PureAbility<
  [
    string,
    Subjects<{
      users: UserQuery
      articles: ArticleQuery
    }>,
  ]
>

// Define abilities
const { can, cannot, build } = new AbilityBuilder<AppAbility>(createDrizzleAbilityFor())

can("read", "users", { id: 1 })
can("read", "articles", { published: true })
cannot("delete", "articles")

const ability = build()
```

### Example 2: Schema With Relations

```typescript
import type { PureAbility } from "@casl/ability"
import type { RelationalQueryInput, Subjects } from "ucastle"
import { AbilityBuilder } from "@casl/ability"
import { defineRelations } from "drizzle-orm"
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core"
import { createDrizzleAbilityFor } from "ucastle"

// Define tables
const users = pgTable("users", {
  id: integer().primaryKey(),
  name: text().notNull(),
  role: text().notNull(),
})

const posts = pgTable("posts", {
  id: integer().primaryKey(),
  title: text().notNull(),
  published: boolean().notNull(),
  authorId: integer().notNull(),
})

const comments = pgTable("comments", {
  id: integer().primaryKey(),
  content: text().notNull(),
  postId: integer().notNull(),
  authorId: integer().notNull(),
})

// Define relations
const relations = defineRelations({ users, posts, comments }, (r) => ({
  users: {
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
    comments: r.many.comments({
      from: r.posts.id,
      to: r.comments.postId,
    }),
  },
  comments: {
    author: r.one.users({
      from: r.comments.authorId,
      to: r.users.id,
    }),
  },
}))

// Define query types with relation support
type UserQuery = RelationalQueryInput<typeof relations, "users">
type PostQuery = RelationalQueryInput<typeof relations, "posts">
type CommentQuery = RelationalQueryInput<typeof relations, "comments">

// Create ability type
type AppAbility = PureAbility<
  [
    string,
    Subjects<{
      users: UserQuery
      posts: PostQuery
      comments: CommentQuery
    }>,
  ]
>

// Define abilities
const { can, cannot, build } = new AbilityBuilder<AppAbility>(createDrizzleAbilityFor())

can("read", "posts", { published: true })
can("update", "posts", { authorId: 1 })
can("delete", "comments", { authorId: 1 })
cannot("delete", "users")

const ability = build()
```

### Example 3: Mixed Setup

You can mix tables with and without relations:

```typescript
import type { RelationalQueryInput, QueryInput, Subjects } from "ucastle"

// Some tables with relations
const relations = defineRelations({ users, posts }, ...)
type PostQuery = RelationalQueryInput<typeof relations, "posts">

// Some tables without relations
const simpleSchema = { articles, logs } as const
type ArticleQuery = QueryInput<typeof simpleSchema, "articles">

// Mix them in one AppAbility
type AppAbility = PureAbility<
  [
    string,
    Subjects<{
      posts: PostQuery      // With relations
      articles: ArticleQuery // Without relations
    }>,
  ]
>
```

## Comparison: Old vs New API

### Old API (Factory Wrappers)

```typescript
import { createDrizzleAbility } from "ucastle"

const { defineAbility, accessibleBy } = createDrizzleAbility({
  schema: { users, posts, comments } as const,
  relations,
})

const ability = defineAbility((can) => {
  can("read", "posts", { published: true })
})
```

**Pros:**

- Simple for basic use cases
- Less boilerplate for single-schema projects

**Cons:**

- Hidden types (magic under the hood)
- Hard to customize
- Multiple factory functions needed
- Less explicit

### New API (Explicit Types)

```typescript
import type { PureAbility } from "@casl/ability"
import type { RelationalQueryInput, Subjects } from "ucastle"
import { AbilityBuilder } from "@casl/ability"
import { createDrizzleAbilityFor } from "ucastle"

type PostQuery = RelationalQueryInput<typeof relations, "posts">

type AppAbility = PureAbility<
  [
    string,
    Subjects<{
      posts: PostQuery
    }>,
  ]
>

const { can, build } = new AbilityBuilder<AppAbility>(createDrizzleAbilityFor())
can("read", "posts", { published: true })
const ability = build()
```

**Pros:**

- Explicit and clear
- Full TypeScript control
- Single factory function
- Follows CASL conventions
- Easy to extend
- Mix schemas/relations freely

**Cons:**

- Slightly more boilerplate

## Type Safety Benefits

The simplified API provides excellent type safety:

```typescript
type PostQuery = RelationalQueryInput<typeof relations, "posts">

// ✅ Autocomplete for all fields
const valid: PostQuery = {
  published: true,
  authorId: 1,
  title: { like: "%draft%" },
}

// ✅ Autocomplete for operators
const withOperators: PostQuery = {
  id: { gte: 10 },
  published: { eq: true },
}

// ✅ Compound conditions
const compound: PostQuery = {
  OR: [{ published: true }, { authorId: 1 }],
}

// ❌ TypeScript error for invalid fields
const invalid: PostQuery = {
  invalidField: true, // Error!
}
```

## Migration Guide

If you're using the old factory API, migration is straightforward:

### Before

```typescript
const { defineAbility } = createDrizzleAbility({
  schema: { users, posts },
  relations,
})

const ability = defineAbility((can) => {
  can("read", "posts", { published: true })
})
```

### After

```typescript
type PostQuery = RelationalQueryInput<typeof relations, "posts">
type UserQuery = RelationalQueryInput<typeof relations, "users">

type AppAbility = PureAbility<[string, Subjects<{ posts: PostQuery; users: UserQuery }>]>

const { can, build } = new AbilityBuilder<AppAbility>(createDrizzleAbilityFor())
can("read", "posts", { published: true })
const ability = build()
```

## Why This Approach?

1. **Follows CASL Conventions** - Similar to `@casl/prisma` pattern
2. **More Explicit** - Types are visible and controllable
3. **Flexible** - Mix schemas, relations, and custom types freely
4. **Standard** - Uses standard CASL `AbilityBuilder`
5. **Maintainable** - No need for multiple factory wrappers

## See Also

- [CASL Documentation](https://casl.js.org/v6/en/)
- [Drizzle Relations](https://orm.drizzle.team/docs/rqb)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
