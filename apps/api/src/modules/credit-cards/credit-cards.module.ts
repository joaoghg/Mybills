import { Module, forwardRef } from '@nestjs/common';
import { AccountsModule } from 'src/modules/accounts/accounts.module';
import { DatabaseModule } from 'src/modules/database/database.module';
import { CreditCardsController } from './credit-cards.controller';
import { CreditCardsService } from './credit-cards.service';
import { PrismaCreditCardRepository } from './repositories/prisma/prisma-credit-card.repository';

@Module({
  imports: [DatabaseModule, forwardRef(() => AccountsModule)],
  controllers: [CreditCardsController],
  providers: [
    {
      provide: 'CreditCardRepository',
      useClass: PrismaCreditCardRepository
    },
    CreditCardsService
  ],
  exports: [CreditCardsService]
})
export class CreditCardsModule {}
