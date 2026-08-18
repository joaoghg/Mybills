-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "competence_date" DATE;

-- CreateIndex
CREATE INDEX "transactions_user_id_competence_date_idx" ON "transactions"("user_id", "competence_date");
