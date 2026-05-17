import { sql } from "drizzle-orm"
import { describe, expect, expectTypeOf, it } from "vitest"

import { every, none, some } from "../src"

describe("relation helper functions (some, every, none)", () => {
  it("should create a RAW condition from some()", () => {
    const condition = sql`user_id = 42`
    const result = some(condition)

    expect(result).toStrictEqual({ RAW: condition })
    expect(result.RAW).toBe(condition)
  })

  it("should create a RAW condition from every()", () => {
    const condition = sql`status = 'approved'`
    const result = every(condition)

    expect(result).toStrictEqual({ RAW: condition })
    expect(result.RAW).toBe(condition)
  })

  it("should create a RAW condition from none() with condition", () => {
    const condition = sql`status = 'pending'`
    const result = none(condition)

    expect(result).toStrictEqual({ RAW: condition })
    expect(result.RAW).toBe(condition)
  })

  it("should create a RAW condition from none() without condition", () => {
    const result = none()

    expect(result).toHaveProperty("RAW")
    expectTypeOf(result.RAW).toBeObject()
  })

  it("should support complex SQL conditions in some()", () => {
    const userId = 123
    const date = new Date("2024-01-01")
    const condition = sql`user_id = ${userId} AND created_at > ${date}`
    const result = some(condition)

    expect(result.RAW).toBe(condition)
  })

  it("should support complex SQL conditions in every()", () => {
    const statuses = ["approved", "published"]
    const condition = sql`status = ANY(${statuses})`
    const result = every(condition)

    expect(result.RAW).toBe(condition)
  })

  it("should support complex SQL conditions in none()", () => {
    const threshold = 100
    const condition = sql`amount > ${threshold}`
    const result = none(condition)

    expect(result.RAW).toBe(condition)
  })

  it("should support builder function syntax in some()", () => {
    const userId = 123
    const result = some(({ sql: sqlFn }) => sqlFn`user_id = ${userId}`)

    expect(result).toHaveProperty("RAW")
    expectTypeOf(result.RAW).toBeObject()
  })

  it("should support builder function with Drizzle operators in some()", () => {
    // This demonstrates that operators are available in the builder function
    // (actual field references would require table access at runtime)
    const threshold = 100
    const result = some(({ sql: sqlFn }) => sqlFn`amount > ${threshold}`)

    expect(result).toHaveProperty("RAW")
    expectTypeOf(result.RAW).toBeObject()
  })

  it("should support builder function syntax in every()", () => {
    const status = "approved"
    const result = every(({ sql: sqlFn }) => sqlFn`status = ${status}`)

    expect(result).toHaveProperty("RAW")
    expectTypeOf(result.RAW).toBeObject()
  })

  it("should support builder function syntax in none()", () => {
    const threshold = 100
    const result = none(({ sql: sqlFn }) => sqlFn`amount > ${threshold}`)

    expect(result).toHaveProperty("RAW")
    expectTypeOf(result.RAW).toBeObject()
  })

  it("should support Drizzle operators in builder function", () => {
    // Verify that Drizzle operators are available via the builder function parameter
    let operatorsAvailable = false
    some(({ eq, lt, gt, ne, sql: sqlFn }) => {
      // Just checking that these operators exist and are functions
      operatorsAvailable =
        typeof eq === "function" &&
        typeof lt === "function" &&
        typeof gt === "function" &&
        typeof ne === "function" &&
        typeof sqlFn === "function"
      return sqlFn`true` // dummy return
    })

    expect(operatorsAvailable).toBeTruthy()
  })

  it("should provide columns proxy in builder function", () => {
    // Verify that columns proxy is available and returns SQL for property access
    let columnsWork = false
    some(({ eq, columns }) => {
      // Check that columns is an object and property access returns SQL
      columnsWork =
        typeof columns === "object" && typeof columns.name === "object"
      return eq(columns.name, "test")
    })

    expect(columnsWork).toBeTruthy()
  })

  it("should support columns proxy with operators in every()", () => {
    const result = every(({ eq, columns }) => eq(columns.status, "approved"))

    expect(result).toHaveProperty("RAW")
    expectTypeOf(result.RAW).toBeObject()
  })

  it("should support columns proxy with operators in none()", () => {
    const result = none(({ ne, columns }) => ne(columns.status, "deleted"))

    expect(result).toHaveProperty("RAW")
    expectTypeOf(result.RAW).toBeObject()
  })
})
