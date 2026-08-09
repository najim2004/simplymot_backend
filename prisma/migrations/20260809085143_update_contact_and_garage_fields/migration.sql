-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "garage_name" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "primary_contact" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "user_id" TEXT;

-- CreateIndex
CREATE INDEX "contacts_user_id_idx" ON "contacts"("user_id");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
