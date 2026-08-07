-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "date_of_last_v5c_issued" TIMESTAMP(3),
ADD COLUMN     "marked_for_export" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "month_of_first_reg" TEXT,
ADD COLUMN     "revenue_weight" INTEGER,
ADD COLUMN     "tax_due_date" TIMESTAMP(3),
ADD COLUMN     "tax_status" TEXT,
ADD COLUMN     "type_approval" TEXT,
ADD COLUMN     "wheelplan" TEXT;
