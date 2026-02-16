import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { QueryInput } from "../src"
import type { relations } from "./setup/schema"
import { accessibleBy, createDrizzleAbility } from "../src"
import { createDb, resetDb } from "./setup"
import { schema } from "./setup/schema"

describe("Table without relations", () => {
  let db: Awaited<ReturnType<typeof createDb>>

  beforeAll(async () => {
    db = await createDb()
  })

  beforeEach(async () => {
    await resetDb(db)
  })

  it("filter test", async () => {
    await db.insert(schema.simpleTable).values([
      {
        id: 1,
        name: "Allowed Row",
        note: null,
        tags: ["red", "blue"],
        nums: [1, 2, 3],
      },
      {
        id: 2,
        name: "Forbidden Row",
        note: "blocked",
        tags: ["green"],
        nums: [3, 4],
      },
    ])

    type AllowedAction = "read" | "create" | "update" | "delete"

    interface SubjectMap {
      simpleTable: QueryInput<typeof relations, "simpleTable">
    }

    const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can, cannot) => {
      can("read", "simpleTable", { id: 1 })
      cannot("read", "simpleTable", { id: 2 })
    })

    const accessCondition = accessibleBy(ability, "read").simpleTable
    const result = await db.query.simpleTable.findMany({
      where: {
        AND: [accessCondition],
      },
    })

    const expectedAccessCondition = {
      id: 1,
      AND: [{ NOT: { id: 2 } }],
    }

    expect(accessCondition).toEqual(expectedAccessCondition)
    expect(result).toHaveLength(1)
    expect(result).toEqual([
      {
        id: 1,
        name: "Allowed Row",
        note: null,
        tags: ["red", "blue"],
        nums: [1, 2, 3],
      },
    ])
  })
})
