import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { existsSync } from 'fs';
import { join } from 'path';
import { AcceptLanguageResolver, HeaderResolver, I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import { validate } from '../config/env.validation';
import { UserModule } from './user/users.module';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { CreditCardsModule } from './credit-cards/credit-cards.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { OpenFinanceModule } from './open-finance/open-finance.module';
import { DomainErrorFilter } from '../common/filters/domain-error.filter';
import { PrismaClientExceptionFilter } from '../common/filters/prisma-client-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validate,
      envFilePath: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'
    }),
    ScheduleModule.forRoot(),
    I18nModule.forRoot({
      fallbackLanguage: 'pt-BR',
      loader: I18nJsonLoader,
      loaderOptions: {
        path: resolveI18nPath(),
        watch: process.env.NODE_ENV !== 'production' && existsSync(join(process.cwd(), 'src', 'i18n'))
      },
      resolvers: [new HeaderResolver(['x-lang']), AcceptLanguageResolver]
    }),
    UserModule,
    AuthModule,
    AccountsModule,
    CreditCardsModule,
    CategoriesModule,
    TransactionsModule,
    OpenFinanceModule
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter
    },
    {
      provide: APP_FILTER,
      useClass: DomainErrorFilter
    }
  ]
})
export class AppModule {}

function resolveI18nPath(): string {
  const sourcePath = join(process.cwd(), 'src', 'i18n');
  if (existsSync(sourcePath)) {
    return sourcePath;
  }

  return join(__dirname, '..', 'i18n');
}
