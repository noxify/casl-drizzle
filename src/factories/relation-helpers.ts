import type { SQL } from "drizzle-orm"
import { operators, sql } from "drizzle-orm"

/**
 * Helper to create a RAW condition for "some" relation filtering.
 * Generates an EXISTS subquery that returns true if at least one related record matches the condition.
 *
 * Use this when you need to filter by relations with complex conditions not supported by QueryInput.
 * Supports both raw SQL and builder function syntax.
 *
 * @example
 * ```ts
 * import { some } from "@noxify/casl-drizzle"
 * import { sql } from "drizzle-orm"
 *
 * // Using raw SQL
 * can('update', 'documents', {
 *   contributors: some(sql`user_id = ${userId}`),
 * })
 *
 * // Using builder function
 * can('update', 'documents', {
 *   contributors: some(({ sql: sqlFn }) => sqlFn`user_id = ${userId}`),
 * })
 * ```
 *
 * @param condition - Raw SQL WHERE condition or builder function for the related table
 * @returns A RAW condition object for use in ability definitions
 */
export function some(condition: SQL | ((ops: typeof operators) => SQL)): { RAW: SQL } {
  if (typeof condition === "function") {
    return { RAW: condition(operators) }
  }
  return { RAW: condition }
}

/**
 * Helper to create a RAW condition for "every" relation filtering.
 * Checks if ALL related records match the condition.
 *
 * Supports both raw SQL and builder function syntax.
 *
 * @example
 * ```ts
 * // Only allow updates if ALL comments are approved
 * can('update', 'documents', {
 *   comments: every(sql`status = 'approved'`)
 * })
 *
 * // Using builder function
 * can('update', 'documents', {
 *   comments: every(({ sql: sqlFn }) => sqlFn`status = 'approved'`)
 * })
 * ```
 *
 * @param condition - Raw SQL WHERE condition or builder function that all relations must satisfy
 * @returns A RAW condition object for use in ability definitions
 */
export function every(condition: SQL | ((ops: typeof operators) => SQL)): { RAW: SQL } {
  if (typeof condition === "function") {
    return { RAW: condition(operators) }
  }
  return { RAW: condition }
}

/**
 * Helper to create a RAW condition for "none" relation filtering.
 * Checks if NO related records match the condition (or exist at all).
 *
 * Supports both raw SQL and builder function syntax.
 *
 * @example
 * ```ts
 * // Using raw SQL
 * can('delete', 'documents', {
 *   comments: none(sql`status = 'pending'`)
 * })
 *
 * // Using builder function
 * can('delete', 'documents', {
 *   comments: none(({ sql: sqlFn }) => sqlFn`status = 'pending'`)
 * })
 *
 * // Check that no related records exist
 * can('delete', 'documents', {
 *   comments: none()
 * })
 * ```
 *
 * @param condition - Optional raw SQL WHERE condition or builder function. If omitted, checks that no related records exist.
 * @returns A RAW condition object for use in ability definitions
 */
export function none(condition?: SQL | ((ops: typeof operators) => SQL)): { RAW: SQL } {
  if (!condition) {
    return { RAW: sql`1=0` as unknown as SQL }
  }
  if (typeof condition === "function") {
    return { RAW: condition(operators) }
  }
  return { RAW: condition }
}
