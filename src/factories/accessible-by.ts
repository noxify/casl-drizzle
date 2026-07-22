import type { AnyAbility, Ability } from "@casl/ability"
import { ForbiddenError } from "@casl/ability"
import { rulesToCondition } from "@casl/ability/extra"

import type { DrizzleAbility, WhereInput } from "../types"

function normalizeDrizzleConditions(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(normalizeDrizzleConditions)
  }

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    // Handle OR/AND keys - recurse into arrays
    if (key === "OR" || key === "AND") {
      result[key] = normalizeDrizzleConditions(value)
      continue
    }

    // Handle RAW SQL conditions - pass through as-is
    if (key === "RAW") {
      result[key] = value
      continue
    }

    // Handle operators with $ prefix - remove the $ and recurse
    if (key.startsWith("$")) {
      const normalizedKey = key.slice(1)
      result[normalizedKey] = normalizeDrizzleConditions(value)
      continue
    }

    // Regular field - recurse into object values
    result[key] =
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? normalizeDrizzleConditions(value)
        : value
  }

  return result
}

function buildConditionsForSubject(
  ability: AnyAbility,
  action: string,
  subjectType: string
): WhereInput {
  type Condition = Record<string, unknown>
  const rules = ability.rulesFor(action, subjectType)
  const query = rulesToCondition<AnyAbility, Condition, Condition>(
    rules,
    (rule) =>
      (rule.inverted ? { NOT: rule.conditions } : rule.conditions) as Condition,
    {
      and: (conditions) => ({ AND: conditions }),
      or: (conditions) => ({ OR: conditions }),
      empty: () => ({}),
    }
  )

  if (query === null) {
    const error = ForbiddenError.from(ability).setMessage(
      `It's not allowed to run "${action}" on "${subjectType}"`
    )
    error.action = action
    error.subjectType = subjectType
    error.subject = subjectType
    throw error
  }

  const drizzleQuery = Object.create(null) as Record<string, unknown>

  // If there's a single OR with one condition, unwrap it
  if (query.OR && Array.isArray(query.OR) && query.OR.length === 1) {
    const [singleCondition] = query.OR as Condition[]
    Object.assign(drizzleQuery, singleCondition)
  } else if (query.OR) {
    drizzleQuery.OR = query.OR
  }

  // Normalize all $ prefixes from operators to match Drizzle RQB v2 format
  return normalizeDrizzleConditions(drizzleQuery) as WhereInput
}

const proxyHandlers: ProxyHandler<{ _ability: AnyAbility; _action: string }> = {
  get(target, prop) {
    if (prop === "ofType") {
      return (subjectType: string) =>
        buildConditionsForSubject(target._ability, target._action, subjectType)
    }

    return buildConditionsForSubject(
      target._ability,
      target._action,
      prop as string
    )
  },
}

/**
 * @deprecated use accessibleBy directly instead. It will infer the types from passed Ability instance.
 */
export const createAccessibleByFactory = <
  TResult extends Record<string, unknown>,
  TDrizzleQuery,
>() =>
  // oxlint-disable-next-line typescript/no-explicit-any
  function accessibleBy<TAbility extends Ability<any, TDrizzleQuery>>(
    ability: TAbility,
    action: TAbility["rules"][number]["action"] = "read"
  ): TResult {
    return new Proxy(
      {
        _ability: ability,
        _action: action,
      },
      proxyHandlers
    ) as unknown as TResult
  }

/**
 * Interface providing a typed `ofType` method for accessing subject-specific conditions.
 * Compatible with the CASL/Prisma `accessibleBy(ability).ofType("Subject")` pattern.
 */
export interface AccessibleByResult<TSubjectMap> {
  ofType: <S extends Extract<keyof TSubjectMap, string>>(
    subject: S
  ) => WhereInput
}

export function accessibleBy<TSubjectMap, TActions extends string = string>(
  ability: DrizzleAbility<TSubjectMap, TActions>,
  action?: TActions
): Record<Extract<keyof TSubjectMap, string>, WhereInput> &
  AccessibleByResult<TSubjectMap>
// oxlint-disable-next-line typescript/no-explicit-any
export function accessibleBy<TAbility extends Ability<any, any>>(
  ability: TAbility,
  action?: TAbility["rules"][number]["action"]
): Record<string, WhereInput> & { ofType: (subject: string) => WhereInput }
export function accessibleBy(
  // oxlint-disable-next-line typescript/no-explicit-any
  ability: Ability<any, any>,
  action: string
): Record<string, WhereInput> {
  return new Proxy(
    {
      _ability: ability,
      _action: action,
    },
    proxyHandlers
  ) as unknown as Record<string, WhereInput>
}
