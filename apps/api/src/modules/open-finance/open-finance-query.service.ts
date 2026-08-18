import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvestmentOutput,
  ListInvestmentTransactionsOutput,
  ListInvestmentsOutput,
  ListProviderBillsOutput,
  ResetOpenFinanceOverridesInput
} from '@mybills/dtos';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { Env } from 'src/config/env.validation';
import { OPEN_FINANCE_CANONICAL_REPOSITORY } from './open-finance.tokens';
import { PrismaOpenFinanceCanonicalRepository } from './repositories/prisma/prisma-open-finance-canonical.repository';

@Injectable()
export class OpenFinanceQueryService {
  constructor(
    private readonly configService: ConfigService<Env>,
    @Inject(OPEN_FINANCE_CANONICAL_REPOSITORY)
    private readonly canonical: PrismaOpenFinanceCanonicalRepository
  ) {}

  async listInvestments(userId: string): Promise<ListInvestmentsOutput> {
    this.assertEnabled();
    return await this.canonical.listInvestments(userId);
  }

  async getInvestment(investmentId: string, userId: string): Promise<InvestmentOutput> {
    this.assertEnabled();
    const investment = await this.canonical.getInvestment(investmentId, userId);
    if (!investment) {
      throw new NotFoundError({
        code: 'open_finance.investment_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'investment' }
      });
    }

    return investment;
  }

  async listInvestmentTransactions(
    investmentId: string,
    userId: string
  ): Promise<ListInvestmentTransactionsOutput> {
    await this.getInvestment(investmentId, userId);
    return await this.canonical.listInvestmentTransactions(investmentId, userId);
  }

  async listBills(creditCardId: string, userId: string): Promise<ListProviderBillsOutput> {
    this.assertEnabled();
    return await this.canonical.listBillsForCreditCard(creditCardId, userId);
  }

  async resetAccountOverrides(
    accountId: string,
    userId: string,
    input: ResetOpenFinanceOverridesInput
  ): Promise<void> {
    this.assertEnabled();
    await this.canonical.resetAccountOverrides(accountId, userId, input.fields);
  }

  async resetTransactionOverrides(
    transactionId: string,
    userId: string,
    input: ResetOpenFinanceOverridesInput
  ): Promise<void> {
    this.assertEnabled();
    await this.canonical.resetTransactionOverrides(transactionId, userId, input.fields);
  }

  async resetCreditCardOverrides(
    creditCardId: string,
    userId: string,
    input: ResetOpenFinanceOverridesInput
  ): Promise<void> {
    this.assertEnabled();
    await this.canonical.resetCreditCardOverrides(creditCardId, userId, input.fields);
  }

  private assertEnabled(): void {
    if (!this.configService.get('OPEN_FINANCE_ENABLED')) {
      throw new NotFoundError({
        code: 'open_finance.disabled',
        i18nKey: 'errors.open_finance.disabled'
      });
    }
  }
}
