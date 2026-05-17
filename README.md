# @noxify/casl-drizzle

CASL integration for Drizzle ORM - Add type-safe authorization to your database queries

## Features

- 🔒 **Type-safe** - Full TypeScript support with Drizzle types
- 🎯 **Relation support** - Filter by related table conditions
- 🔗 **Query operators** - All Drizzle operators (eq, gt, like, etc.)
- 💡 **IDE autocomplete** - Subject-specific field suggestions

## Install

```sh
npm install @noxify/casl-drizzle @casl/ability
```

## Setup

Define your Drizzle schema and relations:

```typescript
import { defineRelations, pgTable } from "drizzle-orm"
import { integer, text } from "drizzle-orm/pg-core"

const users = pgTable("users", {
  id: integer().primaryKey(),
  name: text().notNull(),
})

const posts = pgTable("posts", {
  id: integer().primaryKey(),
  title: text().notNull(),
  authorId: integer().notNull(),
})

export const relations = defineRelations({ users, posts }, (r) => ({
  users: { posts: r.many.posts() },
  posts: { author: r.one.users({ from: r.posts.authorId, to: r.users.id }) },
}))
```

## Usage

Create type-safe abilities with Drizzle query conditions:

```typescript
import type { QueryInput } from "@noxify/casl-drizzle"
import { accessibleBy, createDrizzleAbility, some } from "@noxify/casl-drizzle"
import { sql } from "drizzle-orm"

type PostQuery = QueryInput<typeof relations, "posts">
type UserQuery = QueryInput<typeof relations, "users">

const currentUserId = 1

const ability = createDrizzleAbility<
  { posts: PostQuery; users: UserQuery },
  "read" | "create" | "update" | "delete"
>((can) => {
  // Simple field filtering
  can("read", "posts", { published: true })

  // Filter by related table (author)
  can("read", "posts", { author: { id: currentUserId } })

  // Complex conditions with operators
  can("update", "posts", {
    author: { id: currentUserId },
    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })

  // Raw SQL for complex queries
  can("delete", "posts", {
    RAW: sql`author_id = ${currentUserId} AND published = false`,
  })
})

// Convert abilities to database filters
const filters = accessibleBy(ability, "read")
const posts = await db.query.posts.findMany({ where: filters.posts })
```
