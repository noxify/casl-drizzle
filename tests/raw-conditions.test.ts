import { sql } from "drizzle-orm"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { QueryInput } from "../src"
import type { relations } from "./setup/schema"
import { accessibleBy, createDrizzleAbility } from "../src"
import { createDb, resetDb } from "./setup"
import { schema } from "./setup/schema"

describe("RAW SQL conditions and relation helpers", () => {
  let db: Awaited<ReturnType<typeof createDb>>

  beforeAll(async () => {
    db = await createDb()
  })

  beforeEach(async () => {
    await resetDb(db)
  })

  it("should support RAW SQL conditions in abilities", async () => {
        await db.insert(schema.users).values([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
          { id: 3, name: "Charlie" },
        ])

    type AllowedAction = "read" | "create" | "update" | "delete"

    interface SubjectMap {
      users: QueryInput<typeof relations, "users">
    }

    // Define ability with RAW SQL condition using inline function
    const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
      // Can read users with odd IDs using RAW SQL - function gets evaluated by Drizzle
      can("read", "users", {
        RAW: (table, { sql }) => sql`${table.id} % 2 = 1`,
      })
    })

    const filters = accessibleBy(ability, "read")

    const results = await db.query.users.findMany({
      where: filters.users,
    })

    // Should return users with odd IDs (1, 3)
    const ids = results.map((r: { id: number }) => r.id).sort((a, b) => a - b)
    expect(ids).toEqual([1, 3])
  })

  it("should support RAW SQL with parameters", async () => {
        await db.insert(schema.users).values([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
          { id: 3, name: "Charlie" },
        ])

    type AllowedAction = "read"

    interface SubjectMap {
      users: QueryInput<typeof relations, "users">
    }

    const searchValue = "Alice"

    const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
      // Can read specific user by RAW SQL with parameter
      can("read", "users", {
        RAW: sql`name = ${searchValue}`,
      })
    })

    const filters = accessibleBy(ability, "read")

    const results = await db.query.users.findMany({
      where: filters.users,
    })

    expect(results).toHaveLength(1)
    expect(results[0]?.name).toBe("Alice")
  })

  it("should support RAW SQL with helper functions (some)", async () => {
        await db.insert(schema.users).values([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ])

        await db.insert(schema.posts).values([
          { id: 1, content: "Post by Alice", authorId: 1 },
          { id: 2, content: "Post by Bob", authorId: 2 },
          { id: 3, content: "Another by Alice", authorId: 1 },
        ])

    type AllowedAction = "read"

    interface SubjectMap {
      documents: QueryInput<typeof relations, "posts">
    }

    const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
      // Can read posts using helper
      can("read", "documents", {
        author: { name: "Alice" },
      })
    })

    const filters = accessibleBy(ability, "read")

    const results = await db.query.posts.findMany({
      where: filters.documents,
    })

    const ids = results.map((r: { id: number }) => r.id).sort((a, b) => a - b)
    expect(ids).toEqual([1, 3])
  })

  it("should combine RAW conditions with normal conditions using AND", async () => {
        await db.insert(schema.users).values([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
          { id: 3, name: "Charlie" },
        ])

    type AllowedAction = "read"

    interface SubjectMap {
      users: QueryInput<typeof relations, "users">
    }

    const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
      // Combine RAW SQL with normal field operator
      can("read", "users", {
        AND: [
          { RAW: sql`id > 1` }, // RAW condition
          { name: { ne: "Bob" } }, // Normal operator
        ],
      })
    })

    const filters = accessibleBy(ability, "read")

    const results = await db.query.users.findMany({
      where: filters.users,
    })

    // Should return Charlie (id > 1 AND name != 'Bob')
    expect(results).toHaveLength(1)
    expect(results[0]?.name).toBe("Charlie")
  })

  it("should support RAW in OR compounds", async () => {
        await db.insert(schema.users).values([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
          { id: 3, name: "Charlie" },
        ])

    type AllowedAction = "read"

    interface SubjectMap {
      users: QueryInput<typeof relations, "users">
    }

    const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
      can("read", "users", {
        OR: [{ RAW: sql`id = 1` }, { name: "Charlie" }],
      })
    })

    const filters = accessibleBy(ability, "read")

    const results = await db.query.users.findMany({
      where: filters.users,
    })

    const ids = results.map((r: { id: number }) => r.id).sort((a, b) => a - b)
    expect(ids).toEqual([1, 3])
  })
})
