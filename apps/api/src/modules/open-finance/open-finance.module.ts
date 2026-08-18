import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/modules/database/database.module';
import { OpenFinanceConnectionsController } from './open-finance-connections.controller';
import { OpenFinanceConnectionsService } from './open-finance-connections.service';
import { OpenFinanceQueryController } from './open-finance-query.controller';
import { OpenFinanceQueryService } from './open-finance-query.service';
import { OpenFinanceSyncService } from './open-finance-sync.service';
import { OpenFinanceSyncWorker } from './open-finance-sync.worker';
import { OpenFinanceWebhookController } from './open-finance-webhook.controller';
import {
  OPEN_FINANCE_CANONICAL_REPOSITORY,
  OPEN_FINANCE_SYNC_REPOSITORY
} from './open-finance.tokens';
import { PLUGGY_CLIENT_PORT } from './providers/pluggy.constants';
import { PluggySdkClientAdapter } from './providers/pluggy-sdk.adapter';
import { PrismaOpenFinanceCanonicalRepository } from './repositories/prisma/prisma-open-finance-canonical.repository';
import { PrismaOpenFinanceConnectionRepository } from './repositories/prisma/prisma-open-finance-connection.repository';
import { PrismaOpenFinanceSyncRepository } from './repositories/prisma/prisma-open-finance-sync.repository';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [
    OpenFinanceConnectionsController,
    OpenFinanceQueryController,
    OpenFinanceWebhookController
  ],
  providers: [
    OpenFinanceConnectionsService,
    OpenFinanceSyncService,
    OpenFinanceSyncWorker,
    OpenFinanceQueryService,
    {
      provide: PLUGGY_CLIENT_PORT,
      useClass: PluggySdkClientAdapter
    },
    {
      provide: 'OpenFinanceConnectionRepository',
      useClass: PrismaOpenFinanceConnectionRepository
    },
    {
      provide: OPEN_FINANCE_SYNC_REPOSITORY,
      useClass: PrismaOpenFinanceSyncRepository
    },
    {
      provide: OPEN_FINANCE_CANONICAL_REPOSITORY,
      useClass: PrismaOpenFinanceCanonicalRepository
    }
  ],
  exports: [OpenFinanceConnectionsService, OpenFinanceSyncService, OpenFinanceQueryService]
})
export class OpenFinanceModule {}
