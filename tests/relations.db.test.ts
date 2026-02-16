import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { QueryInput } from "../src"
import type { relations } from "./setup/schema"
import { accessibleBy, createDrizzleAbility } from "../src"
import { createDb, resetDb } from "./setup"
import { schema } from "./setup/schema"

/**
 * NOTE: Drizzle RQB v2 Beta 15 does NOT support one-to-many/many-to-many relation operators
 * like "some", "every", "none" in the where clause.
 *
 * Supported: one-to-one relations (e.g., { author: { name: "Alice" } })
 * Not supported yet: { posts: { some: { id: 1 } } }, { comments: { every: {...} } }
 *
 * These operators are implemented in the parser for future Drizzle versions.
 * For now, tests only cover one-to-one relations and field-level operators.
 */
describe("Relations (DB)", () => {
  let db: Awaited<ReturnType<typeof createDb>>

  beforeAll(async () => {
    db = await createDb()
  })

  beforeEach(async () => {
    await resetDb(db)

    // Insert seed data once for all tests
    await db.insert(schema.users).values([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ])

    await db.insert(schema.posts).values([
      { id: 1, content: "Alice first post", authorId: 1 },
      { id: 2, content: "Alice second post", authorId: 1 },
      { id: 3, content: "Bob post", authorId: 2 },
      { id: 4, content: "Charlie post", authorId: 3 },
      { id: 5, content: "Post without author", authorId: null },
    ])

    await db.insert(schema.comments).values([
      { id: 1, text: "Comment on Alice first", authorId: 2, postId: 1 },
      { id: 2, text: "Another comment", authorId: 3, postId: 1 },
      { id: 3, text: "Bob self-comment", authorId: 2, postId: 3 },
    ])
  })

  type AllowedAction = "read" | "create" | "update" | "delete"

  interface SubjectMap {
    posts: QueryInput<typeof relations, "posts">
    users: QueryInput<typeof relations, "users">
    comments: QueryInput<typeof relations, "comments">
  }

  const queryFor = async <S extends keyof SubjectMap & keyof typeof db.query>(
    conditions: SubjectMap[S],
    subject: S,
  ): Promise<number[]> => {
    const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
      can("read", subject, conditions)
    })

    const filters = accessibleBy(ability, "read")

    // @ts-expect-error - WhereInput from CASL is generic, Drizzle expects table-specific type
    const results = await db.query[subject].findMany({
      where: filters[subject],
    })

    // @ts-expect-error - Drizzle's BuildQueryResult type is complex, but runtime all tables have id
    return results.map((r: { id: number }) => r.id).sort((a, b) => a - b)
  }

  const cases = [
    {
      name: "posts with author Alice",
      conditions: { author: { name: "Alice" } } as SubjectMap["posts"],
      subject: "posts" as const,
      expected: [1, 2],
    },
    {
      name: "posts with author Bob",
      conditions: { author: { name: "Bob" } } as SubjectMap["posts"],
      subject: "posts" as const,
      expected: [3],
    },
    {
      name: "posts where author.id > 1",
      conditions: { author: { id: { gt: 1 } } } as SubjectMap["posts"],
      subject: "posts" as const,
      expected: [3, 4],
    },
    {
      name: "comments with post content like Alice%",
      conditions: { post: { content: { like: "Alice%" } } } as SubjectMap["comments"],
      subject: "comments" as const,
      expected: [1, 2],
    },
    {
      name: "posts by Alice with id = 1",
      conditions: { author: { name: "Alice" }, id: 1 } as SubjectMap["posts"],
      subject: "posts" as const,
      expected: [1],
    },
    {
      name: "comments where post.author.name = Bob (nested one-to-one)",
      conditions: { post: { author: { name: "Bob" } } } as SubjectMap["comments"],
      subject: "comments" as const,
      expected: [3],
    },
  ] as const

  cases.forEach(({ name, conditions, subject, expected }) => {
    it(`should filter with ${name}`, async () => {
      const result = await queryFor(conditions, subject)
      expect(result).toEqual(expected)
    })
  })
})
