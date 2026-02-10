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

const equals: FieldInstruction = {
  type: "field",
  validate(instruction, value) {
    if (Array.isArray(value) || isPlainObject(value)) {
      throw new ParsingQueryError(
        `"${instruction.name}" does not supports comparison of arrays and objects`,
      )
    }
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

const instructions = {
  equals,
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
  isEmpty: booleanField,
  has,
  hasSome,
  hasEvery: hasSome,
  NOT: compound,
  AND: compound,
  OR: compound,
  every: relation,
  some: relation,
  none: inverted("some", relation),
  is: relation,
  isNot: inverted("is", relation),
  isSet: booleanField,
}

export interface ParseOptions {
  field: string
}

export class DrizzleQueryParser extends ObjectQueryParser<Record<string, unknown>> {
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(instructions as any, {
      defaultOperatorName: "equals",
    })
  }

  parse(query: Record<string, unknown>, options?: ParseOptions): Condition {
    if (options?.field) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return buildAnd((this.parseFieldOperators as any)(options.field, query))
    }

    return super.parse(query)
  }
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] }
