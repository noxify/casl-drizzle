import { describe, expect, it } from "vitest"

import type { QueryInput } from "../src"
import type { schemaWithRelations } from "./fixtures"
import { accessibleBy, defineAbility } from "../src"

describe("accessibleBy", () => {
  // Define a simple subject map for testing
  type Tables = typeof schemaWithRelations
  interface SubjectMap {
    User: QueryInput<Tables, "users">
    Admin: QueryInput<Tables, "users"> // Reuse users table for admin tests
  }

  it("should convert a single rule with simple conditions", () => {
    const ability = defineAbility<SubjectMap>((can) => {
      can("read", "User", { age: { gte: 18 } })
    })

    const whereInput = accessibleBy(ability, "read").User

    expect(whereInput).toEqual({
      age: { gte: 18 },
    })
  })

  it("should convert a single rule with multiple conditions", () => {
    const ability = defineAbility<SubjectMap>((can) => {
      can("read", "User", { id: 1, age: { lt: 18 } })
    })

    const whereInput = accessibleBy(ability, "read").User

    // Multiple conditions in single rule are implicitly AND'd in Drizzle RQB v2
    expect(whereInput).toEqual({
      id: 1,
      age: { lt: 18 },
    })
  })

  it("should combine multiple rules with OR", () => {
    const ability = defineAbility<SubjectMap>((can) => {
      can("read", "User", { id: 1, age: { lt: 18 } })
      can("read", "User", { age: { gte: 18 } })
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const whereInput = accessibleBy(ability, "read").User!

    // Rules are combined with OR - user can read if ANY rule matches
    expect(whereInput).toBeDefined()
    expect(whereInput).toHaveProperty("OR")
    expect(Array.isArray(whereInput.OR)).toBe(true)
  })

  it("should throw when no rules match", () => {
    const ability = defineAbility<SubjectMap>((can) => {
      can("read", "Admin")
    })

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions, @typescript-eslint/no-non-null-assertion
      accessibleBy(ability, "read").User!
    }).toThrow()
  })

  it("should work with unrestricted access", () => {
    const ability = defineAbility<SubjectMap>((can) => {
      can("read", "User") // unrestricted
    })

    const whereInput = accessibleBy(ability, "read").User

    // Unrestricted means empty where clause
    expect(whereInput).toEqual({})
  })
})
