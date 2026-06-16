import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/modules/database/database.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { PrismaAccountRepository } from './repositories/prisma/prisma-account.repository';

@Module({
  imports: [DatabaseModule],
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
