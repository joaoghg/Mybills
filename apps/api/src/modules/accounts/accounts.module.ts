import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from 'src/modules/database/database.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { PrismaAccountRepository } from './repositories/prisma/prisma-account.repository';

@Module({
  imports: [DatabaseModule, forwardRef(() => TransactionsModule)],
  controllers: [AccountsController],
  providers: [
    {
      provide: 'AccountRepository',
      useClass: PrismaAccountRepository
    },
    AccountsService
  ],
  exports: [AccountsService]
})
export class AccountsModule {}
