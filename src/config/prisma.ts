import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma Client instance.
 * Reuses the same connection across the application to prevent
 * exhausting the database connection pool.
 *
 * Production tuning:
 * - `connection_limit` in DATABASE_URL controls max connections (default 5).
 *   Set it based on: (available DB connections) / (number of app instances).
 * - Query logging is disabled in production to avoid performance overhead.
 */
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["warn", "error"],
});

/**
 * Gracefully disconnect Prisma when the process is shutting down.
 * This is called from server.ts shutdown handlers.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;
