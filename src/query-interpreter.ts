import type { CompoundCondition, Condition, FieldCondition } from "@ucast/core"
import type { eq as jsEq, ne as jsNe } from "@ucast/js"
import {
  and,
  compare,
  createJsInterpreter,
  gt,
  gte,
  lt,
  lte,
  or,
  within,
} from "@ucast/js"

type StringInterpreter = (
  // oxlint-disable-next-line typescript/no-invalid-void-type
  this: void,
  condition: FieldCondition<string>,
  object: Record<string, string>,
  context: {
    get: (obj: unknown, field: string) => unknown
    interpret?: (condition: Condition, obj: unknown) => boolean
  }
) => boolean
const startsWith: StringInterpreter = (condition, object, { get }): boolean =>
  (get(object, condition.field) as string).startsWith(condition.value)
const istartsWith: StringInterpreter = (condition, object, { get }): boolean =>
  (get(object, condition.field) as string)
    .toLowerCase()
    .startsWith(condition.value.toLowerCase())

const endsWith: StringInterpreter = (condition, object, { get }): boolean =>
  (get(object, condition.field) as string).endsWith(condition.value)
const iendsWith: StringInterpreter = (condition, object, { get }): boolean =>
  (get(object, condition.field) as string)
    .toLowerCase()
    .endsWith(condition.value.toLowerCase())

const contains: StringInterpreter = (condition, object, { get }): boolean =>
  (get(object, condition.field) as string).includes(condition.value)
const icontains: StringInterpreter = (condition, object, { get }): boolean =>
  (get(object, condition.field) as string)
    .toLowerCase()
    .includes(condition.value.toLowerCase())

const likeToRegExp = (pattern: string): RegExp => {
  const escaped = pattern.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&")
  const regex = `^${escaped.replaceAll("%", ".*").replaceAll("_", ".")}$`
  return new RegExp(regex, "u")
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
  // oxlint-disable-next-line typescript/no-invalid-void-type
  this: void,
  condition: FieldCondition<TConditionValue>,
  object: TValue,
  context: {
    get: (obj: unknown, field: string) => unknown
    interpret?: (condition: Condition, obj: unknown) => boolean
  }
) => boolean
const isEmpty: ArrayInterpreter<boolean> = (
  condition,
  object,
  { get }
): boolean => {
  const value = get(object, condition.field) as unknown[]
  const empty = Array.isArray(value) && value.length === 0
  return empty === condition.value
}
const has: ArrayInterpreter<unknown> = (
  condition,
  object,
  { get }
): boolean => {
  const value = get(object, condition.field) as unknown[]
  return Array.isArray(value) && value.includes(condition.value)
}
const hasSome: ArrayInterpreter<unknown[]> = (
  condition,
  object,
  { get }
): boolean => {
  const value = get(object, condition.field) as unknown[]
  return Array.isArray(value) && condition.value.some((v) => value.includes(v))
}
const hasEvery: ArrayInterpreter<unknown[]> = (
  condition,
  object,
  { get }
): boolean => {
  const value = get(object, condition.field) as unknown[]
  return Array.isArray(value) && condition.value.every((v) => value.includes(v))
}

const arrayOverlaps: ArrayInterpreter<unknown[]> = (
  condition,
  object,
  { get }
): boolean => {
  const value = get(object, condition.field) as unknown[]
  return Array.isArray(value) && condition.value.some((v) => value.includes(v))
}

const arrayContains: ArrayInterpreter<unknown[]> = (
  condition,
  object,
  { get }
): boolean => {
  const value = get(object, condition.field) as unknown[]
  return Array.isArray(value) && condition.value.every((v) => value.includes(v))
}

const arrayContained: ArrayInterpreter<unknown[]> = (
  condition,
  object,
  { get }
): boolean => {
  const value = get(object, condition.field) as unknown[]
  return Array.isArray(value) && value.every((v) => condition.value.includes(v))
}

const every: (
  // oxlint-disable-next-line typescript/no-invalid-void-type
  this: void,
  condition: FieldCondition<Condition>,
  object: Record<string, unknown>,
  context: {
    get: (obj: unknown, field: string) => unknown
    interpret: (condition: Condition, obj: unknown) => boolean
  }
) => boolean = (condition, object, { get, interpret }): boolean => {
  const items = get(object, condition.field) as Record<string, unknown>[]
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.every((item) => interpret(condition.value, item))
  )
}

const some: (
  // oxlint-disable-next-line typescript/no-invalid-void-type
  this: void,
  condition: FieldCondition<Condition>,
  object: Record<string, unknown>,
  context: {
    get: (obj: unknown, field: string) => unknown
    interpret: (condition: Condition, obj: unknown) => boolean
  }
) => boolean = (condition, object, { get, interpret }): boolean => {
  const items = get(object, condition.field) as Record<string, unknown>[]
  return (
    Array.isArray(items) &&
    items.some((item) => interpret(condition.value, item))
  )
}

const is: (
  // oxlint-disable-next-line typescript/no-invalid-void-type
  this: void,
  condition: FieldCondition<Condition>,
  object: Record<string, unknown>,
  context: {
    get: (obj: unknown, field: string) => unknown
    interpret: (condition: Condition, obj: unknown) => boolean
  }
) => boolean = (condition, object, { get, interpret }): boolean => {
  const item = get(object, condition.field)
  return (
    item !== null &&
    typeof item === "object" &&
    interpret(condition.value, item as Record<string, unknown>)
  )
}

const not: (
  // oxlint-disable-next-line typescript/no-invalid-void-type
  this: void,
  condition: CompoundCondition,
  object: Record<string, unknown>,
  context: { interpret: (condition: Condition, obj: unknown) => boolean }
) => boolean = (condition, object, { interpret }): boolean =>
  condition.value.every((subCondition) => !interpret(subCondition, object))

const isSet: (
  // oxlint-disable-next-line typescript/no-invalid-void-type
  this: void,
  condition: FieldCondition<boolean>,
  object: Record<string, unknown>,
  context: { get: (obj: unknown, field: string) => unknown }
) => boolean = (condition, object, { get }): boolean => {
  const item = get(object, condition.field)
  return (item !== undefined) === condition.value
}

const isNull: (
  // oxlint-disable-next-line typescript/no-invalid-void-type
  this: void,
  condition: FieldCondition<boolean>,
  object: Record<string, unknown>,
  context: { get: (obj: unknown, field: string) => unknown }
) => boolean = (condition, object, { get }): boolean => {
  const item = get(object, condition.field)
  return (item === null) === condition.value
}

const isNotNull: (
  // oxlint-disable-next-line typescript/no-invalid-void-type
  this: void,
  condition: FieldCondition<boolean>,
  object: Record<string, unknown>,
  context: { get: (obj: unknown, field: string) => unknown }
) => boolean = (condition, object, { get }): boolean => {
  const item = get(object, condition.field)
  return (item !== null) === condition.value
}

function toComparable(value: unknown) {
  return value && typeof value === "object" ? value.valueOf() : value
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === "object" &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null)

const deepEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime()
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => deepEqual(value, right[index]))
    )
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key])
      )
    )
  }

  return false
}

const isComparableValue = (value: unknown): boolean => {
  const type = typeof value
  return (
    value === null ||
    type === "string" ||
    type === "number" ||
    type === "boolean" ||
    type === "bigint" ||
    value instanceof Date
  )
}

const eq: typeof jsEq = (
  condition,
  object,
  { get, compare: compareFn }
): boolean => {
  const left = get(object, condition.field)
  const right = condition.value

  if (deepEqual(left, right)) {
    return true
  }

  if (isComparableValue(left) && isComparableValue(right)) {
    return compareFn(left, right) === 0
  }

  return false
}

const ne: typeof jsNe = (condition, object, context): boolean =>
  !eq(condition, object, context)

/**
 * RAW SQL conditions can't be evaluated in JavaScript.
 * In DB context, they're passed through by accessibleBy().
 * In JS context (tests), we return true to allow the condition through.
 */
const raw: typeof and = () => true

const compareValues: typeof compare = (a, b) =>
  compare(toComparable(a), toComparable(b))

export const interpretDrizzleQuery = createJsInterpreter(
  {
    // eq/ne support deep equality for arrays and plain objects.
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
    get: (object: Record<string, unknown>, field: string): unknown =>
      object[field],
    compare: compareValues,
  }
)
