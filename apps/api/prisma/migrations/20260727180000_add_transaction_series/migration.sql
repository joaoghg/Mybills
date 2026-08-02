-- CreateEnum
CREATE TYPE "TransactionSeriesType" AS ENUM ('INSTALLMENT', 'RECURRING');

-- CreateTable
CREATE TABLE "transaction_series" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "TransactionSeriesType" NOT NULL,
    "account_id" TEXT,
    "category_id" TEXT,
    "card_id" TEXT,
    "description" TEXT,
    "transaction_type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "anchor_date" DATE NOT NULL,
    "anchor_day" INTEGER NOT NULL,
    "total_occurrences" INTEGER,
    "next_occurrence_number" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_series_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "transactions"
ADD COLUMN "series_id" TEXT,
ADD COLUMN "occurrence_number" INTEGER,
ADD COLUMN "is_projected" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "transaction_series_user_id_is_active_idx" ON "transaction_series"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "transactions_series_id_idx" ON "transactions"("series_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_date_idx" ON "transactions"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_series_id_occurrence_number_key" ON "transactions"("series_id", "occurrence_number");

-- AddForeignKey
ALTER TABLE "transaction_series" ADD CONSTRAINT "transaction_series_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "transaction_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
