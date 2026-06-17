import { Module, forwardRef } from '@nestjs/common';
import { AccountsModule } from 'src/modules/accounts/accounts.module';
import { CategoriesModule } from 'src/modules/categories/categories.module';
import { CreditCardsModule } from 'src/modules/credit-cards/credit-cards.module';
import { DatabaseModule } from 'src/modules/database/database.module';
import { PrismaTransactionRepository } from './repositories/prisma/prisma-transaction.repository';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => AccountsModule), CategoriesModule, forwardRef(() => CreditCardsModule)],
  controllers: [TransactionsController],
  providers: [
    {
      provide: 'TransactionRepository',
      useClass: PrismaTransactionRepository
    },
    TransactionsService
  ],
  exports: [TransactionsService]
})
export class TransactionsModule {}
