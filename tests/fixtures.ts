import { defineRelations } from "drizzle-orm"
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core"

// ============================================================================
// SCHEMA WITHOUT RELATIONS - Simple Setup
// ============================================================================

export const simpleUsers = pgTable("simple_users", {
  id: integer().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
})

export const simpleArticles = pgTable("simple_articles", {
  id: integer().primaryKey(),
  title: text().notNull(),
  content: text().notNull(),
})

export const simpleSchema = { users: simpleUsers, articles: simpleArticles } as const

// ============================================================================
// SCHEMA WITH RELATIONS - Advanced Setup
// ============================================================================

export const users = pgTable("users", {
  id: integer().primaryKey(),
  name: text().notNull(),
  age: integer().notNull(),
  role: text().notNull(), // 'admin', 'user', 'moderator'
})

export const posts = pgTable("posts", {
  id: integer().primaryKey(),
  title: text().notNull(),
  content: text(),
  published: boolean().notNull().default(false),
  authorId: integer("author_id").notNull(),
})

export const comments = pgTable("comments", {
  id: integer().primaryKey(),
  content: text().notNull(),
  postId: integer("post_id").notNull(),
  authorId: integer("author_id").notNull(),
})

export const schemaWithRelations = { users, posts, comments } as const

export const relations = defineRelations({ users, posts, comments }, (r) => ({
  users: {
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.authorId,
    }),
    comments: r.many.comments({
      from: r.users.id,
      to: r.comments.authorId,
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
    post: r.one.posts({
      from: r.comments.postId,
      to: r.posts.id,
    }),
    author: r.one.users({
      from: r.comments.authorId,
      to: r.users.id,
    }),
  },
}))
