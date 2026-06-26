import { env } from "./config/env";
import app from "./app";
import { startScheduler } from "./jobs/scheduler";
import { disconnectPrisma } from "./config/prisma";
import { closeRedisConnection } from "./middleware/rate-limit.middleware";
import logger from "./config/logger";

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server is running on http://localhost:${PORT}`);
  logger.info(`📚 Swagger docs available at http://localhost:${PORT}/api-docs`);

  // Start the background cron job only if enabled in this environment/instance
  if (env.ENABLE_SCHEDULER) {
    startScheduler();
  } else {
    logger.info("ℹ️  Scheduler is disabled on this instance (ENABLE_SCHEDULER = false)");
  }
});

// --------------- Graceful Shutdown ---------------
// Ensures in-flight requests complete and DB connections are
// released cleanly during deployments, scaling events, or crashes.

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`⏳ Received ${signal}. Shutting down gracefully…`);

  server.close(async () => {
    logger.info("✅ HTTP server closed — no new connections accepted");

    try {
      await disconnectPrisma();
      logger.info("✅ Database connections released");
    } catch (err) {
      logger.error({ err }, "❌ Error disconnecting from database");
    }

    try {
      await closeRedisConnection();
      logger.info("✅ Redis connections released");
    } catch (err) {
      logger.error({ err }, "❌ Error disconnecting from Redis");
    }

    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long (e.g., hanging connections)
  setTimeout(() => {
    logger.error("❌ Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM")); // Docker / Kubernetes / systemd
process.on("SIGINT", () => gracefulShutdown("SIGINT")); // Ctrl+C in terminal
