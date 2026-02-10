import type { TestProject } from "vitest/node"

import { initDatabase } from "./database"

let dbConnection: Awaited<ReturnType<typeof initDatabase>> | null = null

export async function setup(project: TestProject) {
  // Start PostgreSQL Container
  dbConnection = await initDatabase()

  // Construct the Connection URL
  const connectionUrl = dbConnection.container.getConnectionUri()

  // share connection URL with tests
  project.provide("connectionUrl", connectionUrl)

  // eslint-disable-next-line no-console
  console.log(`🗄️ PostgreSQL Container started: ${connectionUrl}`)

  return async () => {
    // Cleanup: Stop the container after all tests
    if (dbConnection) {
      await dbConnection.container.stop()
      // eslint-disable-next-line no-console
      console.log("🗄️ PostgreSQL Container stopped")
    }
  }
}

declare module "vitest" {
  export interface ProvidedContext {
    connectionUrl: string
  }
}
