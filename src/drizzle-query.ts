import type { ForcedSubject } from "@casl/ability"
import type { AnyInterpreter } from "@ucast/core"
import { createTranslatorFactory } from "@ucast/core"

import { interpretDrizzleQuery } from "./query-interpreter"
import { DrizzleQueryParser } from "./query-parser"

const parser = new DrizzleQueryParser()
export const drizzleQuery = createTranslatorFactory(
  // eslint-disable-next-line @typescript-eslint/unbound-method
  parser.parse,
  interpretDrizzleQuery as AnyInterpreter,
)

export type Model<T, TName extends string> = T & ForcedSubject<TName>
export type Subjects<T extends Partial<Record<string, Record<string, unknown>>>> =
  | keyof T
  | { [K in keyof T]: Model<T[K], K & string> }[keyof T]

/**
 * Extracts Drizzle model name from given object and possible list of all subjects
 */
export type ExtractModelName<TObject, TModelName extends PropertyKey> = TObject extends {
  kind: TModelName
}
  ? TObject["kind"]
  : TObject extends ForcedSubject<TModelName>
    ? TObject["__caslSubjectType__"]
    : TObject extends { __typename: TModelName }
      ? TObject["__typename"]
      : TModelName
