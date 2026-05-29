# @noxify/casl-drizzle

CASL v7 integration for Drizzle ORM ( 1.0.0-rc.3 ) - Add type-safe authorization to your database queries

## Features

- 🔒 **Type-safe** - Full TypeScript support with Drizzle types
- 🎯 **Relation support** - Filter by related table conditions
- 🔁 **Many-to-many support** - Filter across join-table relations
- 🔗 **Query operators** - All Drizzle operators (eq, gt, like, etc.)
- 💡 **IDE autocomplete** - Subject-specific field suggestions

## Install

```sh
npm install @noxify/casl-drizzle @casl/ability drizzle-orm@1.0.0-rc.3
```

```sh
pnpm add @noxify/casl-drizzle @casl/ability drizzle-orm@1.0.0-rc.3
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

  // Many-to-many filtering (example: users by groups)
  can("read", "users", { groups: some(sql`name = 'Admins'`) })

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
const users = await db.query.users.findMany({ where: filters.users })
```

## Behavior Notes

### `every()` - All Related Records Must Match

`every()` filters records where **all related records** satisfy the condition. Important: it currently requires that related records exist:

```typescript
// ✅ Returns users who have AT LEAST ONE post, and ALL their posts have views > 100
can("read", "users", {
  posts: every({ views: { gt: 100 } }),
})

// ❌ Returns no users if they have NO posts at all
// (even though "all zero posts have >100 views" is technically true)
```

Use when you need to enforce a condition across all related records that exist. For "users with no posts" scenarios, use `none()` instead.

### `none()` - No Related Records Match

`none()` filters records where **no related records** satisfy the condition. Works reliably for simple cases but may behave unexpectedly in complex relation chains.

**✅ Simple case (recommended):**

```typescript
can("read", "posts", { comments: none() })
```

**⚠️ Complex paths - Known Issue:**
When filtering through nested relations, `none()` semantics can be inverted:

```typescript
// ❌ Behavior may be unexpected:
can("read", "posts", {
  comments: none({ author: { id: adminId } }),
})
```

**✅ Solution - Use Drizzle's type-safe subquery:**

```typescript
import { notExists, eq, and } from "drizzle-orm"

can("read", "posts", {
  RAW: notExists(
    db
      .select()
      .from(comments)
      .where(and(eq(comments.postId, posts.id), eq(comments.authorId, adminId)))
  ),
})
```

⚠️ **Current limitation**: Due to Drizzle's alias handling in subqueries, both `notExists()` and raw SQL with outer table references currently fail. For now, the most reliable approach is to avoid complex `none()` filters and use simpler patterns or application-level filtering for edge cases.

**For simple cases without outer table references:**

```typescript
// This works: Simple static condition without referencing outer table
can("read", "users", {
  posts: none(), // All users with no posts
})
```

For critical authorization rules involving complex relation filters, always use explicit `RAW` SQL to ensure predictable behavior.

## Acknowledgements

This project was heavily inspired by [ucastle](https://github.com/araujogui/ucastle) by Guilherme Araujo and evolved through substantial refactoring and extension for Drizzle relation support.

If you are looking for the original foundation and ideas, please also check the ucastle repository.
