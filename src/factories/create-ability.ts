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
  // oxlint-disable-next-line typescript/no-explicit-any
  TDrizzleQuery extends Record<string, any>,
>() {
  // oxlint-disable-next-line typescript/no-explicit-any
  function createAbility<T extends PureAbility<any, TDrizzleQuery>>(
    rules?: RawRuleOf<T>[],
    options?: AbilityOptionsOf<T>
  ): T
  function createAbility<
    A extends AbilityTuple = [string, TModelName],
    C extends TDrizzleQuery = TDrizzleQuery,
  >(
    rules?: RawRuleFrom<A, C>[],
    options?: AbilityOptions<A, C>
  ): PureAbility<A, C>
  // oxlint-disable-next-line unicorn/consistent-function-scoping
  function createAbility(
    // oxlint-disable-next-line typescript/no-explicit-any
    rules: any[] = [],
    options = {}
    // oxlint-disable-next-line typescript/no-explicit-any
  ): PureAbility<any, any> {
    return new PureAbility(rules, {
      ...options,
      // oxlint-disable-next-line typescript/no-explicit-any
      conditionsMatcher: drizzleQuery as any,
      fieldMatcher: fieldPatternMatcher,
    })
  }

  return createAbility
}
