/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import type {
  Comparable,
  CompoundInstruction,
  Condition,
  FieldInstruction,
  FieldParsingContext,
  ObjectQueryFieldParsingContext,
} from "@ucast/core"
import {
  buildAnd,
  CompoundCondition,
  FieldCondition,
  NULL_CONDITION,
  ObjectQueryParser,
} from "@ucast/core"

import { ParsingQueryError } from "./query-error"

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    value !== null &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  )
}

const eq: FieldInstruction = {
  type: "field",
  validate(instruction, value) {
    if (Array.isArray(value) || isPlainObject(value)) {
      throw new ParsingQueryError(
        `"${instruction.name}" does not supports comparison of arrays and objects`,
      )
    }
  },
}

const ne: FieldInstruction = {
  type: "field",
  validate: void eq.validate,
  parse(_, value, { field }) {
    return new FieldCondition("notEquals", field, value)
  },
}

const not: FieldInstruction<unknown, ObjectQueryFieldParsingContext> = {
  type: "field",
  // eslint-disable-next-line
  parse: ((instruction, value, { hasOperators, field, parse }) => {
    if ((isPlainObject(value) && !hasOperators(value)) || Array.isArray(value)) {
      throw new ParsingQueryError(
        `"${instruction.name}" does not supports comparison of arrays and objects`,
      )
    }

    if (!isPlainObject(value)) {
      return new FieldCondition("notEquals", field, value)
    }

    return new CompoundCondition("NOT", [parse(value, { field })])
  }) as FieldInstruction<unknown, ObjectQueryFieldParsingContext>["parse"],
} as const as FieldInstruction<unknown, ObjectQueryFieldParsingContext>

const within: FieldInstruction<unknown[]> = {
  type: "field",
  validate(instruction, value) {
    if (!Array.isArray(value)) {
      throw ParsingQueryError.invalidArgument(instruction.name, value, "an array")
    }
  },
}

const lt: FieldInstruction<Comparable> = {
  type: "field",
  validate(instruction, value) {
    const type = typeof value
    const isComparable =
      type === "string" || (type === "number" && Number.isFinite(value)) || value instanceof Date

    if (!isComparable) {
      throw ParsingQueryError.invalidArgument(instruction.name, value, "comparable value")
    }
  },
}

const POSSIBLE_MODES = new Set(["insensitive", "default"])
const mode: FieldInstruction<string> = {
  type: "field",
  validate(instruction, value) {
    if (!POSSIBLE_MODES.has(value)) {
      throw ParsingQueryError.invalidArgument(
        instruction.name,
        value,
        `one of ${Array.from(POSSIBLE_MODES).join(", ")}`,
      )
    }
  },
  parse: () => NULL_CONDITION,
}

interface StringFieldContext extends FieldParsingContext {
  query: {
    mode?: "insensitive"
  }
}

const compareString: FieldInstruction<string, StringFieldContext> = {
  type: "field",
  validate(instruction, value) {
    if (typeof value !== "string") {
      throw ParsingQueryError.invalidArgument(instruction.name, value, "string")
    }
  },
  parse(instruction, value, { query, field }) {
    const name = query.mode === "insensitive" ? `i${instruction.name}` : instruction.name
    return new FieldCondition(name, field, value)
  },
}

const compareLike: FieldInstruction<string, StringFieldContext> = {
  type: "field",
  validate(instruction, value) {
    if (typeof value !== "string") {
      throw ParsingQueryError.invalidArgument(instruction.name, value, "string")
    }
  },
  parse(instruction, value, { query, field }) {
    if (instruction.name === "ilike" || query.mode === "insensitive") {
      return new FieldCondition("ilike", field, value)
    }

    return new FieldCondition("like", field, value)
  },
}

const compound: CompoundInstruction = {
  type: "compound",
  validate(instruction, value) {
    if (!value || typeof value !== "object") {
      throw ParsingQueryError.invalidArgument(instruction.name, value, "an array or object")
    }
  },
  parse(instruction, arrayOrObject, { parse }) {
    const value = Array.isArray(arrayOrObject) ? arrayOrObject : [arrayOrObject]
    const conditions = value.map((v) => parse(v))
    return new CompoundCondition(instruction.name, conditions)
  },
}

const booleanField: FieldInstruction<boolean> = {
  type: "field",
  validate(instruction, value) {
    if (typeof value !== "boolean") {
      throw ParsingQueryError.invalidArgument(instruction.name, value, "a boolean")
    }
  },
}

const has: FieldInstruction<unknown> = {
  type: "field",
}

const hasSome: FieldInstruction<unknown[]> = {
  type: "field",
  validate(instruction, value) {
    if (!Array.isArray(value)) {
      throw ParsingQueryError.invalidArgument(instruction.name, value, "an array")
    }
  },
}

const arrayField: FieldInstruction<unknown[]> = {
  type: "field",
  validate(instruction, value) {
    if (!Array.isArray(value)) {
      throw ParsingQueryError.invalidArgument(instruction.name, value, "an array")
    }
  },
}

const relation: FieldInstruction<Record<string, unknown>, ObjectQueryFieldParsingContext> = {
  type: "field",
  parse(instruction, value, { field, parse }) {
    if (!isPlainObject(value)) {
      throw ParsingQueryError.invalidArgument(
        instruction.name,
        value,
        "a query for nested relation",
      )
    }

    return new FieldCondition(instruction.name, field, parse(value))
  },
}

const inverted = (name: string, baseInstruction: FieldInstruction): FieldInstruction => {
  const parse = baseInstruction.parse?.bind(baseInstruction)

  if (!parse) {
    return {
      ...baseInstruction,
      parse(_, value, ctx) {
        return new CompoundCondition("NOT", [new FieldCondition(name, ctx.field, value)])
      },
    }
  }

  return {
    ...baseInstruction,
    parse(instruction, value, ctx) {
      const condition = parse(instruction, value, ctx)
      if (condition.operator !== instruction.name) {
        throw new Error(
          `Cannot invert "${name}" operator parser because it returns a complex Condition`,
        )
      }
      ;(condition as Mutable<Condition>).operator = name
      return new CompoundCondition("NOT", [condition])
    },
  }
}

const raw: FieldInstruction<unknown> = {
  type: "field",
  parse(_, value) {
    // RAW SQL is passed through as-is, will be handled in accessibleBy
    return new FieldCondition("RAW", "RAW", value)
  },
}

const instructions = {
  eq,
  ne,
  not,
  in: within,
  notIn: inverted("in", within),
  lt,
  lte: lt,
  gt: lt,
  gte: lt,
  // CASL uses $ prefix for operators
  $lt: lt,
  $lte: lt,
  $gt: lt,
  $gte: lt,
  $in: within,
  $nin: inverted("in", within),
  mode,
  startsWith: compareString,
  endsWith: compareString,
  contains: compareString,
  like: compareLike,
  ilike: compareLike,
  notLike: {
    type: "field",
    parse: ((_, value, { field, parse }) => {
      return new CompoundCondition("NOT", [parse({ like: value }, { field })])
    }) as FieldInstruction<unknown, ObjectQueryFieldParsingContext>["parse"],
  },
  notIlike: {
    type: "field",
    parse: ((_, value, { field, parse }) => {
      return new CompoundCondition("NOT", [parse({ ilike: value }, { field })])
    }) as FieldInstruction<unknown, ObjectQueryFieldParsingContext>["parse"],
  },
  isNull: booleanField,
  isNotNull: booleanField,
  isEmpty: booleanField,
  has,
  hasSome,
  hasEvery: hasSome,
  arrayOverlaps: arrayField,
  arrayContained: arrayField,
  arrayContains: arrayField,
  NOT: compound,
  AND: compound,
  OR: compound,
  every: relation,
  some: relation,
  none: inverted("some", relation),
  is: relation,
  isNot: inverted("is", relation),
  isSet: booleanField,
  RAW: raw,
}

export interface ParseOptions {
  field: string
}

export class DrizzleQueryParser extends ObjectQueryParser<Record<string, unknown>> {
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(instructions as any, {
      defaultOperatorName: "eq",
    })
  }

  private normalizeEqOperator(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeEqOperator(item))
    }

    if (!isPlainObject(value)) {
      return value
    }

    const keys = Object.keys(value)
    if (keys.length === 1 && keys[0] === "eq") {
      return this.normalizeEqOperator(value.eq)
    }

    const normalized: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) {
      normalized[key] = this.normalizeEqOperator(entry)
    }

    return normalized
  }

  parse(query: Record<string, unknown>, options?: ParseOptions): Condition {
    const normalizedQuery = this.normalizeEqOperator(query) as Record<string, unknown>
    if (options?.field) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return buildAnd((this.parseFieldOperators as any)(options.field, normalizedQuery))
    }

    return super.parse(normalizedQuery)
  }
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] }
