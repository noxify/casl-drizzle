import type { hkt, PureAbility } from "@casl/ability"
import type { DBQueryConfig, TablesRelationalConfig } from "drizzle-orm/relations"
import type { KnownKeysOnly } from "drizzle-orm/utils"

import type { Model } from "./drizzle-query"

/**
 * Unique symbol used by CASL's HKT (Higher-Kinded Types) system.
 * This is used internally to mark types that belong to the Drizzle query system.
 * @internal
 */
export declare const ɵdrizzleTypes: unique symbol

/**
 * Internal marker interface for CASL's HKT system.
 * Used to identify types that are part of the Drizzle query system.
 * This enables type-safe composition of abilities with subject-specific conditions.
 * @internal
 */
export interface BaseDrizzleQuery {
  [ɵdrizzleTypes]?: Record<string, unknown>
}

/**
 * Internal factory type used by CASL to create ability instances.
 * Combines a record base with CASL's HKT container interface and the Drizzle marker.
 * Used internally by `createDrizzleAbilityFor()` and `defineAbility()`.
 * @internal
 */
export type DrizzleQueryFactory = Record<string, unknown> &
  hkt.Container<hkt.GenericFactory> &
  BaseDrizzleQuery

/**
 * Internal type representing a Drizzle model for CASL.
 * Used by the query system to enforce type safety for model-based permissions.
 * @internal
 */
export type DrizzleModel = Model<Record<string, unknown>, string>

/**
 * Internal type representing query conditions extracted from a query input.
 * This is the return type of `accessibleBy()` and is used internally by the query interpreter.
 * @internal
 */
export type WhereInput = Record<string, unknown>

/**
 * Typed query input for Drizzle tables with full operator support.
 * Extracts the complete query type from Drizzle's RQB v2, including all field operators
 * (comparison, membership, string, null, relation, and compound operators), nested relations,
 * and raw SQL conditions.
 *
 * @template TSchema - The Drizzle relations configuration object
 * @template TTableName - The key of the table within TSchema
 *
 * @example
 * ```ts
 * import { relations, sql } from "drizzle-orm"
 * import type { QueryInput } from "@noxify/casl-drizzle"
 *
 * const relations = defineRelations({ users, posts }, (r) => ({
 *   users: { posts: r.many(posts) },
 *   posts: { author: r.one(users) }
 * }))
 *
 * type PostQuery = QueryInput<typeof relations, "posts">
 *
 * const ability = defineAbility<{ posts: PostQuery }>((can) => {
 *   can("read", "posts", { published: true })
 *   can("update", "posts", { authorId: 1 })
 *   // Raw SQL for complex conditions
 *   can("delete", "posts", {
 *     RAW: sql`EXISTS (SELECT 1 FROM contributors WHERE post_id = posts.id)`
 *   })
 * })
 * ```
 */
export type QueryInput<
  TSchema extends TablesRelationalConfig,
  TTableName extends keyof TSchema,
> = Exclude<
  KnownKeysOnly<
    DBQueryConfig<"many", TSchema, TSchema[TTableName]>,
    DBQueryConfig<"many", TSchema, TSchema[TTableName]>
  >["where"],
  undefined
> & {
  /**
   * Optional raw SQL condition for complex queries that can't be expressed with field operators.
   * The SQL template literal will be passed directly to Drizzle's where clause.
   *
   * @example
   * ```ts
   * { RAW: sql`${table.age} BETWEEN 25 AND 35` }
   * { RAW: sql`EXISTS (SELECT 1 FROM related WHERE ...)` }
   * ```
   *
   * @warning Ensure the SQL is properly parameterized to prevent SQL injection.
   */
  RAW?: unknown
}

/**
 * Creates a union of all possible CASL subjects from a query type mapping.
 * Each table name becomes a subject, plus model objects for relation-based filtering.
 * Used to define subject-specific abilities with type-safe condition validation.
 *
 * @template T - An object mapping table names to their query input types
 *
 * @example
 * ```ts
 * import { PureAbility } from "@casl/ability"
 * import type { QueryInput, Subjects } from "@noxify/casl-drizzle"
 *
 * type QueryMap = {
 *   users: QueryInput<typeof relations, "users">
 *   posts: QueryInput<typeof relations, "posts">
 * }
 *
 * type AppAbility = PureAbility<[string, Subjects<QueryMap>]>
 * ```
 */
export type Subjects<T> =
  | {
      [K in keyof T]: Model<T[K], K & string>
    }[keyof T]
  | Extract<keyof T, string>

/**
 * CASL ability type with Drizzle query conditions and typed actions.
 * Provides type-safe permission checking with action and subject validation.
 * Use with `defineAbility()` for automatic type inference and  autocomplete.
 *
 * @template T - An object mapping subject names to their query input types
 * @template TActions - A union of action strings (e.g. "read" | "update")
 *
 * @example
 * ```ts
 * import type { DrizzleAbility, QueryInput } from "@noxify/casl-drizzle"
 *
 * type AllowedAction = "read" | "create" | "update" | "delete"
 *
 * type SubjectMap = {
 *   users: QueryInput<typeof relations, "users">
 *   posts: QueryInput<typeof relations, "posts">
 * }
 *
 * type AppAbility = DrizzleAbility<SubjectMap, AllowedAction>
 * ```
 */
export type DrizzleAbility<T, TActions extends string = string> = PureAbility<
  [TActions, Subjects<T>],
  T[keyof T]
>

/**
 * Helper type for defining abilities with full type inference for actions and subjects.
 * When used with `createDrizzleAbility()`, enables IDE autocomplete for `can()` and `cannot()`
 * showing only the relevant actions and subject fields.
 *
 * @template T - An object mapping subject names to their query input types
 * @template TActions - A union of action strings (e.g. "read" | "update")
 *
 * @example
 * ```ts
 * import { createDrizzleAbility, type DefineDrizzleAbility } from "@noxify/casl-drizzle"
 * import type { QueryInput } from "@noxify/casl-drizzle"
 *
 * type AllowedAction = "read" | "create" | "update" | "delete"
 *
 * type SubjectMap = {
 *   users: QueryInput<typeof relations, "users">
 *   posts: QueryInput<typeof relations, "posts">
 * }
 *
 * const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can, cannot) => {
 *   can("read", "users", { id: 1 })
 *   can("update", "posts", { authorId: 1 })
 *   cannot("delete", "posts", { published: true })
 * })
 * ```
 */
export type DefineDrizzleAbility<T, TActions extends string = string> = DrizzleAbility<T, TActions>
