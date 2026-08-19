import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/modules/app.module';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import { OpenFinanceConnectionsService } from '../open-finance-connections.service';
import { OpenFinanceSyncService } from '../open-finance-sync.service';
import { OpenFinanceSyncWorker } from '../open-finance-sync.worker';

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const itemId = process.argv.find((value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );

  if (!itemId) {
    throw new Error('Usage: ts-node register-and-sync.ts <itemId>');
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  try {
    const prisma = app.get(PrismaService);
    const connections = app.get(OpenFinanceConnectionsService);
    const sync = app.get(OpenFinanceSyncService);
    const worker = app.get(OpenFinanceSyncWorker);

    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!user) {
      throw new Error('No user found. Sign up in the app before registering a connection.');
    }

    const existing = (await connections.list(user.id)).find((connection) => connection.itemId === itemId);
    const connection = existing ?? (await connections.register(user.id, { itemId }));
    const run = await sync.enqueueManual(connection.id, user.id);

    let status = run.status;
    for (let attempt = 0; attempt < 60 && (status === 'PENDING' || status === 'RUNNING'); attempt += 1) {
      await worker.tick();
      const latest = await connections.getSyncRun(connection.id, run.id, user.id);
      status = latest.status;
      if (status === 'PENDING' || status === 'RUNNING') {
        await sleep(2000);
      }
    }

    const [accounts, bills, transactions, investments, investmentTx] = await Promise.all([
      prisma.openFinanceAccount.count({ where: { connectionId: connection.id } }),
      prisma.openFinanceBill.count({ where: { account: { connectionId: connection.id } } }),
      prisma.openFinanceTransaction.count({
        where: { account: { connectionId: connection.id } }
      }),
      prisma.investment.count({ where: { connectionId: connection.id } }),
      prisma.investmentTransaction.count({
        where: { investment: { connectionId: connection.id } }
      })
    ]);

    process.stdout.write(
      `${JSON.stringify(
        {
          userId: user.id,
          connectionId: connection.id,
          itemStatus: connection.itemStatus,
          institutionName: connection.institutionName,
          syncRunId: run.id,
          syncStatus: status,
          accounts,
          bills,
          transactions,
          investments,
          investmentTransactions: investmentTx
        },
        null,
        2
      )}\n`
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
