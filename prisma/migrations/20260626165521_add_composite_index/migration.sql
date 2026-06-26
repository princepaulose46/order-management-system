-- DropIndex
DROP INDEX "orders_created_at_idx";

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at" DESC);
