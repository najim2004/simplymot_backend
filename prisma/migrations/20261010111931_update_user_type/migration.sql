/*
  Warnings:

  - You are about to drop the column `type` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `BookingItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BookingItem" DROP CONSTRAINT "BookingItem_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "BookingItem" DROP CONSTRAINT "BookingItem_service_id_fkey";

-- DropIndex
DROP INDEX "users_type_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "type",
ADD COLUMN     "kind" "UserKind" NOT NULL DEFAULT 'USER';

-- DropTable
DROP TABLE "BookingItem";

-- CreateTable
CREATE TABLE "booking_items" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "booking_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_items_booking_id_idx" ON "booking_items"("booking_id");

-- CreateIndex
CREATE INDEX "booking_items_service_id_idx" ON "booking_items"("service_id");

-- CreateIndex
CREATE INDEX "users_kind_idx" ON "users"("kind");

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
