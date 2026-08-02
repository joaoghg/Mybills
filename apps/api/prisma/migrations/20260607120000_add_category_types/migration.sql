-- CreateEnum
CREATE TYPE "CategoryTransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "types" "CategoryTransactionType"[];

-- Backfill existing categories with both types
UPDATE "categories" SET "types" = ARRAY['INCOME', 'EXPENSE']::"CategoryTransactionType"[];

-- Make column required
ALTER TABLE "categories" ALTER COLUMN "types" SET NOT NULL;
