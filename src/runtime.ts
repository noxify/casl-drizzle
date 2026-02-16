export { drizzleQuery } from "./drizzle-query"
export type { Model, Subjects as DrizzleSubjects, ExtractModelName } from "./drizzle-query"
export { createAccessibleByFactory, accessibleBy } from "./factories/accessible-by"
export { createAbilityFactory } from "./factories/create-ability"
export { ParsingQueryError } from "./query-error"
export { some, every, none } from "./factories/relation-helpers"

// Public API types
export type { QueryInput, Subjects, DefineDrizzleAbility } from "./types"

// Internal types (exported for use by createDrizzleAbilityFor, but not part of public API)
export type { DrizzleQueryFactory, DrizzleModel, BaseDrizzleQuery, WhereInput } from "./types"
