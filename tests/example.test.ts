import { describe, expect, inject, it } from "vitest"

import { drizzleClient } from "./setup/drizzle-client"

// Beispiel Schema - anpassen zu deinem echten Schema
// import * as schema from "../src/my-schema"

describe("Example Test Suite", () => {
  it("sollte Connection zur PostgreSQL DB herstellen", async () => {
    // Empfange die Connection URL vom Global Setup
    const connectionUrl = inject("connectionUrl")

    expect(connectionUrl).toBeDefined()

    const db = drizzleClient(connectionUrl)

    // Führe eine einfache Query aus
    const result = await db.execute("SELECT 1 as test")
    expect(result).toBeDefined()
  })
})
