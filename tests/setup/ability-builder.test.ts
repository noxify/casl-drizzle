import { AbilityBuilder, subject } from "@casl/ability"
import { describe, expect, it } from "vitest"

import type { DefineDrizzleAbility, QueryInput } from "../../src"
import type { relations } from "./schema"
import { createDrizzleAbilityFor } from "../../src"

type AllowedAction = "read" | "create" | "update" | "delete"

interface SubjectMap {
  simpleTable: QueryInput<typeof relations, "simpleTable">
}

type AppAbility = DefineDrizzleAbility<SubjectMap, AllowedAction>

const { can, build, cannot } = new AbilityBuilder<AppAbility>(
  createDrizzleAbilityFor<SubjectMap, AllowedAction>(),
)

describe("AbilityBuilder Integration", () => {
  it("should allow defining abilities with createDrizzleAbilityFor", () => {
    can("read", "simpleTable", { id: { eq: 1 } })

    const ability = build()
    expect(ability.can("read", "simpleTable")).toBe(true)
  })

  it("should provide correct types for conditions in can()", () => {
    // This test is mainly for TypeScript type checking - if the following lines compile, the types are correct.
    can("read", "simpleTable", { id: 1 })
    cannot("read", "simpleTable", { name: { like: "test" } })

    const ability = build()

    expect(ability.can("read", "simpleTable")).toBe(true)
    expect(ability.can("read", subject("simpleTable", { name: "test" }))).toBe(false)
  })
})
