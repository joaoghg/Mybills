-- CreateEnum
CREATE TYPE "FinancialSource" AS ENUM ('MANUAL', 'PLUGGY');
CREATE TYPE "OpenFinanceConnectionStatus" AS ENUM ('ACTIVE', 'DISCONNECTED');
CREATE TYPE "OpenFinanceItemStatus" AS ENUM ('UPDATED', 'UPDATING', 'WAITING_USER_INPUT', 'WAITING_USER_ACTION', 'MERGING', 'LOGIN_ERROR', 'OUTDATED');
CREATE TYPE "OpenFinanceProductType" AS ENUM ('ACCOUNTS', 'CREDIT_CARDS', 'TRANSACTIONS', 'INVESTMENTS', 'INVESTMENTS_TRANSACTIONS');
CREATE TYPE "OpenFinanceProductStatus" AS ENUM ('PENDING', 'SUCCESS', 'PARTIAL', 'FAILED', 'UNSUPPORTED');
CREATE TYPE "OpenFinanceSyncTrigger" AS ENUM ('MANUAL', 'WEBHOOK', 'STALE');
CREATE TYPE "OpenFinanceSyncRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');
CREATE TYPE "ProviderAccountType" AS ENUM ('BANK', 'CREDIT');
CREATE TYPE "ProviderTransactionStatus" AS ENUM ('POSTED', 'PENDING');
CREATE TYPE "CashFlowRole" AS ENUM ('NORMAL', 'TRANSFER', 'CARD_PAYMENT', 'INVESTMENT', 'IGNORED');
CREATE TYPE "InvestmentType" AS ENUM ('FIXED_INCOME', 'SECURITY', 'MUTUAL_FUND', 'EQUITY', 'ETF', 'COE', 'OTHER');
CREATE TYPE "InvestmentStatus" AS ENUM ('ACTIVE', 'PENDING', 'TOTAL_WITHDRAWAL');
CREATE TYPE "InvestmentTransactionType" AS ENUM ('BUY', 'SELL', 'TAX', 'TRANSFER', 'INTEREST', 'AMORTIZATION');
CREATE TYPE "BillPaymentValueType" AS ENUM ('INSTALLMENT_PAYMENT', 'FULL_PAYMENT', 'OTHER_PAYMENT');
CREATE TYPE "BillFinanceChargeType" AS ENUM ('LATE_PAYMENT_REMUNERATIVE_INTEREST', 'LATE_PAYMENT_FEE', 'LATE_PAYMENT_INTEREST', 'IOF', 'OTHER');

-- AlterTable accounts
ALTER TABLE "accounts"
  ADD COLUMN "source" "FinancialSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "open_finance_account_id" TEXT,
  ADD COLUMN "overridden_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "hidden_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "accounts_open_finance_account_id_key" ON "accounts"("open_finance_account_id");
CREATE INDEX "accounts_user_id_source_hidden_at_idx" ON "accounts"("user_id", "source", "hidden_at");

-- AlterTable credit_cards
ALTER TABLE "credit_cards"
  ADD COLUMN "source" "FinancialSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "open_finance_account_id" TEXT,
  ADD COLUMN "overridden_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "hidden_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "credit_cards_open_finance_account_id_key" ON "credit_cards"("open_finance_account_id");
CREATE INDEX "credit_cards_user_id_source_hidden_at_idx" ON "credit_cards"("user_id", "source", "hidden_at");

-- AlterTable transactions
ALTER TABLE "transactions"
  ADD COLUMN "source" "FinancialSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "open_finance_transaction_id" TEXT,
  ADD COLUMN "overridden_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "hidden_at" TIMESTAMP(3),
  ADD COLUMN "provider_status" "ProviderTransactionStatus",
  ADD COLUMN "currency_code" TEXT,
  ADD COLUMN "cash_flow_role" "CashFlowRole" NOT NULL DEFAULT 'NORMAL';

CREATE UNIQUE INDEX "transactions_open_finance_transaction_id_key" ON "transactions"("open_finance_transaction_id");
CREATE INDEX "transactions_user_id_source_hidden_at_idx" ON "transactions"("user_id", "source", "hidden_at");

-- CreateTable
CREATE TABLE "open_finance_connections" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "connector_id" INTEGER NOT NULL,
  "status" "OpenFinanceConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
  "item_status" "OpenFinanceItemStatus",
  "institution_name" TEXT,
  "institution_logo_url" TEXT,
  "last_successful_sync_at" TIMESTAMP(3),
  "last_sync_attempt_at" TIMESTAMP(3),
  "error_code" TEXT,
  "error_i18n_key" TEXT,
  "disconnected_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "open_finance_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "open_finance_connections_item_id_key" ON "open_finance_connections"("item_id");
CREATE INDEX "open_finance_connections_user_id_status_idx" ON "open_finance_connections"("user_id", "status");
CREATE INDEX "open_finance_connections_status_last_successful_sync_at_idx" ON "open_finance_connections"("status", "last_successful_sync_at");

CREATE TABLE "open_finance_product_sync_states" (
  "id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "product" "OpenFinanceProductType" NOT NULL,
  "status" "OpenFinanceProductStatus" NOT NULL DEFAULT 'PENDING',
  "last_successful_sync_at" TIMESTAMP(3),
  "error_code" TEXT,
  "error_i18n_key" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "open_finance_product_sync_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "open_finance_product_sync_states_connection_id_product_key" ON "open_finance_product_sync_states"("connection_id", "product");

CREATE TABLE "open_finance_webhook_events" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "item_id" TEXT,
  "account_id" TEXT,
  "payload_metadata" JSONB NOT NULL,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "open_finance_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "open_finance_webhook_events_event_id_key" ON "open_finance_webhook_events"("event_id");
CREATE INDEX "open_finance_webhook_events_item_id_created_at_idx" ON "open_finance_webhook_events"("item_id", "created_at");

CREATE TABLE "open_finance_sync_runs" (
  "id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "trigger" "OpenFinanceSyncTrigger" NOT NULL,
  "status" "OpenFinanceSyncRunStatus" NOT NULL DEFAULT 'PENDING',
  "lease_expires_at" TIMESTAMP(3),
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "error_code" TEXT,
  "error_i18n_key" TEXT,
  "webhook_event_id" TEXT,
  "created_transactions_link" TEXT,
  "transaction_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "account_external_id" TEXT,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "open_finance_sync_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "open_finance_sync_runs_connection_id_status_idx" ON "open_finance_sync_runs"("connection_id", "status");
CREATE INDEX "open_finance_sync_runs_status_lease_expires_at_idx" ON "open_finance_sync_runs"("status", "lease_expires_at");
CREATE UNIQUE INDEX "open_finance_sync_runs_one_active_per_connection"
  ON "open_finance_sync_runs"("connection_id")
  WHERE "status" IN ('PENDING', 'RUNNING');

CREATE TABLE "open_finance_accounts" (
  "id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "type" "ProviderAccountType" NOT NULL,
  "subtype" TEXT,
  "name" TEXT NOT NULL,
  "currency_code" TEXT,
  "balance" DECIMAL(19,4) NOT NULL,
  "available_balance" DECIMAL(19,4),
  "credit_limit" DECIMAL(19,4),
  "available_credit_limit" DECIMAL(19,4),
  "brand" TEXT,
  "provider_status" TEXT,
  "closing_date" TIMESTAMP(3),
  "due_date" TIMESTAMP(3),
  "provider_created_at" TIMESTAMP(3),
  "provider_updated_at" TIMESTAMP(3),
  "raw_payload" JSONB NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL,
  "unavailable_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "open_finance_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "open_finance_accounts_connection_id_external_id_key" ON "open_finance_accounts"("connection_id", "external_id");
CREATE INDEX "open_finance_accounts_connection_id_unavailable_at_idx" ON "open_finance_accounts"("connection_id", "unavailable_at");

CREATE TABLE "open_finance_bills" (
  "id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "due_on" TIMESTAMP(3) NOT NULL,
  "closing_on" TIMESTAMP(3),
  "total_amount" DECIMAL(19,4) NOT NULL,
  "minimum_payment_amount" DECIMAL(19,4),
  "currency_code" TEXT NOT NULL,
  "allows_installments" BOOLEAN,
  "provider_created_at" TIMESTAMP(3),
  "provider_updated_at" TIMESTAMP(3),
  "raw_payload" JSONB NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL,
  "unavailable_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "open_finance_bills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "open_finance_bills_account_id_external_id_key" ON "open_finance_bills"("account_id", "external_id");
CREATE INDEX "open_finance_bills_account_id_due_on_idx" ON "open_finance_bills"("account_id", "due_on");

CREATE TABLE "open_finance_bill_payments" (
  "id" TEXT NOT NULL,
  "bill_id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "value_type" "BillPaymentValueType" NOT NULL,
  "payment_date" TIMESTAMP(3) NOT NULL,
  "payment_mode" TEXT,
  "amount" DECIMAL(19,4) NOT NULL,
  "currency_code" TEXT NOT NULL,
  "raw_payload" JSONB NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL,
  "unavailable_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "open_finance_bill_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "open_finance_bill_payments_bill_id_external_id_key" ON "open_finance_bill_payments"("bill_id", "external_id");

CREATE TABLE "open_finance_bill_finance_charges" (
  "id" TEXT NOT NULL,
  "bill_id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "type" "BillFinanceChargeType" NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "currency_code" TEXT NOT NULL,
  "additional_info" TEXT,
  "raw_payload" JSONB NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL,
  "unavailable_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "open_finance_bill_finance_charges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "open_finance_bill_finance_charges_bill_id_external_id_key" ON "open_finance_bill_finance_charges"("bill_id", "external_id");

CREATE TABLE "open_finance_transactions" (
  "id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "bill_id" TEXT,
  "external_id" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" "TransactionType" NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "currency_code" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "status" "ProviderTransactionStatus" NOT NULL,
  "provider_category_id" TEXT,
  "provider_category_name" TEXT,
  "payment_method" TEXT,
  "payment_reference" TEXT,
  "merchant_name" TEXT,
  "operation_type" TEXT,
  "same_day_order" INTEGER,
  "bill_forecast_month" TEXT,
  "credit_card_metadata" JSONB,
  "payment_participants" JSONB,
  "cash_flow_role" "CashFlowRole" NOT NULL DEFAULT 'NORMAL',
  "classification_evidence" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "provider_created_at" TIMESTAMP(3),
  "provider_updated_at" TIMESTAMP(3),
  "raw_payload" JSONB NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL,
  "unavailable_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "open_finance_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "open_finance_transactions_account_id_external_id_key" ON "open_finance_transactions"("account_id", "external_id");
CREATE INDEX "open_finance_transactions_account_id_date_idx" ON "open_finance_transactions"("account_id", "date");
CREATE INDEX "open_finance_transactions_account_id_unavailable_at_idx" ON "open_finance_transactions"("account_id", "unavailable_at");

CREATE TABLE "investments" (
  "id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "isin" TEXT,
  "number" TEXT,
  "type" "InvestmentType" NOT NULL,
  "subtype" TEXT,
  "status" "InvestmentStatus",
  "currency_code" TEXT,
  "balance" DECIMAL(19,4) NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "amount_original" DECIMAL(19,4),
  "amount_profit" DECIMAL(19,4),
  "amount_withdrawal" DECIMAL(19,4),
  "taxes" DECIMAL(19,4),
  "taxes2" DECIMAL(19,4),
  "quantity" DECIMAL(28,10),
  "value" DECIMAL(28,10),
  "last_month_rate" DECIMAL(19,8),
  "last_twelve_months_rate" DECIMAL(19,8),
  "annual_rate" DECIMAL(19,8),
  "rate" DECIMAL(19,8),
  "rate_type" TEXT,
  "fixed_annual_rate" DECIMAL(19,8),
  "issuer" TEXT,
  "issue_date" TIMESTAMP(3),
  "due_date" TIMESTAMP(3),
  "grace_period_date" TIMESTAMP(3),
  "date" TIMESTAMP(3),
  "institution_name" TEXT,
  "provider_created_at" TIMESTAMP(3),
  "provider_updated_at" TIMESTAMP(3),
  "raw_payload" JSONB NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL,
  "unavailable_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "investments_connection_id_external_id_key" ON "investments"("connection_id", "external_id");
CREATE INDEX "investments_connection_id_unavailable_at_idx" ON "investments"("connection_id", "unavailable_at");

CREATE TABLE "investment_transactions" (
  "id" TEXT NOT NULL,
  "investment_id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "type" "InvestmentTransactionType" NOT NULL,
  "description" TEXT,
  "quantity" DECIMAL(28,10),
  "value" DECIMAL(28,10),
  "amount" DECIMAL(19,4),
  "net_amount" DECIMAL(19,4),
  "agreed_rate" DECIMAL(19,8),
  "date" TIMESTAMP(3) NOT NULL,
  "trade_date" TIMESTAMP(3),
  "brokerage_number" TEXT,
  "expenses" JSONB,
  "provider_created_at" TIMESTAMP(3),
  "provider_updated_at" TIMESTAMP(3),
  "raw_payload" JSONB NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL,
  "unavailable_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "investment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "investment_transactions_investment_id_external_id_key" ON "investment_transactions"("investment_id", "external_id");
CREATE INDEX "investment_transactions_investment_id_date_idx" ON "investment_transactions"("investment_id", "date");

-- Foreign keys
ALTER TABLE "open_finance_connections"
  ADD CONSTRAINT "open_finance_connections_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "open_finance_product_sync_states"
  ADD CONSTRAINT "open_finance_product_sync_states_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "open_finance_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "open_finance_sync_runs"
  ADD CONSTRAINT "open_finance_sync_runs_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "open_finance_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "open_finance_sync_runs"
  ADD CONSTRAINT "open_finance_sync_runs_webhook_event_id_fkey"
  FOREIGN KEY ("webhook_event_id") REFERENCES "open_finance_webhook_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "open_finance_accounts"
  ADD CONSTRAINT "open_finance_accounts_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "open_finance_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_open_finance_account_id_fkey"
  FOREIGN KEY ("open_finance_account_id") REFERENCES "open_finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "credit_cards"
  ADD CONSTRAINT "credit_cards_open_finance_account_id_fkey"
  FOREIGN KEY ("open_finance_account_id") REFERENCES "open_finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "open_finance_bills"
  ADD CONSTRAINT "open_finance_bills_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "open_finance_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "open_finance_bill_payments"
  ADD CONSTRAINT "open_finance_bill_payments_bill_id_fkey"
  FOREIGN KEY ("bill_id") REFERENCES "open_finance_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "open_finance_bill_finance_charges"
  ADD CONSTRAINT "open_finance_bill_finance_charges_bill_id_fkey"
  FOREIGN KEY ("bill_id") REFERENCES "open_finance_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "open_finance_transactions"
  ADD CONSTRAINT "open_finance_transactions_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "open_finance_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "open_finance_transactions"
  ADD CONSTRAINT "open_finance_transactions_bill_id_fkey"
  FOREIGN KEY ("bill_id") REFERENCES "open_finance_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_open_finance_transaction_id_fkey"
  FOREIGN KEY ("open_finance_transaction_id") REFERENCES "open_finance_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "investments"
  ADD CONSTRAINT "investments_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "open_finance_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investment_transactions"
  ADD CONSTRAINT "investment_transactions_investment_id_fkey"
  FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
