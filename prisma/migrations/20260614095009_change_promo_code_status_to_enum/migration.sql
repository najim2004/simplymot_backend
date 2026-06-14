/*
  Warnings:

  - You are about to drop the column `text` on the `notification_events` table. All the data in the column will be lost.
  - The `status` column on the `notification_events` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `notifications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `order_id` on the `payment_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `store_id` on the `payment_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `payment_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `withdraw_via` on the `payment_transactions` table. All the data in the column will be lost.
  - The `status` column on the `payment_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `amount` on the `payment_transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `paid_amount` on the `payment_transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - The `status` column on the `permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `is_active` on the `promo_codes` table. All the data in the column will be lost.
  - The `status` column on the `roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `ucodes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `availability` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `date_of_birth` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `domain` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_two_factor_enabled` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `two_factor_secret` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `zip_code` on the `users` table. All the data in the column will be lost.
  - The `status` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `conversations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `faqs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `social_medias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_payment_methods` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `website_infos` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserKind" AS ENUM ('USER', 'DRIVER', 'GARAGE', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "UcodeStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RoleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "NotificationEventStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubscriptionPlanStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'PAUSED', 'INACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromoCodeStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentTransactionKind" AS ENUM ('SUBSCRIPTION', 'ORDER', 'ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceKind" AS ENUM ('BOOKING', 'SUBSCRIPTION', 'MANUAL', 'ADJUSTMENT', 'CREDIT_NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "TimeSlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'BLOCKED', 'BREAK');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('MOT', 'RETEST', 'OTHERS');

-- CreateEnum
CREATE TYPE "PriceMigrationJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PriceMigrationJobKind" AS ENUM ('NOTICE', 'MIGRATION');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PRICE_CHANGE', 'MIGRATION', 'CANCELLATION', 'WEBHOOK', 'SYSTEM');

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_creator_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_participant_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_attachment_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_receiver_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_receiver_id_fkey";

-- DropForeignKey
ALTER TABLE "ucodes" DROP CONSTRAINT "ucodes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_payment_methods" DROP CONSTRAINT "user_payment_methods_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_setting_id_fkey";

-- DropForeignKey
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_user_id_fkey";

-- DropIndex
DROP INDEX "promo_codes_is_active_idx";

-- DropIndex
DROP INDEX "users_domain_key";

-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contacts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notification_events" DROP COLUMN "text",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "NotificationEventStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "updated_at" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD';

-- AlterTable
ALTER TABLE "payment_transactions" DROP COLUMN "order_id",
DROP COLUMN "store_id",
DROP COLUMN "type",
DROP COLUMN "withdraw_via",
ADD COLUMN     "booking_id" TEXT,
ADD COLUMN     "entity_id" TEXT,
ADD COLUMN     "invoice_id" TEXT,
ADD COLUMN     "kind" "PaymentTransactionKind" NOT NULL DEFAULT 'SUBSCRIPTION',
ALTER COLUMN "updated_at" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "paid_amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "permission_roles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "permissions" ALTER COLUMN "updated_at" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "PermissionStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "promo_codes" DROP COLUMN "is_active",
ADD COLUMN     "status" "PromoCodeStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "role_users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "updated_at" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "RoleStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ucodes" ALTER COLUMN "updated_at" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "UcodeStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "user_settings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "availability",
DROP COLUMN "date_of_birth",
DROP COLUMN "domain",
DROP COLUMN "first_name",
DROP COLUMN "gender",
DROP COLUMN "is_two_factor_enabled",
DROP COLUMN "last_name",
DROP COLUMN "two_factor_secret",
DROP COLUMN "zip_code",
ADD COLUMN     "banned_at" TIMESTAMP(3),
ADD COLUMN     "post_code" TEXT,
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "UserAccountStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "type",
ADD COLUMN     "type" "UserKind" NOT NULL DEFAULT 'USER';

-- DropTable
DROP TABLE "attachments";

-- DropTable
DROP TABLE "conversations";

-- DropTable
DROP TABLE "faqs";

-- DropTable
DROP TABLE "messages";

-- DropTable
DROP TABLE "social_medias";

-- DropTable
DROP TABLE "user_payment_methods";

-- DropTable
DROP TABLE "website_infos";

-- DropEnum
DROP TYPE "MessageStatus";

-- CreateTable
CREATE TABLE "garages" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "owner_id" TEXT NOT NULL,
    "garage_image" TEXT,
    "garage_name" VARCHAR(255),
    "contact_email" TEXT,
    "phone_number" TEXT,
    "vts_number" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "address" TEXT,
    "post_code" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "garages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "garage_id" TEXT NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_intervals" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "slot_duration" INTEGER DEFAULT 60,
    "buffer_time" INTEGER DEFAULT 0,
    "open_time" TIME(6),
    "close_time" TIME(6),
    "schedule_id" TEXT NOT NULL,

    CONSTRAINT "schedule_intervals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "break_times" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "description" TEXT,
    "schedule_id" TEXT NOT NULL,

    CONSTRAINT "break_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "schedule_id" TEXT NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_slots" (
    "id" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "TimeSlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "description" TEXT,
    "garage_id" TEXT,
    "booking_id" TEXT,
    "schedule_id" TEXT,
    "customer_id" TEXT,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "price" DECIMAL(12,2),
    "garage_id" TEXT NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "mot_expiry_date" TIMESTAMP(3),
    "mot_last_checked_at" TIMESTAMP(3),
    "reminder_last_sent_at" TIMESTAMP(3),
    "year_of_manufacture" INTEGER,
    "user_id" TEXT,
    "registration_number" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "fuel_type" TEXT,
    "engine_capacity" INTEGER,
    "co2_emissions" INTEGER,
    "mot_status" TEXT,
    "is_expired" BOOLEAN NOT NULL DEFAULT false,
    "raw_mot_data" JSONB,
    "raw_dvla_data" JSONB,
    "raw_mot_status" TEXT,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mot_history" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "test_number" TEXT,
    "test_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "status" TEXT,
    "odometer_value" INTEGER,
    "odometer_unit" TEXT,
    "odometer_result_type" TEXT,
    "data_source" TEXT,
    "registration_at_test" TEXT,
    "raw_data" JSONB,

    CONSTRAINT "mot_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mot_defect" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "mot_report_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "dangerous" BOOLEAN NOT NULL,
    "raw_data" JSONB,

    CONSTRAINT "mot_defect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_pence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "SubscriptionPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripe_price_id" TEXT,
    "stripe_product_id" TEXT,
    "period_type" "PeriodType" NOT NULL DEFAULT 'MONTH',
    "is_legacy_price" BOOLEAN NOT NULL DEFAULT false,
    "trial_period_days" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "next_billing_date" TIMESTAMP(3),
    "cancel_at" TIMESTAMP(3),
    "plan_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "user_id" TEXT NOT NULL,
    "price_pence" INTEGER NOT NULL,
    "currency" TEXT DEFAULT 'GBP',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancel_at_period_end" BOOLEAN DEFAULT false,
    "cancellation_reason" TEXT,
    "is_grandfathered" BOOLEAN NOT NULL DEFAULT false,
    "notice_sent_at" TIMESTAMP(3),
    "migration_scheduled_at" TIMESTAMP(3),
    "original_price_pence" INTEGER,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_migration_jobs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "plan_id" TEXT NOT NULL,
    "kind" "PriceMigrationJobKind" NOT NULL,
    "status" "PriceMigrationJobStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,

    CONSTRAINT "price_migration_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_migration_job_attempts" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "job_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "subscriber_id" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "retry_after" TIMESTAMP(3),

    CONSTRAINT "price_migration_job_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "customer_id" TEXT,
    "slot_id" TEXT,
    "additional_services" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "vehicle_id" TEXT,
    "garage_id" TEXT,
    "total_amount" DECIMAL(12,2),
    "cancel_reason" TEXT,
    "cancelled_by" TEXT,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingItem" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "booking_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "BookingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "kind" "InvoiceKind" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "entity_type" TEXT,
    "entity_id" TEXT,
    "customer_id" TEXT,
    "garage_id" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "subtotal_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issued_at" TIMESTAMP(3),
    "due_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "notes" TEXT,
    "payment_terms" TEXT,
    "provider" TEXT,
    "provider_invoice_id" TEXT,
    "provider_hosted_url" TEXT,
    "provider_pdf_url" TEXT,
    "metadata" JSONB,
    "pdf_url" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "item_type" TEXT,
    "item_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_amount" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_code_map" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "postcode" TEXT NOT NULL,
    "outcode" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "source" TEXT DEFAULT 'internal',

    CONSTRAINT "post_code_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actor_id" TEXT,
    "actor_type" TEXT,
    "actor_ip" TEXT,
    "user_agent" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "changes" JSONB,
    "garage_id" TEXT,
    "metadata" JSONB,
    "ip_country" TEXT,
    "is_success" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "garages_contact_email_key" ON "garages"("contact_email");

-- CreateIndex
CREATE INDEX "garages_owner_id_idx" ON "garages"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_garage_id_key" ON "schedules"("garage_id");

-- CreateIndex
CREATE INDEX "schedule_intervals_schedule_id_idx" ON "schedule_intervals"("schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_intervals_schedule_id_day_of_week_key" ON "schedule_intervals"("schedule_id", "day_of_week");

-- CreateIndex
CREATE INDEX "break_times_schedule_id_idx" ON "break_times"("schedule_id");

-- CreateIndex
CREATE INDEX "break_times_starts_at_ends_at_idx" ON "break_times"("starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "holidays_schedule_id_idx" ON "holidays"("schedule_id");

-- CreateIndex
CREATE INDEX "holidays_date_idx" ON "holidays"("date");

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_booking_id_key" ON "time_slots"("booking_id");

-- CreateIndex
CREATE INDEX "time_slots_status_idx" ON "time_slots"("status");

-- CreateIndex
CREATE INDEX "time_slots_garage_id_starts_at_ends_at_idx" ON "time_slots"("garage_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "time_slots_starts_at_ends_at_idx" ON "time_slots"("starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "time_slots_schedule_id_idx" ON "time_slots"("schedule_id");

-- CreateIndex
CREATE INDEX "time_slots_customer_id_idx" ON "time_slots"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_garage_id_starts_at_key" ON "time_slots"("garage_id", "starts_at");

-- CreateIndex
CREATE INDEX "services_garage_id_idx" ON "services"("garage_id");

-- CreateIndex
CREATE INDEX "services_type_idx" ON "services"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registration_number_key" ON "Vehicle"("registration_number");

-- CreateIndex
CREATE INDEX "Vehicle_user_id_idx" ON "Vehicle"("user_id");

-- CreateIndex
CREATE INDEX "Vehicle_mot_expiry_date_idx" ON "Vehicle"("mot_expiry_date");

-- CreateIndex
CREATE INDEX "mot_history_vehicle_id_idx" ON "mot_history"("vehicle_id");

-- CreateIndex
CREATE INDEX "mot_history_status_idx" ON "mot_history"("status");

-- CreateIndex
CREATE INDEX "mot_history_test_date_idx" ON "mot_history"("test_date");

-- CreateIndex
CREATE INDEX "mot_defect_mot_report_id_idx" ON "mot_defect"("mot_report_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE INDEX "subscription_plans_status_idx" ON "subscription_plans"("status");

-- CreateIndex
CREATE INDEX "subscription_plans_is_legacy_price_idx" ON "subscription_plans"("is_legacy_price");

-- CreateIndex
CREATE INDEX "subscription_plans_stripe_price_id_idx" ON "subscription_plans"("stripe_price_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_stripe_subscription_id_idx" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "subscriptions_is_grandfathered_migration_scheduled_at_idx" ON "subscriptions"("is_grandfathered", "migration_scheduled_at");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_status_idx" ON "subscriptions"("plan_id", "status");

-- CreateIndex
CREATE INDEX "price_migration_jobs_status_idx" ON "price_migration_jobs"("status");

-- CreateIndex
CREATE INDEX "price_migration_jobs_kind_idx" ON "price_migration_jobs"("kind");

-- CreateIndex
CREATE INDEX "price_migration_jobs_created_at_idx" ON "price_migration_jobs"("created_at");

-- CreateIndex
CREATE INDEX "price_migration_jobs_plan_id_status_created_at_idx" ON "price_migration_jobs"("plan_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "price_migration_job_attempts_job_id_idx" ON "price_migration_job_attempts"("job_id");

-- CreateIndex
CREATE INDEX "price_migration_job_attempts_subscription_id_idx" ON "price_migration_job_attempts"("subscription_id");

-- CreateIndex
CREATE INDEX "price_migration_job_attempts_subscriber_id_idx" ON "price_migration_job_attempts"("subscriber_id");

-- CreateIndex
CREATE INDEX "price_migration_job_attempts_retry_after_idx" ON "price_migration_job_attempts"("retry_after");

-- CreateIndex
CREATE INDEX "price_migration_job_attempts_created_at_idx" ON "price_migration_job_attempts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_slot_id_key" ON "bookings"("slot_id");

-- CreateIndex
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");

-- CreateIndex
CREATE INDEX "bookings_vehicle_id_idx" ON "bookings"("vehicle_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_order_date_idx" ON "bookings"("order_date");

-- CreateIndex
CREATE INDEX "bookings_garage_id_status_order_date_idx" ON "bookings"("garage_id", "status", "order_date");

-- CreateIndex
CREATE INDEX "BookingItem_booking_id_idx" ON "BookingItem"("booking_id");

-- CreateIndex
CREATE INDEX "BookingItem_service_id_idx" ON "BookingItem"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_garage_id_idx" ON "invoices"("garage_id");

-- CreateIndex
CREATE INDEX "invoices_entity_type_entity_id_idx" ON "invoices"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_kind_idx" ON "invoices"("kind");

-- CreateIndex
CREATE INDEX "invoices_issued_at_idx" ON "invoices"("issued_at");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_items_item_type_item_id_idx" ON "invoice_items"("item_type", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_code_map_postcode_key" ON "post_code_map"("postcode");

-- CreateIndex
CREATE INDEX "post_code_map_outcode_idx" ON "post_code_map"("outcode");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_table_name_record_id_idx" ON "audit_logs"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_garage_id_created_at_idx" ON "audit_logs"("garage_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_table_name_action_idx" ON "audit_logs"("table_name", "action");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_deleted_at_idx" ON "contacts"("deleted_at");

-- CreateIndex
CREATE INDEX "notification_events_type_idx" ON "notification_events"("type");

-- CreateIndex
CREATE INDEX "notification_events_status_idx" ON "notification_events"("status");

-- CreateIndex
CREATE INDEX "notification_events_deleted_at_idx" ON "notification_events"("deleted_at");

-- CreateIndex
CREATE INDEX "notifications_notification_event_id_idx" ON "notifications"("notification_event_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_receiver_id_read_at_idx" ON "notifications"("receiver_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_deleted_at_idx" ON "notifications"("deleted_at");

-- CreateIndex
CREATE INDEX "payment_transactions_user_id_idx" ON "payment_transactions"("user_id");

-- CreateIndex
CREATE INDEX "payment_transactions_booking_id_idx" ON "payment_transactions"("booking_id");

-- CreateIndex
CREATE INDEX "payment_transactions_invoice_id_idx" ON "payment_transactions"("invoice_id");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_kind_idx" ON "payment_transactions"("kind");

-- CreateIndex
CREATE INDEX "payment_transactions_reference_number_idx" ON "payment_transactions"("reference_number");

-- CreateIndex
CREATE INDEX "payment_transactions_created_at_idx" ON "payment_transactions"("created_at");

-- CreateIndex
CREATE INDEX "permission_roles_role_id_idx" ON "permission_roles"("role_id");

-- CreateIndex
CREATE INDEX "permission_roles_permission_id_idx" ON "permission_roles"("permission_id");

-- CreateIndex
CREATE INDEX "permissions_status_idx" ON "permissions"("status");

-- CreateIndex
CREATE INDEX "permissions_deleted_at_idx" ON "permissions"("deleted_at");

-- CreateIndex
CREATE INDEX "permissions_action_subject_idx" ON "permissions"("action", "subject");

-- CreateIndex
CREATE INDEX "promo_codes_status_idx" ON "promo_codes"("status");

-- CreateIndex
CREATE INDEX "role_users_user_id_idx" ON "role_users"("user_id");

-- CreateIndex
CREATE INDEX "roles_user_id_idx" ON "roles"("user_id");

-- CreateIndex
CREATE INDEX "roles_status_idx" ON "roles"("status");

-- CreateIndex
CREATE INDEX "roles_deleted_at_idx" ON "roles"("deleted_at");

-- CreateIndex
CREATE INDEX "settings_category_idx" ON "settings"("category");

-- CreateIndex
CREATE INDEX "ucodes_user_id_idx" ON "ucodes"("user_id");

-- CreateIndex
CREATE INDEX "ucodes_token_idx" ON "ucodes"("token");

-- CreateIndex
CREATE INDEX "ucodes_expired_at_idx" ON "ucodes"("expired_at");

-- CreateIndex
CREATE INDEX "user_settings_setting_id_idx" ON "user_settings"("setting_id");

-- CreateIndex
CREATE INDEX "user_settings_user_id_setting_id_idx" ON "user_settings"("user_id", "setting_id");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_type_idx" ON "users"("type");

-- CreateIndex
CREATE INDEX "users_billing_id_idx" ON "users"("billing_id");

-- AddForeignKey
ALTER TABLE "garages" ADD CONSTRAINT "garages_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_garage_id_fkey" FOREIGN KEY ("garage_id") REFERENCES "garages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_intervals" ADD CONSTRAINT "schedule_intervals_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "break_times" ADD CONSTRAINT "break_times_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_garage_id_fkey" FOREIGN KEY ("garage_id") REFERENCES "garages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_garage_id_fkey" FOREIGN KEY ("garage_id") REFERENCES "garages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ucodes" ADD CONSTRAINT "ucodes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mot_history" ADD CONSTRAINT "mot_history_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mot_defect" ADD CONSTRAINT "mot_defect_mot_report_id_fkey" FOREIGN KEY ("mot_report_id") REFERENCES "mot_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_migration_jobs" ADD CONSTRAINT "price_migration_jobs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_migration_job_attempts" ADD CONSTRAINT "price_migration_job_attempts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "price_migration_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_migration_job_attempts" ADD CONSTRAINT "price_migration_job_attempts_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "time_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_garage_id_fkey" FOREIGN KEY ("garage_id") REFERENCES "garages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_garage_id_fkey" FOREIGN KEY ("garage_id") REFERENCES "garages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
