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

const TABLE_NAMES = ["users", "posts", "comments", "groups", "users_to_groups", "simple_table"]

/**
 * Reset all tables between tests to keep a single DB instance isolated.
 */
export async function resetDb(db: Awaited<ReturnType<typeof createDb>>) {
  await db.execute(`TRUNCATE TABLE ${TABLE_NAMES.join(", ")} RESTART IDENTITY CASCADE`)
}
