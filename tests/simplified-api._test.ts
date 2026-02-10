import { subject } from "@casl/ability"
import { describe, expect, it } from "vitest"

import type { QueryInput, RelationalQueryInput } from "../src"
import type { relations, simpleSchema } from "./fixtures"
import { defineAbility } from "../src"

describe("Simplified API (CASL-Prisma style)", () => {
  describe("defineAbility() for subject-specific autocomplete", () => {
    it("should provide subject-specific field autocomplete", () => {
      // Extract tables from schema
      type Tables = typeof simpleSchema

      // Define query types for each table
      type UserQuery = QueryInput<Tables, "users">
      type ArticleQuery = QueryInput<Tables, "articles">

      // Create subject mapping
      interface SubjectMap {
        users: UserQuery
        articles: ArticleQuery
      }

      // Use defineAbility for subject-specific autocomplete
      const ability = defineAbility<SubjectMap>((can, cannot) => {
        // ✅ Now "id" only shows user fields in autocomplete!
        can("read", "users", { id: 1 })
        can("create", "articles")
        // ✅ And "title" only shows article fields in autocomplete!
        cannot("delete", "articles", { title: "important" })
      })

      expect(ability.can("read", "users")).toBe(true)
      expect(ability.can("create", "articles")).toBe(true)
      expect(
        ability.cannot("delete", subject("articles", { id: 1, title: "important", content: "" })),
      ).toBe(true)
    })
  })

  describe("Without Relations", () => {
    it("should work with QueryInput for simple tables", () => {
      // Extract tables from schema
      type Tables = typeof simpleSchema

      // Define query types for each table
      type UserQuery = QueryInput<Tables, "users">
      type ArticleQuery = QueryInput<Tables, "articles">

      // Create subject mapping
      interface SubjectMap {
        users: UserQuery
        articles: ArticleQuery
      }

      // Use defineAbility for better type inference
      const ability = defineAbility<SubjectMap>((can, cannot) => {
        can("read", "users", { id: 1 })
        can("create", "articles")
        cannot("delete", "articles", { title: "important" })
      })

      expect(ability.can("read", "users")).toBe(true)
      expect(ability.can("create", "articles")).toBe(true)
      expect(
        ability.cannot("delete", subject("articles", { id: 1, title: "important", content: "" })),
      ).toBe(true)
    })

    it("should provide field autocomplete for QueryInput", () => {
      type Tables = typeof simpleSchema
      type UserQuery = QueryInput<Tables, "users">

      // These should compile with correct field types
      const validUserQuery: UserQuery = {
        id: 1,
        name: "John",
        email: "john@example.com",
      }

      const withOperators: UserQuery = {
        id: { gte: 1 },
        AND: [{ name: "John" }],
      }

      expect(validUserQuery).toBeDefined()
      expect(withOperators).toBeDefined()
    })
  })

  describe("With Relations", () => {
    it("should work with RelationalQueryInput for relational tables", () => {
      // Define query types with relation support
      type UserQuery = RelationalQueryInput<typeof relations, "users">
      type PostQuery = RelationalQueryInput<typeof relations, "posts">
      type CommentQuery = RelationalQueryInput<typeof relations, "comments">

      // Create subject mapping
      interface SubjectMap {
        users: UserQuery
        posts: PostQuery
        comments: CommentQuery
      }

      // Use defineAbility for relational queries
      const ability = defineAbility<SubjectMap>((can, cannot) => {
        can("read", "posts", { published: true })
        can("update", "posts", { authorId: 1 })
        cannot("delete", "comments")
      })

      expect(ability.can("read", "posts")).toBe(true)
      expect(ability.can("update", "posts")).toBe(true)
      expect(ability.cannot("delete", "comments")).toBe(true)
    })

    it("should provide relation fields in RelationalQueryInput", () => {
      type PostQuery = RelationalQueryInput<typeof relations, "posts">

      // Should compile with field conditions
      const basicQuery: PostQuery = {
        published: true,
        authorId: 1,
      }

      // Should compile with operators
      const withOperators: PostQuery = {
        id: { gte: 1 },
        published: { eq: true },
      }

      // Should support compound conditions
      const withCompound: PostQuery = {
        OR: [{ published: true }, { authorId: 1 }],
      }

      expect(basicQuery).toBeDefined()
      expect(withOperators).toBeDefined()
      expect(withCompound).toBeDefined()
    })
  })

  describe("Mixed Setup", () => {
    it("should allow mixing QueryInput and RelationalQueryInput", () => {
      // Some tables with relations
      type PostQuery = RelationalQueryInput<typeof relations, "posts">

      // Some tables without relations (from a different schema)
      type Tables = typeof simpleSchema
      type ArticleQuery = QueryInput<Tables, "articles">

      // Mix them in one subject mapping
      interface SubjectMap {
        posts: PostQuery
        articles: ArticleQuery
      }

      // Use defineAbility for mixed setup
      const ability = defineAbility<SubjectMap>((can) => {
        can("read", "posts", { published: true })
        can("read", "articles", { title: "public" })
      })

      expect(ability.can("read", "posts")).toBe(true)
      expect(ability.can("read", "articles")).toBe(true)
    })
  })
})
