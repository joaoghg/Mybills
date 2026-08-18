/**
 * Environment-guarded financial-data cutover.
 *
 * Preserves `_prisma_migrations`, users, and system categories unless
 * OPEN_FINANCE_CUTOVER_FULL_RESET=true.
 *
 * Required:
 *   OPEN_FINANCE_CUTOVER_CONFIRM=DELETE_FINANCIAL_DATA
 * Optional:
 *   OPEN_FINANCE_CUTOVER_ALLOW_PRODUCTION=true (otherwise production is refused)
 */
import { PrismaClient } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const CONFIRMATION = 'DELETE_FINANCIAL_DATA';

async function main(): Promise<void> {
  if (process.env.OPEN_FINANCE_CUTOVER_CONFIRM !== CONFIRMATION) {
    throw new Error(
      `Refusing cutover. Set OPEN_FINANCE_CUTOVER_CONFIRM=${CONFIRMATION} to proceed.`
    );
  }

  if (process.env.NODE_ENV === 'production' && process.env.OPEN_FINANCE_CUTOVER_ALLOW_PRODUCTION !== 'true') {
    throw new Error('Refusing production cutover without OPEN_FINANCE_CUTOVER_ALLOW_PRODUCTION=true');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const fullReset = process.env.OPEN_FINANCE_CUTOVER_FULL_RESET === 'true';
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('TRUNCATE TABLE "investment_transactions" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "investments" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "open_finance_bill_finance_charges" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "open_finance_bill_payments" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "open_finance_transactions" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "open_finance_bills" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "open_finance_accounts" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "open_finance_sync_runs" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "open_finance_webhook_events" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "open_finance_product_sync_states" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "open_finance_connections" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "transactions" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "transaction_series" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "invoices" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "credit_cards" CASCADE');
      await tx.$executeRawUnsafe('TRUNCATE TABLE "accounts" CASCADE');

      if (fullReset) {
        await tx.$executeRawUnsafe('TRUNCATE TABLE "categories" CASCADE');
        await tx.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
        return;
      }

      await tx.category.deleteMany({
        where: { isSystem: false }
      });
    });
  } finally {
    await prisma.$disconnect();
  }
}

void main();
