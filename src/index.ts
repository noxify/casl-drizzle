import type { AnyAbility, PureAbility } from "@casl/ability"
import { AbilityBuilder } from "@casl/ability"

import type { DrizzleQueryFactory } from "./runtime"
import type { DefineDrizzleAbility, DrizzleAbility } from "./types"
import { createAbilityFactory } from "./runtime"

export { accessibleBy, ParsingQueryError, drizzleQuery, some, every, none } from "./runtime"
export type * from "./runtime"

/**
 * Factory function to create a DrizzleAbility instance.
 * Use with AbilityBuilder for type-safe ability definitions.
 *
 * @example
 * ```ts
 * import { AbilityBuilder } from "@casl/ability"
 * import { createDrizzleAbilityFor, type DefineDrizzleAbility } from "@noxify/casl-drizzle"
 *
 * type AllowedAction = "read" | "create" | "update" | "delete"
 *
 * type AppAbility = DefineDrizzleAbility<{
 *   users: UserQuery
 *   posts: PostQuery
 * }, AllowedAction>
 *
 * const { can, build } = new AbilityBuilder<AppAbility>(
 *   createDrizzleAbilityFor<{
 *     users: UserQuery
 *     posts: PostQuery
 *   }, AllowedAction>(),
 * )
 * ```
 */
export function createDrizzleAbilityFor(): new (
  ...args: ConstructorParameters<typeof PureAbility>
) => AnyAbility
export function createDrizzleAbilityFor<TSubject, TActions extends string = string>(): new (
  ...args: ConstructorParameters<typeof PureAbility>
) => DrizzleAbility<TSubject, TActions>
export function createDrizzleAbilityFor() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
  return createAbilityFactory<string, DrizzleQueryFactory>() as any
}

/**
 * Create a type-safe ability with subject and action-specific conditions.
 * Use this with a pre-defined ability type for full type inference.
 *
 * @template TAbility - A DrizzleAbility type (includes both actions and subjects)
 *
 * @example
 * ```ts
 * import { createDrizzleAbility } from "@noxify/casl-drizzle"
 * import type { QueryInput } from "@noxify/casl-drizzle"
 *
 * type AllowedAction = "read" | "create" | "update" | "delete"
 *
 * type SubjectMap = {
 *   users: QueryInput<typeof relations, "users">
 *   posts: QueryInput<typeof relations, "posts">
 * }
 *
 * const ability = createDrizzleAbility<SubjectMap, AllowedAction>((can, cannot) => {
 *   can("read", "users", { id: 1 })
 *   can("update", "posts", { authorId: 1 })
 * })
 * ```
 */
export function createDrizzleAbility<TSubject, TActions extends string = string>(
  define: (
    can: <S extends keyof TSubject & string>(
      action: TActions,
      subject: S,
      conditions?: TSubject[S],
    ) => void,
    cannot: <S extends keyof TSubject & string>(
      action: TActions,
      subject: S,
      conditions?: TSubject[S],
    ) => void,
  ) => void,
): DrizzleAbility<TSubject, TActions> {
  type AppAbility = DefineDrizzleAbility<TSubject, TActions>

  const builder = new AbilityBuilder<AppAbility>(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    createAbilityFactory<string, DrizzleQueryFactory>() as any,
  )

  type Can = <S extends keyof TSubject & string>(
    action: TActions,
    subject: S,
    conditions?: TSubject[S],
  ) => void

  // Cast builder methods to the subject-specific signature for precise conditions typing.
  const can = builder.can.bind(builder) as unknown as Can
  const cannot = builder.cannot.bind(builder) as unknown as Can

  define(can, cannot)

  return builder.build()
}
