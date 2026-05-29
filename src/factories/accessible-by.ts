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

const proxyHandlers: ProxyHandler<{ _ability: AnyAbility; _action: string }> = {
  get(target, subjectType) {
    type Condition = Record<string, unknown>
    const rules = target._ability.rulesFor(
      target._action,
      subjectType as string
    )
    const query = rulesToCondition<AnyAbility, Condition, Condition>(
      rules,
      (rule) =>
        (rule.inverted
          ? { NOT: rule.conditions }
          : rule.conditions) as Condition,
      {
        and: (conditions) => ({ AND: conditions }),
        or: (conditions) => ({ OR: conditions }),
        empty: () => ({}),
      }
    )

    if (query === null) {
      const error = ForbiddenError.from(target._ability).setMessage(
        `It's not allowed to run "${target._action}" on "${subjectType as string}"`
      )
      error.action = target._action
      error.subjectType = subjectType as string
      error.subject = subjectType as string
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
    return normalizeDrizzleConditions(drizzleQuery)
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

export function accessibleBy<TSubjectMap, TActions extends string = string>(
  ability: DrizzleAbility<TSubjectMap, TActions>,
  action?: TActions
): Record<Extract<keyof TSubjectMap, string>, WhereInput>
// oxlint-disable-next-line typescript/no-explicit-any
export function accessibleBy<TAbility extends Ability<any, any>>(
  ability: TAbility,
  action?: TAbility["rules"][number]["action"]
): Record<string, WhereInput>
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
