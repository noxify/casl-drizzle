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
  })

  it("should filter with one-to-one relation queries", async () => {
    // Insert users
    await db.insert(schema.users).values([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ])

    // Insert posts
    await db.insert(schema.posts).values([
      { id: 1, content: "Alice first post", authorId: 1 },
      { id: 2, content: "Alice second post", authorId: 1 },
      { id: 3, content: "Bob post", authorId: 2 },
      { id: 4, content: "Charlie post", authorId: 3 },
      { id: 5, content: "Post without author", authorId: null },
    ])

    // Insert comments
    await db.insert(schema.comments).values([
      { id: 1, text: "Comment on Alice first", authorId: 2, postId: 1 },
      { id: 2, text: "Another comment", authorId: 3, postId: 1 },
      { id: 3, text: "Bob self-comment", authorId: 2, postId: 3 },
    ])

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

    // one-to-one relation: posts with specific author
    expect(await queryFor({ author: { name: "Alice" } }, "posts")).toEqual([1, 2])
    expect(await queryFor({ author: { name: "Bob" } }, "posts")).toEqual([3])

    // one-to-one relation: posts where author.id > 1
    expect(await queryFor({ author: { id: { gt: 1 } } }, "posts")).toEqual([3, 4])

    // one-to-one relation: comments with specific post content
    expect(await queryFor({ post: { content: { like: "Alice%" } } }, "comments")).toEqual([1, 2])

    // Combined: posts by Alice with id = 1
    expect(
      await queryFor(
        {
          author: { name: "Alice" },
          id: 1,
        },
        "posts",
      ),
    ).toEqual([1])

    // Nested one-to-one: comments where post.author.name = "Bob"
    // (comments → post → author)
    expect(await queryFor({ post: { author: { name: "Bob" } } }, "comments")).toEqual([3])
  })
})
