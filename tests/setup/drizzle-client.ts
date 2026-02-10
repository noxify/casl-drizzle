import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { relations, schema } from "./schema"

export function drizzleClient(connectionUri: string) {
  const client = postgres(connectionUri, {
    max: 10, // Connection pool size
  })
  return drizzle({ client, schema, relations })
}
