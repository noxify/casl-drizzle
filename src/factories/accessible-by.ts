import type { AnyAbility, PureAbility } from "@casl/ability"
import { ForbiddenError } from "@casl/ability"
import { rulesToQuery } from "@casl/ability/extra"

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

    // Handle operators with $ prefix - remove the $ and recurse
    if (key.startsWith("$")) {
      const normalizedKey = key.substring(1)
      result[normalizedKey] = normalizeDrizzleConditions(value)
      continue
    }

    // Regular field - recurse into object values
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = normalizeDrizzleConditions(value)
    } else {
      result[key] = value
    }
  }

  return result
}

const proxyHandlers: ProxyHandler<{ _ability: AnyAbility; _action: string }> = {
  get(target, subjectType) {
    const query = rulesToQuery(target._ability, target._action, subjectType, (rule) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return
      rule.inverted ? { NOT: rule.conditions } : rule.conditions,
    )

    if (query === null) {
      const error = ForbiddenError.from(target._ability).setMessage(
        `It's not allowed to run "${target._action}" on "${subjectType as string}"`,
      )
      error.action = target._action
      error.subjectType = error.subject = subjectType as string
      throw error
    }

    const drizzleQuery = Object.create(null) as Record<string, unknown>

    // If there's a single $or with one condition, unwrap it
    if (query.$or && Array.isArray(query.$or) && query.$or.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const singleCondition = query.$or[0]
      Object.assign(drizzleQuery, singleCondition)
    } else if (query.$or) {
      drizzleQuery.OR = query.$or
    }

    if (query.$and) {
      drizzleQuery.AND = query.$and
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
>() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function accessibleBy<TAbility extends PureAbility<any, TDrizzleQuery>>(
    ability: TAbility,
    action: TAbility["rules"][number]["action"] = "read",
  ): TResult {
    return new Proxy(
      {
        _ability: ability,
        _action: action,
      },
      proxyHandlers,
    ) as unknown as TResult
  }
}

export function accessibleBy<TSubjectMap, TActions extends string = string>(
  ability: DrizzleAbility<TSubjectMap, TActions>,
  action?: TActions,
): Record<Extract<keyof TSubjectMap, string>, WhereInput>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function accessibleBy<TAbility extends PureAbility<any, any>>(
  ability: TAbility,
  action?: TAbility["rules"][number]["action"],
): Record<string, WhereInput>
export function accessibleBy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ability: PureAbility<any, any>,
  action: string,
): Record<string, WhereInput> {
  return new Proxy(
    {
      _ability: ability,
      _action: action,
    },
    proxyHandlers,
  ) as unknown as Record<string, WhereInput>
}
