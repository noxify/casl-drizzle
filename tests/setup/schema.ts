import { defineRelations } from "drizzle-orm"
import * as p from "drizzle-orm/pg-core"

export const simpleTable = p.pgTable("simple_table", {
  id: p.integer().primaryKey(),
  name: p.text().notNull(),
  note: p.text(),
  tags: p.text().array().notNull(),
  nums: p.integer().array().notNull(),
})

export const users = p.pgTable("users", {
  id: p.integer().primaryKey(),
  name: p.text().notNull(),
})
export const posts = p.pgTable(
  "posts",
  {
    id: p.integer().primaryKey(),
    content: p.text().notNull(),
    authorId: p.integer("author_id"),
  },
  (t) => [p.index("posts_author_id_idx").on(t.authorId)],
)

export const comments = p.pgTable("comments", {
  id: p.integer().primaryKey(),
  text: p.text(),
  authorId: p.integer("author_id"),
  postId: p.integer("post_id"),
})

export const groups = p.pgTable("groups", {
  id: p.integer().primaryKey(),
  name: p.text(),
})
export const usersToGroups = p.pgTable(
  "users_to_groups",
  {
    userId: p
      .integer("user_id")
      .notNull()
      .references(() => users.id),
    groupId: p
      .integer("group_id")
      .notNull()
      .references(() => groups.id),
  },
  (t) => [
    p.primaryKey({ columns: [t.userId, t.groupId] }),
    p.index("users_to_groups_user_id_idx").on(t.userId),
    p.index("users_to_groups_group_id_idx").on(t.groupId),
    p.index("users_to_groups_composite_idx").on(t.userId, t.groupId),
  ],
)

export const relations = defineRelations(
  { simpleTable, users, posts, comments, groups, usersToGroups },
  (r) => ({
    posts: {
      author: r.one.users({
        from: r.posts.authorId,
        to: r.users.id,
      }),
      comments: r.many.comments(),
    },
    users: {
      posts: r.many.posts(),
      groups: r.many.groups({
        from: r.users.id.through(r.usersToGroups.userId),
        to: r.groups.id.through(r.usersToGroups.groupId),
      }),
    },
    groups: {
      participants: r.many.users(),
    },
    comments: {
      post: r.one.posts({
        from: r.comments.postId,
        to: r.posts.id,
      }),
    },
  }),
)

export const schema = { users, posts, comments, groups, usersToGroups, simpleTable }
