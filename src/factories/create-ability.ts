import type {
  AbilityOptions,
  AbilityOptionsOf,
  AbilityTuple,
  RawRuleFrom,
  RawRuleOf,
} from "@casl/ability"
import { fieldPatternMatcher, PureAbility } from "@casl/ability"

import { drizzleQuery } from "../drizzle-query"

export function createAbilityFactory<
  TModelName extends string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TDrizzleQuery extends Record<string, any>,
>() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createAbility<T extends PureAbility<any, TDrizzleQuery>>(
    rules?: RawRuleOf<T>[],
    options?: AbilityOptionsOf<T>,
  ): T
  function createAbility<
    A extends AbilityTuple = [string, TModelName],
    C extends TDrizzleQuery = TDrizzleQuery,
  >(rules?: RawRuleFrom<A, C>[], options?: AbilityOptions<A, C>): PureAbility<A, C>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createAbility(rules: any[] = [], options = {}): PureAbility<any, any> {
    return new PureAbility(rules, {
      ...options,
      conditionsMatcher: drizzleQuery,
      fieldMatcher: fieldPatternMatcher,
    })
  }

  return createAbility
}
