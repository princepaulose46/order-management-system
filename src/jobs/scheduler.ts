import cron from "node-cron";
import orderService from "../services/order.service";
import logger from "../config/logger";

let isRunning = false;

/**
 * Background scheduler that automatically promotes PENDING orders
 * to PROCESSING status every 5 minutes.
 *
 * Uses node-cron for reliable, crontab-style scheduling.
 */
export function startScheduler(): void {
  logger.info("⏰ Cron scheduler started: PENDING → PROCESSING every 5 minutes");

  cron.schedule("*/5 * * * *", async () => {
    if (isRunning) {
      logger.warn("⚠️  [Cron] Previous promotion job execution is still in progress. Skipping overlapping run.");
      return;
    }

    isRunning = true;

    try {
      const count = await orderService.promotePendingOrders();

      if (count > 0) {
        logger.info(
          `✅ [Cron] Promoted ${count} order(s) from PENDING to PROCESSING`
        );
      } else {
        logger.debug("ℹ️  [Cron] No PENDING orders to promote");
      }
    } catch (error) {
      logger.error({ err: error }, "❌ [Cron] Error promoting pending orders");
    } finally {
      isRunning = false;
    }
  });
}
