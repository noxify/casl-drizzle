> work in progress :)

# casl-drizzle

CASL integration for Drizzle ORM - Add type-safe authorization to your database queries

## Install

```sh
npm install @noxify/casl-drizzle @casl/ability
```

## Quick Start

Define your abilities using Drizzle's query types directly:

```typescript
import type { QueryInput } from "@noxify/casl-drizzle"
import { accessibleBy, defineAbility } from "@noxify/casl-drizzle"
import { integer, pgTable, text } from "drizzle-orm/pg-core"

// Define your Drizzle schema
const users = pgTable("users", {
  id: integer().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
})

const schema = { users }

// Extract query types for your tables
type UserQuery = QueryInput<typeof schema, "users">

// Create abilities with subject-specific autocomplete
const ability = defineAbility<{ users: UserQuery }>((can, cannot) => {
  can("read", "users", { id: 1 }) // ✅ Autocomplete shows only user fields!
  can("update", "users", { id: 1 })
  cannot("delete", "users")
})

// Use with accessibleBy to get database filters
const filters = accessibleBy(ability, "read")
const readableUsers = await db.query.users.findMany({ where: filters.users })
```

## Features

- 🔒 **Type-safe authorization** - Full TypeScript support with Drizzle types
- 🎯 **CASL integration** - Leverage CASL's powerful rule system
- 🗄️ **DB agnostic** - Works with PostgreSQL, MySQL, SQLite, etc.
- 🔗 **Relation support** - Filter by related table conditions with Drizzle RQB v2
- 📦 **Zero overhead** - Direct type composition, no runtime wrappers
- 💡 **Smart autocomplete** - Subject-specific field suggestions with `defineAbility()`

## Usage with Relations

With Drizzle RQB v2, use `QueryInput` for full operator support:

```typescript
import type { QueryInput } from "@noxify/casl-drizzle"
import { defineRelations } from "drizzle-orm"

const posts = pgTable("posts", {
  id: integer().primaryKey(),
  title: text().notNull(),
  authorId: integer().notNull(),
})

const relations = defineRelations({ users, posts }, (r) => ({
  users: { posts: r.many(posts) },
  posts: { author: r.one(users, { fields: [posts.authorId], references: [users.id] }) },
}))

type PostQuery = QueryInput<typeof relations, "posts">

const ability = defineAbility<{ posts: PostQuery }>((can) => {
  can("read", "posts", { published: true })
  can("update", "posts", { authorId: 1 })
})
```

## Alternative: AbilityBuilder

If you prefer the traditional AbilityBuilder pattern:

```typescript
import type { DefineAbility } from "@noxify/casl-drizzle"
import { AbilityBuilder } from "@casl/ability"
import { createDrizzleAbilityFor } from "@noxify/casl-drizzle"

type AppAbility = DefineAbility<{ users: UserQuery }>

const { can, cannot, build } = new AbilityBuilder<AppAbility>(createDrizzleAbilityFor())

can("read", "users", { id: 1 })
cannot("delete", "users")

const ability = build()
```

## Documentation

See [SIMPLIFIED_API.md](./SIMPLIFIED_API.md) for detailed examples and patterns.

## License

MIT
