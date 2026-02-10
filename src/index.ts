import type { AbilityOptions, AbilityTuple, AnyAbility, RawRuleFrom } from "@casl/ability"
import { AbilityBuilder, fieldPatternMatcher, PureAbility } from "@casl/ability"

import type { DrizzleQueryFactory } from "./runtime"
import { createAbilityFactory, drizzleQuery } from "./runtime"

export { accessibleBy, ParsingQueryError, drizzleQuery } from "./runtime"
export type * from "./runtime"

/**
 * Factory function to create a DrizzleAbility instance.
 * Use with AbilityBuilder for type-safe ability definitions.
 *
 * @example
 * ```ts
 * import { AbilityBuilder } from "@casl/ability"
 * import { createDrizzleAbilityFor, type DefineAbility } from "ucastle"
 *
 * type AppAbility = DefineAbility<{
 *   users: UserQuery
 *   posts: PostQuery
 * }>
 *
 * const { can, build } = new AbilityBuilder<AppAbility>(createDrizzleAbilityFor())
 * ```
 */
export function createDrizzleAbilityFor(): new (
  ...args: ConstructorParameters<typeof PureAbility>
) => AnyAbility {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
  return createAbilityFactory<string, DrizzleQueryFactory>() as any
}

/**
 * Create a type-safe ability with subject-specific conditions.
 * This provides better autocomplete than using AbilityBuilder directly.
 *
 * @example
 * ```ts
 * import { defineAbility } from "ucastle"
 *
 * const ability = defineAbility<{
 *   users: UserQuery
 *   posts: PostQuery
 * }>((can, cannot) => {
 *   can("read", "users", { id: 1 }) // ✅ Only user fields
 *   can("read", "posts", { authorId: 1 }) // ✅ Only post fields
 * })
 * ```
 */
export function defineAbility<T>(
  define: (
    can: <S extends keyof T & string>(action: string, subject: S, conditions?: T[S]) => void,
    cannot: <S extends keyof T & string>(action: string, subject: S, conditions?: T[S]) => void,
  ) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): PureAbility<[string, any], T[keyof T]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AppAbility = PureAbility<[string, any], T[keyof T]>

  const builder = new AbilityBuilder<AppAbility>(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    createAbilityFactory<string, DrizzleQueryFactory>() as any,
  )

  define(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (action, subject, conditions) => builder.can(action, subject, conditions as any),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (action, subject, conditions) => builder.cannot(action, subject, conditions as any),
  )

  return builder.build()
}

/**
 * Uses conditional type to support union distribution
 */
type ExtendedAbilityTuple<T extends AbilityTuple> = T extends AbilityTuple
  ? [T[0], "all" | T[1]]
  : never

/**
 * @deprecated use createDrizzleAbilityFor instead
 */
export class DrizzleAbility<
  A extends AbilityTuple = [string, string],
  C extends Record<string, unknown> = Record<string, unknown>,
> extends PureAbility<ExtendedAbilityTuple<A>, C> {
  constructor(
    rules?: RawRuleFrom<ExtendedAbilityTuple<A>, C>[],
    options?: AbilityOptions<ExtendedAbilityTuple<A>, C>,
  ) {
    super(rules, {
      conditionsMatcher: drizzleQuery,
      fieldMatcher: fieldPatternMatcher,
      ...options,
    })
  }
}
