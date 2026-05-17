import type { SQL, Table } from "drizzle-orm"
import { operators, sql } from "drizzle-orm"

/**
 * Type for the builder function parameter with operators and column proxies
 */
type RelationHelperBuilder = typeof operators & {
  /**
   * Proxy to access columns from the related table.
   * Each property access returns a SQL reference to that column.
   *
   * TypeScript limitation: Due to how Proxy types work, columns is typed as Record<string, any>.
   * At runtime, each property access returns a valid SQL instance.
   *
   * @example
   * ```ts
   * some(({ eq, columns }) => eq(columns.name, 'Alice'))
   * // Generates: name = 'Alice' (in relation subquery context)
   * ```
   */
  // oxlint-disable-next-line typescript/no-explicit-any
  columns: Record<string, any>
}

/**
 * Creates a proxy that converts property access to SQL column references.
 * Used for both `columns` (relation table) and `sourceColumns` (source table).
 */
const createColumnProxy = (): Record<string, SQL<unknown>> =>
  new Proxy(
    {},
    {
      get: (_, columnName): SQL<unknown> => sql.raw(String(columnName)),
    }
  ) as Record<string, SQL<unknown>>

/**
 * Helper to create a RAW condition for "some" relation filtering.
 * Generates an EXISTS subquery that returns true if at least one related record matches the condition.
 *
 * Use this when you need to filter by relations with complex conditions not supported by QueryInput.
 * Supports both raw SQL and builder function syntax with column proxies.
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
 * // Using builder function with operators and columns (untyped)
 * can('update', 'documents', {
 *   contributors: some(({ eq, columns }) => eq(columns.userId, userId)),
 * })
 *
 * // Type-safe version with table reference:
 * can('read', 'posts', {
 *   author: some(schema.users, ({ eq, columns }) => eq(columns.name, 'Alice')),
 *   // columns is now type-safe with full autocomplete!
 * })
 * ```
 *
 * @param conditionOrTable - Raw SQL WHERE condition, builder function, or table reference
 * @param maybeCondition - Optional builder function when first param is a table
 * @returns A RAW condition object for use in ability definitions
 */
export function some(
  condition: SQL | ((builder: RelationHelperBuilder) => SQL)
): {
  RAW: SQL
}
export function some<T extends Table>(
  table: T,

  condition: (
    builder: Omit<RelationHelperBuilder, "columns"> & {
      columns: T["_"]["columns"]
    }
  ) => SQL
): { RAW: SQL }
export function some(
  conditionOrTable: SQL | Table | ((builder: RelationHelperBuilder) => SQL),
  maybeCondition?: (builder: RelationHelperBuilder) => SQL
): { RAW: SQL } {
  // Handle overload: some(table, condition)
  if (
    conditionOrTable &&
    typeof conditionOrTable === "object" &&
    "_" in conditionOrTable &&
    "columns" in conditionOrTable._
  ) {
    if (!maybeCondition) {
      throw new Error("Condition is required when table is provided")
    }
    const { columns } = (conditionOrTable as unknown as Table)._
    return { RAW: maybeCondition({ ...operators, columns }) }
  }

  // Handle overload: some(condition)
  const condition = conditionOrTable as
    | SQL
    | ((builder: RelationHelperBuilder) => SQL)
  if (typeof condition === "function") {
    const columnProxy = createColumnProxy()
    return { RAW: condition({ ...operators, columns: columnProxy }) }
  }
  return { RAW: condition }
}

/**
 * Helper to create a RAW condition for "every" relation filtering.
 * Checks if ALL related records match the condition.
 *
 * Supports both raw SQL and builder function syntax with column proxies.
 *
 * @example
 * ```ts
 * // Only allow updates if ALL comments are approved
 * can('update', 'documents', {
 *   comments: every(sql`status = 'approved'`)
 * })
 *
 * // Using builder function with operators
 * can('update', 'documents', {
 *   comments: every(({ eq, columns }) => eq(columns.status, 'approved'))
 * })
 *
 * // Type-safe version with table reference:
 * can('update', 'documents', {
 *   comments: every(schema.comments, ({ eq, columns }) => eq(columns.status, 'approved'))
 * })
 * ```
 *
 * @param conditionOrTable - Raw SQL WHERE condition, builder function, or table reference
 * @param maybeCondition - Optional builder function when first param is a table
 * @returns A RAW condition object for use in ability definitions
 */
export function every(
  condition: SQL | ((builder: RelationHelperBuilder) => SQL)
): {
  RAW: SQL
}
export function every<T extends Table>(
  table: T,

  condition: (
    builder: Omit<RelationHelperBuilder, "columns"> & {
      columns: T["_"]["columns"]
    }
  ) => SQL
): { RAW: SQL }
export function every(
  conditionOrTable: SQL | Table | ((builder: RelationHelperBuilder) => SQL),
  maybeCondition?: (builder: RelationHelperBuilder) => SQL
): { RAW: SQL } {
  // Handle overload: every(table, condition)
  if (
    conditionOrTable &&
    typeof conditionOrTable === "object" &&
    "_" in conditionOrTable &&
    "columns" in conditionOrTable._
  ) {
    if (!maybeCondition) {
      throw new Error("Condition is required when table is provided")
    }
    const { columns } = (conditionOrTable as unknown as Table)._
    return { RAW: maybeCondition({ ...operators, columns }) }
  }

  // Handle overload: every(condition)
  const condition = conditionOrTable as
    | SQL
    | ((builder: RelationHelperBuilder) => SQL)
  if (typeof condition === "function") {
    const columnProxy = createColumnProxy()
    return { RAW: condition({ ...operators, columns: columnProxy }) }
  }
  return { RAW: condition }
}

/**
 * Helper to create a RAW condition for "none" relation filtering.
 * Checks if NO related records match the condition (or exist at all).
 *
 * Supports both raw SQL and builder function syntax with column proxies.
 *
 * @example
 * ```ts
 * // Using raw SQL
 * can('delete', 'documents', {
 *   comments: none(sql`status = 'pending'`)
 * })
 *
 * // Using builder function with operators
 * can('delete', 'documents', {
 *   comments: none(({ eq, columns }) => eq(columns.status, 'pending'))
 * })
 *
 * // Check that no related records exist
 * can('delete', 'documents', {
 *   comments: none()
 * })
 *
 * // Type-safe version with table reference:
 * can('delete', 'documents', {
 *   comments: none(schema.comments, ({ eq, columns }) => eq(columns.status, 'pending'))
 * })
 * ```
 *
 * @param conditionOrTable - Raw SQL WHERE condition, builder function, table reference, or undefined
 * @param maybeCondition - Optional builder function when first param is a table
 * @returns A RAW condition object for use in ability definitions
 */
export function none(): { RAW: SQL }
export function none(
  condition: SQL | ((builder: RelationHelperBuilder) => SQL)
): {
  RAW: SQL
}
export function none<T extends Table>(
  table: T,

  condition?: (
    builder: Omit<RelationHelperBuilder, "columns"> & {
      columns: T["_"]["columns"]
    }
  ) => SQL
): { RAW: SQL }
export function none(
  conditionOrTable?: SQL | Table | ((builder: RelationHelperBuilder) => SQL),
  maybeCondition?: (builder: RelationHelperBuilder) => SQL
): { RAW: SQL } {
  // Handle overload: none() - no related records exist
  if (!conditionOrTable) {
    return { RAW: sql`1=0` as unknown as SQL }
  }

  // Handle overload: none(table, condition?)
  if (
    conditionOrTable &&
    typeof conditionOrTable === "object" &&
    "_" in conditionOrTable &&
    "columns" in conditionOrTable._
  ) {
    if (!maybeCondition) {
      return { RAW: sql`1=0` as unknown as SQL }
    }
    const { columns } = (conditionOrTable as unknown as Table)._
    return { RAW: maybeCondition({ ...operators, columns }) }
  }

  // Handle overload: none(condition)
  const condition = conditionOrTable as
    | SQL
    | ((builder: RelationHelperBuilder) => SQL)
  if (typeof condition === "function") {
    const columnProxy = createColumnProxy()
    return { RAW: condition({ ...operators, columns: columnProxy }) }
  }
  return { RAW: condition }
}
