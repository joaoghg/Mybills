-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "allows_installments" BOOLEAN,
ADD COLUMN     "currency_code" TEXT,
ADD COLUMN     "minimum_payment_amount" INTEGER,
ADD COLUMN     "open_finance_bill_id" TEXT,
ADD COLUMN     "source" "FinancialSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "invoice_payments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "payment_date" DATE NOT NULL,
    "transaction_id" TEXT,
    "open_finance_bill_payment_id" TEXT,
    "source" "FinancialSource" NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_payments_open_finance_bill_payment_id_key" ON "invoice_payments"("open_finance_bill_payment_id");

-- CreateIndex
CREATE INDEX "invoice_payments_invoice_id_idx" ON "invoice_payments"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_open_finance_bill_id_key" ON "invoices"("open_finance_bill_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_open_finance_bill_id_fkey" FOREIGN KEY ("open_finance_bill_id") REFERENCES "open_finance_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_open_finance_bill_payment_id_fkey" FOREIGN KEY ("open_finance_bill_payment_id") REFERENCES "open_finance_bill_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
