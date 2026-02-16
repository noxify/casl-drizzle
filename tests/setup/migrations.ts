import { createRequire } from "module"
import type { PgliteDatabase } from "drizzle-orm/pglite"

global.require = createRequire(import.meta.url)

/**
 * Run Drizzle migrations on PGlite database
 * Uses drizzle-kit to generate migrations from schema
 */
export async function runMigrations<T extends Record<string, unknown>>(
  db: PgliteDatabase<T>,
  schema: T,
) {
  try {
    const { generateDrizzleJson, generateMigration } = await import("drizzle-kit/api-postgres")

    // Generate migration from current schema
    const [previous, current] = await Promise.all(
      [{}, schema].map((schemaObject) => generateDrizzleJson(schemaObject)),
    )

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const statements = await generateMigration(previous!, current!)

    // PGlite requires splitting statements and executing them individually
    for (const statement of statements) {
      if (statement.trim()) {
        await db.execute(statement)
      }
    }

    // eslint-disable-next-line no-console
    console.log("✅ Migrations executed")
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("❌ Migration error:", err)
    throw err
  }
}

export async function seedDatabase<T extends Record<string, unknown>>(
  db: PgliteDatabase<T>,
  seedFn: (db: PgliteDatabase<T>) => Promise<void>,
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
