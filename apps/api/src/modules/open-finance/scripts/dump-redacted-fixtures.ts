import { writeFileSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { Env } from 'src/config/env.validation';
import { PluggySdkClientAdapter } from '../providers/pluggy-sdk.adapter';

function redactUnknown(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactUnknown(entry));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const redacted: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(record)) {
      const lowered = key.toLowerCase();
      if (
        lowered.includes('tax') ||
        lowered.includes('document') ||
        lowered.includes('cpf') ||
        lowered.includes('cnpj') ||
        lowered.includes('number') ||
        lowered.includes('identity') ||
        lowered === 'owner' ||
        lowered === 'value' && typeof entry === 'string'
      ) {
        redacted[key] = typeof entry === 'string' ? 'REDACTED' : redactUnknown(entry);
        continue;
      }

      redacted[key] = redactUnknown(entry);
    }

    return redacted;
  }

  return value;
}

async function main(): Promise<void> {
  const itemId = process.argv.find((value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );

  if (!itemId) {
    throw new Error('A Pluggy item UUID is required');
  }

  const adapter = new PluggySdkClientAdapter(
    new ConfigService<Env>({
      PLUGGY_CLIENT_ID: process.env.PLUGGY_CLIENT_ID,
      PLUGGY_CLIENT_SECRET: process.env.PLUGGY_CLIENT_SECRET
    })
  );

  const item = await adapter.fetchItem(itemId);
  const accounts = await adapter.fetchAccounts(itemId);
  const creditAccount = accounts.find((account) => account.type === 'CREDIT');
  const bills = creditAccount
    ? (await adapter.fetchCreditCardBills({ accountId: creditAccount.id, page: 1, pageSize: 20 }))
        .results
    : [];
  const bankAccount = accounts.find((account) => account.type === 'BANK');
  const transactions = bankAccount
    ? (await adapter.fetchTransactionsPage({ accountId: bankAccount.id })).results.slice(0, 5)
    : [];
  const investments = (await adapter.fetchInvestmentsPage({ itemId, page: 1, pageSize: 20 })).results;
  const firstInvestment = investments[0];
  const investmentTransactions = firstInvestment
    ? (
        await adapter.fetchInvestmentTransactionsPage({
          investmentId: firstInvestment.id,
          page: 1,
          pageSize: 20
        })
      ).results
    : [];

  const fixture = redactUnknown({
    source: 'pluggy-sandbox-live-probe',
    confirmed: {
      sdkVersion: '0.90.0',
      transactionsV2InSdk: true,
      investmentTransactionPaginationInSdk: true,
      restFallbackForCreatedTransactionsLink: true,
      connectorId: item.connector.id,
      itemStatus: item.status
    },
    item: {
      id: item.id,
      connector: { id: item.connector.id, name: item.connector.name, isSandbox: item.connector.isSandbox },
      status: item.status
    },
    accounts,
    bills,
    transactions,
    investments,
    investmentTransactions
  });

  const outputPath = join(__dirname, '../test/fixtures/redacted-pluggy-payloads.json');
  writeFileSync(outputPath, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`Wrote redacted fixtures to ${outputPath}`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
