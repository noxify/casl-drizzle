import type { CompoundCondition, Condition, FieldCondition } from "@ucast/core"
import { and, compare, createJsInterpreter, eq, gt, gte, lt, lte, ne, or, within } from "@ucast/js"

type StringInterpreter = (
  this: void,
  condition: FieldCondition<string>,
  object: Record<string, string>,
  context: {
    get: (obj: unknown, field: string) => unknown
    interpret?: (condition: Condition, obj: unknown) => boolean
  },
) => boolean
const startsWith: StringInterpreter = (condition, object, { get }): boolean => {
  return (get(object, condition.field) as string).startsWith(condition.value)
}
const istartsWith: StringInterpreter = (condition, object, { get }): boolean => {
  return (get(object, condition.field) as string)
    .toLowerCase()
    .startsWith(condition.value.toLowerCase())
}

const endsWith: StringInterpreter = (condition, object, { get }): boolean => {
  return (get(object, condition.field) as string).endsWith(condition.value)
}
const iendsWith: StringInterpreter = (condition, object, { get }): boolean => {
  return (get(object, condition.field) as string)
    .toLowerCase()
    .endsWith(condition.value.toLowerCase())
}

const contains: StringInterpreter = (condition, object, { get }): boolean => {
  return (get(object, condition.field) as string).includes(condition.value)
}
const icontains: StringInterpreter = (condition, object, { get }): boolean => {
  return (get(object, condition.field) as string)
    .toLowerCase()
    .includes(condition.value.toLowerCase())
}

const likeToRegExp = (pattern: string): RegExp => {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = `^${escaped.replace(/%/g, ".*").replace(/_/g, ".")}$`
  return new RegExp(regex)
}

const like: StringInterpreter = (condition, object, { get }): boolean => {
  const value = get(object, condition.field)
  if (typeof value !== "string") {
    return false
  }

  return likeToRegExp(condition.value).test(value)
}

const ilike: StringInterpreter = (condition, object, { get }): boolean => {
  const value = get(object, condition.field)
  if (typeof value !== "string") {
    return false
  }

  return likeToRegExp(condition.value.toLowerCase()).test(value.toLowerCase())
}

type ArrayInterpreter<
  TConditionValue,
  TValue extends Record<string, unknown[]> = Record<string, unknown[]>,
> = (
  this: void,
  condition: FieldCondition<TConditionValue>,
  object: TValue,
  context: {
    get: (obj: unknown, field: string) => unknown
    interpret?: (condition: Condition, obj: unknown) => boolean
  },
) => boolean
const isEmpty: ArrayInterpreter<boolean> = (condition, object, { get }): boolean => {
  const value = get(object, condition.field) as unknown[]
  const empty = Array.isArray(value) && value.length === 0
  return empty === condition.value
}
const has: ArrayInterpreter<unknown> = (condition, object, { get }): boolean => {
  const value = get(object, condition.field) as unknown[]
  return Array.isArray(value) && value.includes(condition.value)
}
const hasSome: ArrayInterpreter<unknown[]> = (condition, object, { get }): boolean => {
  const value = get(object, condition.field) as unknown[]
  return Array.isArray(value) && condition.value.some((v) => value.includes(v))
}
const hasEvery: ArrayInterpreter<unknown[]> = (condition, object, { get }): boolean => {
  const value = get(object, condition.field) as unknown[]
  return Array.isArray(value) && condition.value.every((v) => value.includes(v))
}

const arrayOverlaps: ArrayInterpreter<unknown[]> = (condition, object, { get }): boolean => {
  const value = get(object, condition.field) as unknown[]
  return Array.isArray(value) && condition.value.some((v) => value.includes(v))
}

const arrayContains: ArrayInterpreter<unknown[]> = (condition, object, { get }): boolean => {
  const value = get(object, condition.field) as unknown[]
  return Array.isArray(value) && condition.value.every((v) => value.includes(v))
}

const arrayContained: ArrayInterpreter<unknown[]> = (condition, object, { get }): boolean => {
  const value = get(object, condition.field) as unknown[]
  return Array.isArray(value) && value.every((v) => condition.value.includes(v))
}

const every: (
  this: void,
  condition: FieldCondition<Condition>,
  object: Record<string, unknown>,
  context: {
    get: (obj: unknown, field: string) => unknown
    interpret: (condition: Condition, obj: unknown) => boolean
  },
) => boolean = (condition, object, { get, interpret }): boolean => {
  const items = get(object, condition.field) as Record<string, unknown>[]
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.every((item) => interpret(condition.value, item))
  )
}

const some: (
  this: void,
  condition: FieldCondition<Condition>,
  object: Record<string, unknown>,
  context: {
    get: (obj: unknown, field: string) => unknown
    interpret: (condition: Condition, obj: unknown) => boolean
  },
) => boolean = (condition, object, { get, interpret }): boolean => {
  const items = get(object, condition.field) as Record<string, unknown>[]
  return Array.isArray(items) && items.some((item) => interpret(condition.value, item))
}

const is: (
  this: void,
  condition: FieldCondition<Condition>,
  object: Record<string, unknown>,
  context: {
    get: (obj: unknown, field: string) => unknown
    interpret: (condition: Condition, obj: unknown) => boolean
  },
) => boolean = (condition, object, { get, interpret }): boolean => {
  const item = get(object, condition.field)
  return (
    item !== null &&
    typeof item === "object" &&
    interpret(condition.value, item as Record<string, unknown>)
  )
}

const not: (
  this: void,
  condition: CompoundCondition,
  object: Record<string, unknown>,
  context: { interpret: (condition: Condition, obj: unknown) => boolean },
) => boolean = (condition, object, { interpret }): boolean => {
  return condition.value.every((subCondition) => !interpret(subCondition, object))
}

const isSet: (
  this: void,
  condition: FieldCondition<boolean>,
  object: Record<string, unknown>,
  context: { get: (obj: unknown, field: string) => unknown },
) => boolean = (condition, object, { get }): boolean => {
  const item = get(object, condition.field)
  return (item !== undefined) === condition.value
}

const isNull: (
  this: void,
  condition: FieldCondition<boolean>,
  object: Record<string, unknown>,
  context: { get: (obj: unknown, field: string) => unknown },
) => boolean = (condition, object, { get }): boolean => {
  const item = get(object, condition.field)
  return (item === null) === condition.value
}

const isNotNull: (
  this: void,
  condition: FieldCondition<boolean>,
  object: Record<string, unknown>,
  context: { get: (obj: unknown, field: string) => unknown },
) => boolean = (condition, object, { get }): boolean => {
  const item = get(object, condition.field)
  return (item !== null) === condition.value
}

function toComparable(value: unknown) {
  return value && typeof value === "object" ? value.valueOf() : value
}

/**
 * RAW SQL conditions can't be evaluated in JavaScript.
 * In DB context, they're passed through by accessibleBy().
 * In JS context (tests), we return true to allow the condition through.
 */
const raw: typeof and = () => true

const compareValues: typeof compare = (a, b) => compare(toComparable(a), toComparable(b))

export const interpretDrizzleQuery = createJsInterpreter(
  {
    // TODO: support arrays and objects comparison
    eq,
    equals: eq,
    notEquals: ne,
    in: within,
    lt,
    lte,
    gt,
    gte,
    startsWith,
    istartsWith,
    endsWith,
    iendsWith,
    contains,
    icontains,
    like,
    ilike,
    isEmpty,
    has,
    hasSome,
    hasEvery,
    arrayOverlaps,
    arrayContained,
    arrayContains,
    and,
    or,
    AND: and,
    OR: or,
    NOT: not,
    every,
    some,
    is,
    isSet,
    isNull,
    isNotNull,
    RAW: raw,
  },
  {
    get: (object: Record<string, unknown>, field: string): unknown => object[field],
    compare: compareValues,
  },
)
