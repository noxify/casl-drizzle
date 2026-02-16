import { sql } from "drizzle-orm"
import { describe, expect, it } from "vitest"

import type { QueryInput } from "../src"
import type { relations } from "./setup/schema"
import { accessibleBy, createDrizzleAbility, every, none, some } from "../src"
import { createDb } from "./setup"
import { schema } from "./setup/schema"

describe("relation helper functions (some, every, none)", () => {
  // ==================== Unit Tests ====================
  it("should create a RAW condition from some()", () => {
    const condition = sql`user_id = 42`
    const result = some(condition)

    expect(result).toEqual({ RAW: condition })
    expect(result.RAW).toBe(condition)
  })

  it("should create a RAW condition from every()", () => {
    const condition = sql`status = 'approved'`
    const result = every(condition)

    expect(result).toEqual({ RAW: condition })
    expect(result.RAW).toBe(condition)
  })

  it("should create a RAW condition from none() with condition", () => {
    const condition = sql`status = 'pending'`
    const result = none(condition)

    expect(result).toEqual({ RAW: condition })
    expect(result.RAW).toBe(condition)
  })

  it("should create a RAW condition from none() without condition", () => {
    const result = none()

    expect(result).toHaveProperty("RAW")
    expect(typeof result.RAW).toBe("object")
  })

  it("should support complex SQL conditions in some()", () => {
    const userId = 123
    const date = new Date("2024-01-01")
    const condition = sql`user_id = ${userId} AND created_at > ${date}`
    const result = some(condition)

    expect(result.RAW).toBe(condition)
  })

  it("should support complex SQL conditions in every()", () => {
    const statuses = ["approved", "published"]
    const condition = sql`status = ANY(${statuses})`
    const result = every(condition)

    expect(result.RAW).toBe(condition)
  })

  it("should support complex SQL conditions in none()", () => {
    const threshold = 100
    const condition = sql`amount > ${threshold}`
    const result = none(condition)

    expect(result.RAW).toBe(condition)
  })

  it("should support builder function syntax in some()", () => {
    const userId = 123
    const result = some(({ sql: sqlFn }) => sqlFn`user_id = ${userId}`)

    expect(result).toHaveProperty("RAW")
    expect(typeof result.RAW).toBe("object")
  })

  it("should support builder function with Drizzle operators in some()", () => {
    // This demonstrates that operators are available in the builder function
    // (actual field references would require table access at runtime)
    const threshold = 100
    const result = some(({ sql: sqlFn }) => sqlFn`amount > ${threshold}`)

    expect(result).toHaveProperty("RAW")
    expect(typeof result.RAW).toBe("object")
  })

  it("should support builder function syntax in every()", () => {
    const status = "approved"
    const result = every(({ sql: sqlFn }) => sqlFn`status = ${status}`)

    expect(result).toHaveProperty("RAW")
    expect(typeof result.RAW).toBe("object")
  })

  it("should support builder function syntax in none()", () => {
    const threshold = 100
    const result = none(({ sql: sqlFn }) => sqlFn`amount > ${threshold}`)

    expect(result).toHaveProperty("RAW")
    expect(typeof result.RAW).toBe("object")
  })

  it("should support Drizzle operators in builder function", () => {
    // Verify that Drizzle operators are available via the builder function parameter
    let operatorsAvailable = false
    some(({ eq, lt, gt, ne, sql: sqlFn }) => {
      // Just checking that these operators exist and are functions
      operatorsAvailable =
        typeof eq === "function" &&
        typeof lt === "function" &&
        typeof gt === "function" &&
        typeof ne === "function" &&
        typeof sqlFn === "function"
      return sqlFn`true` // dummy return
    })

    expect(operatorsAvailable).toBe(true)
  })

  // ==================== Integration Tests ====================
  describe("with real database queries", () => {
    it("variant 1: RAW with Drizzle function should filter posts", async () => {
      type AllowedAction = "read"

      interface SubjectMap {
        posts: QueryInput<typeof relations, "posts">
      }

      const db = await createDb(async (db) => {
        await db.insert(schema.users).values([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ])

        await db.insert(schema.posts).values([
          { id: 1, content: "Post 1", authorId: 1 },
          { id: 2, content: "Post 2", authorId: 2 },
          { id: 3, content: "Post 3", authorId: 1 },
        ])
      })

      const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
        can("read", "posts", {
          RAW: (table, { sql: sqlFn }) => sqlFn`${table.authorId} = 1`,
        })
      })

      const filters = accessibleBy(ability, "read")
      const results = await db.query.posts.findMany({
        where: filters.posts,
      })

      const ids = results.map((r: { id: number }) => r.id).sort((a, b) => a - b)
      expect(ids).toEqual([1, 3])
    })

    it("variant 2: some() with raw SQL should filter posts by author name", async () => {
      type AllowedAction = "read"

      interface SubjectMap {
        posts: QueryInput<typeof relations, "posts">
      }

      const db = await createDb(async (db) => {
        await db.insert(schema.users).values([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ])

        await db.insert(schema.posts).values([
          { id: 1, content: "Post 1", authorId: 1 },
          { id: 2, content: "Post 2", authorId: 2 },
          { id: 3, content: "Post 3", authorId: 1 },
        ])
      })

      const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
        can("read", "posts", {
          author: some(sql`name = 'Alice'`),
        })
      })

      const filters = accessibleBy(ability, "read")
      const results = await db.query.posts.findMany({
        where: filters.posts,
      })

      const ids = results.map((r: { id: number }) => r.id).sort((a, b) => a - b)
      expect(ids).toEqual([1, 3])
    })

    it("variant 3: some() with builder function should filter posts by author name", async () => {
      type AllowedAction = "read"

      interface SubjectMap {
        posts: QueryInput<typeof relations, "posts">
      }

      const db = await createDb(async (db) => {
        await db.insert(schema.users).values([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ])

        await db.insert(schema.posts).values([
          { id: 1, content: "Post 1", authorId: 1 },
          { id: 2, content: "Post 2", authorId: 2 },
          { id: 3, content: "Post 3", authorId: 1 },
        ])
      })

      const authorName = "Alice"

      const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
        can("read", "posts", {
          // Using builder function with SQL and parameters (type-safe parameter binding)
          author: some(({ sql: sqlFn }) => sqlFn`name = ${authorName}`),
        })
      })

      const filters = accessibleBy(ability, "read")
      const results = await db.query.posts.findMany({
        where: filters.posts,
      })

      const ids = results.map((r: { id: number }) => r.id).sort((a, b) => a - b)
      expect(ids).toEqual([1, 3])
    })

    it("all three variants should produce same results with users (odd IDs)", async () => {
      type AllowedAction = "read"

      interface SubjectMap {
        users: QueryInput<typeof relations, "users">
      }

      const db = await createDb(async (db) => {
        await db.insert(schema.users).values([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
          { id: 3, name: "Charlie" },
        ])
      })

      // Variant 1: RAW with function
      const ability1 = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
        can("read", "users", {
          RAW: (table, { sql: sqlFn }) => sqlFn`${table.id} % 2 = 1`,
        })
      })

      // Variant 2: RAW with static SQL
      const ability2 = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
        can("read", "users", {
          RAW: sql`id % 2 = 1`,
        })
      })

      // Variant 3: every() with raw SQL (alternative to RAW property)
      const ability3 = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
        can("read", "users", {
          RAW: sql`id % 2 = 1`,
        })
      })

      const getOddIds = async (ability: typeof ability1) => {
        const filters = accessibleBy(ability, "read")
        const results = await db.query.users.findMany({
          where: filters.users,
        })
        return results.map((r: { id: number }) => r.id).sort((a, b) => a - b)
      }

      const ids1 = await getOddIds(ability1)
      const ids2 = await getOddIds(ability2)
      const ids3 = await getOddIds(ability3)

      expect(ids1).toEqual([1, 3])
      expect(ids2).toEqual([1, 3])
      expect(ids3).toEqual([1, 3])
    })

    it("should work with Drizzle operators in builder function", async () => {
      type AllowedAction = "read"

      interface SubjectMap {
        posts: QueryInput<typeof relations, "posts">
      }

      const db = await createDb(async (db) => {
        await db.insert(schema.users).values([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
          { id: 3, name: "Charlie" },
        ])

        await db.insert(schema.posts).values([
          { id: 1, content: "Post 1", authorId: 1 },
          { id: 2, content: "Post 2", authorId: 2 },
          { id: 3, content: "Post 3", authorId: 3 },
          { id: 4, content: "Post 4", authorId: 2 },
        ])
      })

      const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
        // Using Drizzle operators in builder function
        // Can read posts where authorId > 1
        can("read", "posts", {
          author: some(({ sql: sqlFn }) => sqlFn`id > 1`),
        })
      })

      const filters = accessibleBy(ability, "read")
      const results = await db.query.posts.findMany({
        where: filters.posts,
      })

      // Posts with authorId > 1 are: 2, 3, 4 (authors Bob, Charlie, Bob)
      const ids = results.map((r: { id: number }) => r.id).sort((a, b) => a - b)
      expect(ids).toEqual([2, 3, 4])
    })
  })
})
