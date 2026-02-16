import { describe, expect, it } from "vitest"

import type { QueryInput } from "../src"
import type { relations } from "./setup/schema"
import { accessibleBy, createDrizzleAbility } from "../src"
import { createDb } from "./setup"
import { schema } from "./setup/schema"

describe("Drizzle operators (DB)", () => {
  it("should filter with all supported operators", async () => {
    type AllowedAction = "read" | "create" | "update" | "delete"

    interface SubjectMap {
      simpleTable: QueryInput<typeof relations, "simpleTable">
    }

    const db = await createDb(async (db) => {
      await db.insert(schema.simpleTable).values([
        {
          id: 1,
          name: "Alpha",
          note: null,
          tags: ["red", "blue"],
          nums: [1, 2, 3],
        },
        {
          id: 2,
          name: "Beta",
          note: "note",
          tags: ["green"],
          nums: [3, 4],
        },
        {
          id: 3,
          name: "Gamma",
          note: null,
          tags: ["yellow"],
          nums: [9],
        },
      ])
    })

    const queryFor = async (condition: SubjectMap["simpleTable"]) => {
      const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
        can("read", "simpleTable", condition)
      })

      const where = accessibleBy(ability, "read").simpleTable
      const rows = await db.query.simpleTable.findMany({ where })
      return rows.map((row) => row.id).sort((a, b) => a - b)
    }

    await expect(queryFor({ id: { eq: 1 } })).resolves.toEqual([1])
    await expect(queryFor({ id: { ne: 2 } })).resolves.toEqual([1, 3])
    await expect(queryFor({ id: { gt: 1 } })).resolves.toEqual([2, 3])
    await expect(queryFor({ id: { gte: 2 } })).resolves.toEqual([2, 3])
    await expect(queryFor({ id: { lt: 3 } })).resolves.toEqual([1, 2])
    await expect(queryFor({ id: { lte: 2 } })).resolves.toEqual([1, 2])
    await expect(queryFor({ id: { in: [1, 3] } })).resolves.toEqual([1, 3])
    await expect(queryFor({ id: { notIn: [2] } })).resolves.toEqual([1, 3])

    await expect(queryFor({ name: { like: "Al%" } })).resolves.toEqual([1])
    await expect(queryFor({ name: { ilike: "al%" } })).resolves.toEqual([1])
    await expect(queryFor({ name: { notLike: "Be%" } })).resolves.toEqual([1, 3])
    await expect(queryFor({ name: { notIlike: "be%" } })).resolves.toEqual([1, 3])

    await expect(queryFor({ note: { isNull: true } })).resolves.toEqual([1, 3])
    await expect(queryFor({ note: { isNotNull: true } })).resolves.toEqual([2])

    await expect(queryFor({ nums: { arrayOverlaps: [3] } })).resolves.toEqual([1, 2])
    await expect(queryFor({ nums: { arrayContains: [1, 2] } })).resolves.toEqual([1])
    await expect(queryFor({ nums: { arrayContained: [1, 2, 3, 4] } })).resolves.toEqual([1, 2])
  })
})
