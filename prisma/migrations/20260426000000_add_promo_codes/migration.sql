-- CreateEnum
CREATE TYPE "PromoCodeDuration" AS ENUM ('ONCE', 'REPEATING', 'FOREVER');

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "percent_off" INTEGER NOT NULL DEFAULT 100,
    "duration" "PromoCodeDuration" NOT NULL,
    "duration_days" INTEGER,
    "duration_in_months" INTEGER,
    "max_redemptions" INTEGER,
    "redeemed_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stripe_coupon_id" TEXT NOT NULL,
    "stripe_promotion_code_id" TEXT NOT NULL,
    "created_by_id" TEXT,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_stripe_promotion_code_id_key" ON "promo_codes"("stripe_promotion_code_id");

-- CreateIndex
CREATE INDEX "promo_codes_is_active_idx" ON "promo_codes"("is_active");

-- CreateIndex
CREATE INDEX "promo_codes_duration_idx" ON "promo_codes"("duration");
