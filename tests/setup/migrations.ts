import { createRequire } from "node:module"

import type { PgliteDatabase } from "drizzle-orm/pglite"

global.require = createRequire(import.meta.url)

let cachedStatements: string[] | null = null

/**
 * Run Drizzle migrations on PGlite database
 * Uses drizzle-kit to generate migrations from schema
 */
export async function runMigrations<T extends Record<string, unknown>>(
  db: PgliteDatabase<T>,
  schema: T
) {
  try {
    if (!cachedStatements) {
      const { generateDrizzleJson, generateMigration } =
        await import("drizzle-kit/api-postgres")

      // Generate migration from current schema
      const [previous, current] = await Promise.all(
        [{}, schema].map((schemaObject) => generateDrizzleJson(schemaObject))
      )

      // oxlint-disable-next-line typescript/no-non-null-assertion
      cachedStatements = await generateMigration(previous!, current!)
    }

    // PGlite requires splitting statements and executing them individually
    for (const statement of cachedStatements) {
      if (statement.trim()) {
        await db.execute(statement)
      }
    }
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.error("❌ Migration error:", error)
    throw error
  }
}

export async function seedDatabase<T extends Record<string, unknown>>(
  db: PgliteDatabase<T>,
  seedFn: (db: PgliteDatabase<T>) => Promise<void>
) {
  try {
    await seedFn(db)
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.error("❌ Seed error:", error)
    throw error
  }
}
