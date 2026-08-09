/*
  Warnings:

  - You are about to drop the column `ends_at` on the `break_times` table. All the data in the column will be lost.
  - You are about to drop the column `schedule_id` on the `break_times` table. All the data in the column will be lost.
  - You are about to drop the column `starts_at` on the `break_times` table. All the data in the column will be lost.
  - Added the required column `schedule_interval_id` to the `break_times` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "break_times" DROP CONSTRAINT "break_times_schedule_id_fkey";

-- DropIndex
DROP INDEX "break_times_schedule_id_idx";

-- DropIndex
DROP INDEX "break_times_starts_at_ends_at_idx";

-- AlterTable
ALTER TABLE "break_times" DROP COLUMN "ends_at",
DROP COLUMN "schedule_id",
DROP COLUMN "starts_at",
ADD COLUMN     "end_time" TIME(6),
ADD COLUMN     "schedule_interval_id" TEXT NOT NULL,
ADD COLUMN     "start_time" TIME(6);

-- CreateIndex
CREATE INDEX "break_times_schedule_interval_id_idx" ON "break_times"("schedule_interval_id");

-- AddForeignKey
ALTER TABLE "break_times" ADD CONSTRAINT "break_times_schedule_interval_id_fkey" FOREIGN KEY ("schedule_interval_id") REFERENCES "schedule_intervals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
