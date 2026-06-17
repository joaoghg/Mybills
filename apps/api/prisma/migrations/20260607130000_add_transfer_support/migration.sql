-- AlterTable
ALTER TABLE "categories" ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "transfer_group_id" TEXT;

-- CreateIndex
CREATE INDEX "transactions_transfer_group_id_idx" ON "transactions"("transfer_group_id");
