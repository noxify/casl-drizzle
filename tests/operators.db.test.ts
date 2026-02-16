import { beforeAll, describe, expect, it } from "vitest"

import type { QueryInput } from "../src"
import type { relations } from "./setup/schema"
import { accessibleBy, createDrizzleAbility } from "../src"
import { createDb } from "./setup"
import { schema } from "./setup/schema"

describe("Drizzle operators (DB)", () => {
  let db: Awaited<ReturnType<typeof createDb>>

  beforeAll(async () => {
    db = await createDb(async (dbClient) => {
      await dbClient.insert(schema.simpleTable).values([
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
  })

  type AllowedAction = "read" | "create" | "update" | "delete"

  interface SubjectMap {
    simpleTable: QueryInput<typeof relations, "simpleTable">
  }

  const queryFor = async (condition: SubjectMap["simpleTable"]) => {
    const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can) => {
      can("read", "simpleTable", condition)
    })

    const where = accessibleBy(ability, "read").simpleTable
    const rows = await db.query.simpleTable.findMany({ where })
    return rows.map((row) => row.id).sort((a, b) => a - b)
  }

  const cases = [
    { field: "id", operator: "eq", value: 1, expected: [1] },
    { field: "id", operator: "ne", value: 2, expected: [1, 3] },
    { field: "id", operator: "gt", value: 1, expected: [2, 3] },
    { field: "id", operator: "gte", value: 2, expected: [2, 3] },
    { field: "id", operator: "lt", value: 3, expected: [1, 2] },
    { field: "id", operator: "lte", value: 2, expected: [1, 2] },
    { field: "id", operator: "in", value: [1, 3], expected: [1, 3] },
    { field: "id", operator: "notIn", value: [2], expected: [1, 3] },
    { field: "name", operator: "like", value: "Al%", expected: [1] },
    { field: "name", operator: "ilike", value: "al%", expected: [1] },
    { field: "name", operator: "notLike", value: "Be%", expected: [1, 3] },
    { field: "name", operator: "notIlike", value: "be%", expected: [1, 3] },
    { field: "note", operator: "isNull", value: true, expected: [1, 3] },
    { field: "note", operator: "isNotNull", value: true, expected: [2] },
    { field: "nums", operator: "arrayOverlaps", value: [3], expected: [1, 2] },
    { field: "nums", operator: "arrayContains", value: [1, 2], expected: [1] },
    { field: "nums", operator: "arrayContained", value: [1, 2, 3, 4], expected: [1, 2] },
  ] as const

  cases.forEach(({ field, operator, value, expected }) => {
    it(`should filter with ${field} ${operator}`, async () => {
      const result = await queryFor({
        [field]: { [operator]: value },
      } as SubjectMap["simpleTable"])
      expect(result).toEqual(expected)
    })
  })
})
