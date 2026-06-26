/*
  Warnings:

  - The primary key for the `order_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `product_name` on the `order_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `price` on the `order_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - The primary key for the `orders` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `customer_name` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - Changed the type of `id` on the `order_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `order_id` on the `order_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_order_id_fkey";

-- AlterTable
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "order_id",
ADD COLUMN     "order_id" UUID NOT NULL,
ALTER COLUMN "product_name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "price" SET DATA TYPE DECIMAL(12,2),
ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "orders" DROP CONSTRAINT "orders_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "customer_name" SET DATA TYPE VARCHAR(255),
ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
