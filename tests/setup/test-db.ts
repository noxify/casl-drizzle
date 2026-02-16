import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"

import { runMigrations, seedDatabase } from "./migrations"
import { relations, schema } from "./schema"

/**
 * Create a fresh PGlite database instance for testing
 * Each test should create its own instance for isolation
 */
type SeedFn = Parameters<typeof seedDatabase>[1]

export async function createDb(seedFn?: SeedFn) {
  const client = new PGlite()
  const db = drizzle({ client, schema, relations })

  // Run migrations to set up the schema
  await runMigrations(db, schema)

  if (seedFn) {
    await seedDatabase(db, seedFn)
  }

  return db
}
