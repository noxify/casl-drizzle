import type { hkt, PureAbility } from "@casl/ability"
import type { DBQueryConfig, SchemaEntry, TablesRelationalConfig } from "drizzle-orm/relations"
import type { KnownKeysOnly } from "drizzle-orm/utils"

import type { Model } from "./drizzle-query"

// Internal: Used by CASL's HKT system
export interface BaseDrizzleQuery {
  [ɵdrizzleTypes]?: Record<string, unknown>
}

export declare const ɵdrizzleTypes: unique symbol

// Internal: Used by DrizzleQueryFactory for CASL ability creation
export type DrizzleQueryFactory = Record<string, unknown> &
  hkt.Container<hkt.GenericFactory> &
  BaseDrizzleQuery

// Internal: Used by DrizzleQueryFactory
export type DrizzleModel = Model<Record<string, unknown>, string>

// Internal: Return type of accessibleBy (users get this via inference)
export type WhereInput = Record<string, unknown>

// === PUBLIC API ===

/**
 * Utility type to recursively remove the RAW property from Drizzle query types.
 * RAW is used internally by Drizzle for SQL functions but shouldn't be exposed in our API.
 */
type OmitRaw<T> = T extends object
  ? {
      [K in keyof T as K extends "RAW" ? never : K]: T[K] extends object
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          T[K] extends any[]
          ? OmitRaw<T[K][number]>[]
          : OmitRaw<T[K]>
        : T[K]
    }
  : T

/**
 * Query input for tables WITH relations.
 * Extracts the complete where type including relation filters from Drizzle's DBQueryConfig.
 *
 * @example
 * ```ts
 * import { defineRelations } from "drizzle-orm"
 * import type { RelationalQueryInput } from "ucastle"
 *
 * const relations = defineRelations({ users, posts }, ...)
 * type UserQuery = RelationalQueryInput<typeof relations, "users">
 *
 * // Now includes: field conditions + relation filters + AND/OR/NOT
 * ```
 */
export type RelationalQueryInput<
  TSchema extends TablesRelationalConfig,
  TTableName extends keyof TSchema,
> = OmitRaw<
  Exclude<
    KnownKeysOnly<
      DBQueryConfig<"many", TSchema, TSchema[TTableName]>,
      DBQueryConfig<"many", TSchema, TSchema[TTableName]>
    >["where"],
    undefined
  >
>

/**
 * Query input for tables WITHOUT relations.
 * Supports both field conditions and compound operators (AND/OR/NOT) at root level.
 *
 * @example
 * ```ts
 * import type { QueryInput } from "ucastle"
 *
 * const schema = { users, posts }
 * type UserQuery = QueryInput<typeof schema, "users">
 *
 * // Field conditions
 * const q1: UserQuery = { id: 1, name: "John" }
 *
 * // With operators
 * const q2: UserQuery = { id: { gte: 1 }, AND: [{ name: "John" }] }
 *
 * // Compound operators
 * const q3: UserQuery = { OR: [{ age: 18 }, { role: "admin" }] }
 * ```
 */
export type QueryInput<
  TSchema extends Record<string, SchemaEntry>,
  TTableName extends keyof TSchema,
> = OmitRaw<
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in keyof (TSchema[TTableName] extends { $inferSelect: infer S } ? S : never)]?: any
  } & {
    AND?: QueryInput<TSchema, TTableName>[]
    OR?: QueryInput<TSchema, TTableName>[]
    NOT?: QueryInput<TSchema, TTableName>
  }
>

/**
 * Helper type to create CASL subjects from a mapping of table names to query types.
 * Similar to @casl/prisma's Subjects pattern.
 *
 * @example
 * ```ts
 * import { PureAbility } from "@casl/ability"
 * import type { RelationalQueryInput, Subjects } from "ucastle"
 *
 * type UserQuery = RelationalQueryInput<typeof relations, "users">
 * type PostQuery = RelationalQueryInput<typeof relations, "posts">
 *
 * type AppAbility = PureAbility<[string, Subjects<{
 *   users: UserQuery,
 *   posts: PostQuery
 * }>]>
 * ```
 */
export type Subjects<T> =
  | {
      [K in keyof T]: Model<T[K], K & string>
    }[keyof T]
  | Extract<keyof T, string>

/**
 * Custom Ability type with subject-specific conditions.
 * Similar to @casl/prisma's PrismaAbility.
 *
 * This type ensures that conditions are properly typed based on the subject mapping.
 *
 * @example
 * ```ts
 * import type { DrizzleAbility } from "ucastle"
 *
 * type SubjectMap = {
 *   users: UserQuery
 *   posts: PostQuery
 * }
 *
 * type AppAbility = DrizzleAbility<SubjectMap>
 * ```
 */
export type DrizzleAbility<T> = PureAbility<[string, Subjects<T>], T[keyof T]>

/**
 * Helper type to create a fully-typed DrizzleAbility from a subject mapping.
 * Provides subject-specific autocomplete in `can()` and `cannot()` methods
 * when used with `defineAbility()`.
 * Works with both `type` and `interface`.
 *
 * @example
 * ```ts
 * import { defineAbility, type DefineAbility } from "ucastle"
 *
 * // Works with type
 * type SubjectMap = {
 *   users: UserQuery
 *   posts: PostQuery
 * }
 *
 * // Also works with interface
 * interface SubjectMap {
 *   users: UserQuery
 *   posts: PostQuery
 * }
 *
 * // Use with defineAbility for subject-specific autocomplete:
 * const ability = defineAbility<SubjectMap>((can, cannot) => {
 *   can("read", "users", { id: 1 }) // ✅ Only user fields!
 *   can("read", "posts", { authorId: 1 }) // ✅ Only post fields!
 * })
 * ```
 */
export type DefineAbility<T> = DrizzleAbility<T>
