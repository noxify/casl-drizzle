import { describe, expect, it } from "vitest"

import { interpretDrizzleQuery } from "../src/query-interpreter"
import { DrizzleQueryParser } from "../src/query-parser"

interface TestRecord {
  id: number
  name: string
  text: string
  count: number
  nullable: string | null
  list: number[]
  tags: string[]
  maybe?: string
  relation?: { id: number; label: string } | null
  items: { id: number; label: string }[]
}

const parser = new DrizzleQueryParser()

const matches = (query: Record<string, unknown>, record: TestRecord): boolean => {
  const condition = parser.parse(query)
  return interpretDrizzleQuery(condition, record)
}

describe("Drizzle operators", () => {
  const record: TestRecord = {
    id: 1,
    name: "Alpha",
    text: "Hello World",
    count: 5,
    nullable: null,
    list: [1, 2, 3],
    tags: ["red", "blue"],
    items: [
      { id: 1, label: "one" },
      { id: 2, label: "two" },
    ],
  }

  it("comparison and equality operators", () => {
    expect(matches({ id: 1 }, record)).toBe(true)
    expect(matches({ id: { eq: 1 } }, record)).toBe(true)
    expect(matches({ id: { ne: 2 } }, record)).toBe(true)
    expect(matches({ id: { gt: 0 } }, record)).toBe(true)
    expect(matches({ id: { gte: 1 } }, record)).toBe(true)
    expect(matches({ id: { lt: 2 } }, record)).toBe(true)
    expect(matches({ id: { lte: 1 } }, record)).toBe(true)
  })

  it("membership operators", () => {
    expect(matches({ id: { in: [1, 2] } }, record)).toBe(true)
    expect(matches({ id: { notIn: [2, 3] } }, record)).toBe(true)
  })

  it("string operators", () => {
    expect(matches({ name: { like: "Al%" } }, record)).toBe(true)
    expect(matches({ name: { ilike: "al%" } }, record)).toBe(true)
    expect(matches({ name: { notLike: "Be%" } }, record)).toBe(true)
    expect(matches({ name: { notIlike: "be%" } }, record)).toBe(true)
    expect(matches({ name: { startsWith: "Al" } }, record)).toBe(true)
    expect(matches({ name: { endsWith: "ha" } }, record)).toBe(true)
    expect(matches({ text: { contains: "World" } }, record)).toBe(true)
    expect(matches({ name: { startsWith: "al", mode: "insensitive" } }, record)).toBe(true)
  })

  it("null operators", () => {
    expect(matches({ nullable: { isNull: true } }, record)).toBe(true)
    expect(matches({ nullable: { isNotNull: false } }, record)).toBe(true)
  })

  it("array operators", () => {
    expect(matches({ list: { arrayOverlaps: [3, 4] } }, record)).toBe(true)
    expect(matches({ list: { arrayContains: [1, 2] } }, record)).toBe(true)
    expect(matches({ list: { arrayContained: [1, 2, 3, 4] } }, record)).toBe(true)
    expect(matches({ list: { has: 2 } }, record)).toBe(true)
    expect(matches({ list: { hasSome: [2, 4] } }, record)).toBe(true)
    expect(matches({ list: { hasEvery: [1, 3] } }, record)).toBe(true)
    expect(matches({ tags: { isEmpty: false } }, record)).toBe(true)
  })

  it("set and compound operators", () => {
    expect(matches({ maybe: { isSet: false } }, record)).toBe(true)
    expect(
      matches(
        {
          AND: [{ id: { gte: 1 } }, { name: { startsWith: "Al" } }],
        },
        record,
      ),
    ).toBe(true)
    expect(
      matches(
        {
          OR: [{ id: 2 }, { text: { contains: "World" } }],
        },
        record,
      ),
    ).toBe(true)
    expect(
      matches(
        {
          NOT: { id: 2 },
        },
        record,
      ),
    ).toBe(true)
  })

  it("relation operators", () => {
    const withRelations: TestRecord = {
      ...record,
      relation: { id: 1, label: "primary" },
      items: [
        { id: 1, label: "one" },
        { id: 2, label: "two" },
      ],
    }

    expect(matches({ relation: { is: { id: 1 } } }, withRelations)).toBe(true)
    expect(matches({ items: { some: { id: 2 } } }, withRelations)).toBe(true)
    expect(matches({ items: { every: { id: { gt: 0 } } } }, withRelations)).toBe(true)
    expect(matches({ items: { none: { id: 3 } } }, withRelations)).toBe(true)
  })
})
