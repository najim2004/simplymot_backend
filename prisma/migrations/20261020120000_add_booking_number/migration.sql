-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "booking_number" TEXT;

-- Backfill existing bookings with sequential human-readable booking numbers
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "created_at" ASC) AS "rn"
  FROM "bookings"
)
UPDATE "bookings" AS b
SET "booking_number" = 'SM-' || LPAD(o."rn"::TEXT, 6, '0')
FROM ordered AS o
WHERE b."id" = o."id";

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_number_key" ON "bookings"("booking_number");
