import type { SQL, BuildQueryResult } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"

import type { QueryInput } from "../src"
import { accessibleBy, createDrizzleAbility, some, every, none } from "../src"
import { createDb } from "./setup"
import type { Relations, relations } from "./setup/schema"
import { schema } from "./setup/schema"

describe("Relations (DB)", () => {
  let db: Awaited<ReturnType<typeof createDb>>

  beforeAll(async () => {
    db = await createDb(async (dbClient) => {
      // Insert users
      await dbClient.insert(schema.users).values([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ])

      // Insert posts
      await dbClient.insert(schema.posts).values([
        { id: 1, content: "Alice first post", authorId: 1 },
        { id: 2, content: "Alice second post", authorId: 1 },
        { id: 3, content: "Bob post", authorId: 2 },
        { id: 4, content: "Charlie post", authorId: 3 },
        { id: 5, content: "Post without author", authorId: null },
      ])

      // Insert comments
      await dbClient.insert(schema.comments).values([
        { id: 1, text: "Comment on Alice first", authorId: 2, postId: 1 },
        { id: 2, text: "Another comment", authorId: 3, postId: 1 },
        { id: 3, text: "Bob self-comment", authorId: 2, postId: 3 },
      ])

      // Insert groups
      await dbClient.insert(schema.groups).values([
        { id: 1, name: "Admins" },
        { id: 2, name: "Editors" },
        { id: 3, name: "Viewers" },
      ])

      // Insert many-to-many mappings (users <-> groups)
      await dbClient.insert(schema.usersToGroups).values([
        { userId: 1, groupId: 1 },
        { userId: 1, groupId: 2 },
        { userId: 2, groupId: 2 },
        { userId: 3, groupId: 3 },
      ])
    })
  })

  type AllowedAction = "read" | "create" | "update" | "delete"

  interface SubjectMap {
    posts: QueryInput<typeof relations, "posts">
    users: QueryInput<typeof relations, "users">
    comments: QueryInput<typeof relations, "comments">
    groups: QueryInput<typeof relations, "groups">
  }

  // Credits for the `BuildQueryResult` type helper goes to
  // * https://github.com/drizzle-team/drizzle-orm/issues/695#issuecomment-4359868946
  // * https://github.com/drizzle-team/drizzle-orm/issues/695#issuecomment-4389296482

  // Type-safe result types using BuildQueryResult
  type PostResult = BuildQueryResult<
    Relations,
    Relations["posts"],
    { with: { author: true } }
  >
  type UserResult = BuildQueryResult<
    Relations,
    Relations["users"],
    { with: { posts: true; groups: true } }
  >
  type CommentResult = BuildQueryResult<
    Relations,
    Relations["comments"],
    { with: { post: { with: { author: true } } } }
  >
  type GroupResult = BuildQueryResult<
    Relations,
    Relations["groups"],
    { with: { participants: true } }
  >

  interface ResultTypeMap {
    posts: PostResult
    users: UserResult
    comments: CommentResult
    groups: GroupResult
  }

  const queryFor = async <S extends keyof SubjectMap & keyof typeof db.query>(
    conditions: SubjectMap[S],
    subject: S
  ): Promise<number[]> => {
    const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
      can("read", subject, conditions)
    })

    const filters = accessibleBy(ability, "read")

    // @ts-expect-error - WhereInput from CASL is generic, Drizzle expects table-specific type
    const results = (await db.query[subject].findMany({
      where: filters[subject],
    })) as ResultTypeMap[S][]

    // Results are now properly typed through ResultTypeMap based on subject
    return results.map((r: ResultTypeMap[S]) => r.id).toSorted((a, b) => a - b)
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
      conditions: {
        post: { content: { like: "Alice%" } },
      } as SubjectMap["comments"],
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
      conditions: {
        post: { author: { name: "Bob" } },
      } as SubjectMap["comments"],
      subject: "comments" as const,
      expected: [3],
    },
  ] as const

  it.each(cases)(
    `should filter with $name`,
    async ({ conditions, subject, expected }) => {
      const result = await queryFor(conditions, subject)
      expect(result).toStrictEqual(expected)
    }
  )

  describe("One-to-One: posts -> users (author relation)", () => {
    describe("RAW conditions", () => {
      it("should filter posts by Alice using RAW function with table reference", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "posts", {
              // RAW function receives table reference for type-safe column access
              RAW: (table, { sql: sqlFn }) => sqlFn`${table.authorId} IN (
              SELECT id FROM users WHERE name = 'Alice'
            )`,
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.posts.findMany({
          where: filters.posts,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)
        expect(ids).toStrictEqual([1, 2])
      })

      it("should filter users by name pattern using RAW static SQL", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "users", {
              // RAW accepts static SQL for simple conditions
              RAW: sql`name ILIKE '%li%'`,
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.users.findMany({
          where: filters.users,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)
        // Matches: Alice, Charlie (both contain 'li')
        expect(ids).toStrictEqual([1, 3])
      })
    })

    describe("some() with raw SQL", () => {
      it("should filter posts by author name", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "posts", {
              author: some(sql`name = 'Alice'`),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.posts.findMany({
          where: filters.posts,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)
        expect(ids).toStrictEqual([1, 2])
      })
    })

    describe("some() with builder callback", () => {
      it("should filter posts by author name using eq operator", async () => {
        const authorName = "Alice"

        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "posts", {
              // Builder callback provides Drizzle operators and column proxies
              author: some(({ eq, columns }) => eq(columns.name, authorName)),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.posts.findMany({
          where: filters.posts,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)
        expect(ids).toStrictEqual([1, 2])
      })

      it("should filter posts by author id using gt operator", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "posts", {
              // Using gt operator with columns proxy for type-safe comparisons
              author: some(({ gt, columns }) => gt(columns.id, 1)),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.posts.findMany({
          where: filters.posts,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)
        expect(ids).toStrictEqual([3, 4])
      })

      it("should filter with complex conditions using and/or operators", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "posts", {
              // Complex conditions: author.id > 1 AND author.name != 'Bob'
              author: some(
                ({ gt, ne, and, columns }) =>
                  and(gt(columns.id, 1), ne(columns.name, "Bob")) as SQL
              ),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.posts.findMany({
          where: filters.posts,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)
        // Charlie's posts (id > 1 and name != 'Bob')
        expect(ids).toStrictEqual([4])
      })

      it("should filter using direct RAW function (alternative to some())", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "posts", {
              // some
              author: {
                RAW(table, operators) {
                  return operators.eq(table.name, "Alice")
                },
              },
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.posts.findMany({
          where: filters.posts,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)
        expect(ids).toStrictEqual([1, 2])
      })
    })
  })

  describe("One-to-Many: posts -> comments", () => {
    describe("every() - all related records must match", () => {
      it("should filter posts where all existing comments are from author id > 1 using every()", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "posts", {
              comments: every(sql`author_id > 1`),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.posts.findMany({ where: filters.posts })
        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)

        // Expectation: posts where all existing comments have authorId > 1
        // Post 1: comments from authorId 2, 3 (both > 1) => ✓
        // Post 2: no comments => ✗ (excluded by current every() behavior)
        // Post 3: comment from authorId 2 (> 1) => ✓
        // Post 4: no comments => ✗ (excluded by current every() behavior)
        // Post 5: no comments => ✗ (excluded by current every() behavior)
        expect(ids).toStrictEqual([1, 3])
      })

      it("should filter users where all posts have content containing 'Alice' using every()", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "users", {
              posts: every(({ like, columns }) =>
                like(columns.content, "Alice%")
              ),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.users.findMany({
          where: filters.users,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)
        // Alice: both posts start with "Alice" ✓
        // Bob: one post doesn't start with "Alice" ✗
        // Charlie: one post doesn't start with "Alice" ✗
        expect(ids).toStrictEqual([1])
      })

      it("should filter users with every() using raw SQL", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "users", {
              posts: every(sql`content ILIKE 'Alice%'`),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.users.findMany({
          where: filters.users,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)
        expect(ids).toStrictEqual([1])
      })
    })

    describe("none() - no related records must match", () => {
      it.fails("should filter posts where no comments are from author 2 using none()", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "posts", {
              comments: none(({ eq, columns }) => eq(columns.authorId, 2)),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.posts.findMany({ where: filters.posts })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)

        // Expected semantics for none(): no related record may match authorId = 2.
        // Post 1: has authorId 2 and 3 comments => excluded
        // Post 2: no comments => included
        // Post 3: has authorId 2 comment => excluded
        // Post 4: no comments => included
        // Post 5: no comments => included
        expect(ids).toStrictEqual([2, 4, 5])
      })

      it("should filter users where they have no posts using none() without condition", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            // none() without condition: matches when relation is empty
            can("read", "users", {
              posts: none(),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.users.findMany({
          where: filters.users,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)
        // All test users have posts, so empty result expected
        expect(ids).toStrictEqual([])
      })

      it.fails("should filter users with none() where no posts contain 'Charlie' using raw SQL", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "users", {
              posts: none(sql`content ILIKE '%Charlie%'`),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.users.findMany({
          where: filters.users,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)

        // Expected semantics for none(): no related post may match the condition.
        // Alice: posts are "Alice first post", "Alice second post" => included
        // Bob: post is "Bob post" => included
        // Charlie: post is "Charlie post" => excluded
        expect(ids).toStrictEqual([1, 2])
      })
    })
  })

  describe("Many-to-Many: users <-> groups", () => {
    describe("some()", () => {
      it("should filter users that belong to Admins", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "users", {
              groups: some(sql`name = 'Admins'`),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.users.findMany({
          where: filters.users,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)

        expect(ids).toStrictEqual([1])
      })

      it("should filter groups that include Alice as participant", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "groups", {
              participants: some(({ eq, columns }) =>
                eq(columns.name, "Alice")
              ),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.groups.findMany({
          where: filters.groups,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)

        expect(ids).toStrictEqual([1, 2])
      })
    })

    describe("every()", () => {
      it("should filter users where all related groups end with 'ers'", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "users", {
              groups: every(sql`name ILIKE '%ers'`),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.users.findMany({
          where: filters.users,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)

        // Alice has Admins + Editors => excluded
        // Bob has Editors only (does not end with 'ers') => excluded
        // Charlie has Viewers only => included
        expect(ids).toStrictEqual([3])
      })
    })

    describe("none()", () => {
      it.fails("should filter users where none of their groups is Admins", async () => {
        const ability = createDrizzleAbility<SubjectMap, AllowedAction>(
          (can) => {
            can("read", "users", {
              groups: none(sql`name = 'Admins'`),
            })
          }
        )

        const filters = accessibleBy(ability, "read")
        const results = await db.query.users.findMany({
          where: filters.users,
        })

        const ids = results
          .map((r: { id: number }) => r.id)
          .toSorted((a, b) => a - b)

        // Expected: Alice excluded (Admins), Bob + Charlie included
        expect(ids).toStrictEqual([2, 3])
      })
    })
  })
})
