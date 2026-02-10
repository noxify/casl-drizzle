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
  condition: FieldCondition<Condition>,
  object: Record<string, unknown>,
  context: { get: (obj: unknown, field: string) => unknown },
) => boolean = (condition, object, { get }): boolean => {
  const item = get(object, condition.field)
  return item !== undefined
}

function toComparable(value: unknown) {
  return value && typeof value === "object" ? value.valueOf() : value
}

const compareValues: typeof compare = (a, b) => compare(toComparable(a), toComparable(b))

export const interpretDrizzleQuery = createJsInterpreter(
  {
    // TODO: support arrays and objects comparison
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
    isEmpty,
    has,
    hasSome,
    hasEvery,
    and,
    or,
    AND: and,
    OR: or,
    NOT: not,
    every,
    some,
    is,
    isSet,
  },
  {
    get: (object: Record<string, unknown>, field: string): unknown => object[field],
    compare: compareValues,
  },
)
