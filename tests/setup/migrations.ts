import { createRequire } from "module"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

global.require = createRequire(import.meta.url)

/**
 * Führt Drizzle Migrations aus
 * Nutzt drizzle-kit um aus dem Schema Migrations zu generieren
 */
export async function runMigrations<T extends Record<string, unknown>>(
  db: PostgresJsDatabase<T>,
  schema: T,
) {
  try {
    const { generateDrizzleJson, generateMigration } = await import("drizzle-kit/api-postgres")

    // Generiere die Migration vom aktuellen Schema
    const [previous, current] = await Promise.all(
      [{}, schema].map((schemaObject) => generateDrizzleJson(schemaObject)),
    )

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const statements = await generateMigration(previous!, current!)
    const migration = statements.join("\n")

    // Execute the migration
    if (migration.trim()) {
      await db.execute(migration)
      // eslint-disable-next-line no-console
      console.log("✅ Migrations executed")
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("❌ Migration error:", err)
    throw err
  }
}

export async function seedDatabase<T extends Record<string, unknown>>(
  db: PostgresJsDatabase<T>,
  seedFn: (db: PostgresJsDatabase<T>) => Promise<void>,
) {
  try {
    await seedFn(db)
    // eslint-disable-next-line no-console
    console.log("✅ Seeds executed")
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("❌ Seed error:", err)
    throw err
  }
}
