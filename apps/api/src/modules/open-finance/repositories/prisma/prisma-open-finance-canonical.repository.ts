import { Injectable } from '@nestjs/common';
import {
  InvestmentOutput,
  InvestmentTransactionOutput,
  ListInvestmentsOutput,
  ListInvestmentTransactionsOutput,
  ListProviderBillsOutput,
  ProviderBillOutput,
  investmentOutputSchema,
  investmentTransactionOutputSchema,
  providerBillOutputSchema
} from '@mybills/dtos';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import { matchTransferCounterpart } from '../../mappers/classify-cash-flow';
import { MappedProviderAccount } from '../../mappers/map-account';
import { MappedProviderBill } from '../../mappers/map-bill';
import { MappedInvestment, MappedInvestmentTransaction } from '../../mappers/map-investment';
import { MappedProviderTransaction } from '../../mappers/map-transaction';
import { decimalToString, providerAmountToCents, toIsoString } from '../../mappers/money';
import { cycleDaysFromAccountClosingDate } from '../../lib/imported-card-cycle-days';
import {
  ensureUnbilledInvoiceForDate,
  maybeRecordCardPaymentLedger,
  mergeCanonicalBillIntoInvoice,
  pruneUnbilledInvoicesOverlappingBilled,
  recalcTouchedUnbilledOpenInvoices,
  refreshImportedCardCycleDays,
  resolveInvoiceIdForCardMovement,
  upsertInvoicePaymentsFromBill
} from '../../lib/project-imported-invoices';

@Injectable()
export class PrismaOpenFinanceCanonicalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertAccounts(
    connectionId: string,
    userId: string,
    accounts: MappedProviderAccount[],
    seenAt: Date
  ): Promise<void> {
    for (const account of accounts) {
      const canonical = await this.prisma.openFinanceAccount.upsert({
        where: {
          connectionId_externalId: { connectionId, externalId: account.externalId }
        },
        create: {
          connectionId,
          externalId: account.externalId,
          type: account.type,
          subtype: account.subtype,
          name: account.name,
          currencyCode: account.currencyCode,
          balance: account.balance,
          availableBalance: account.availableBalance,
          creditLimit: account.creditLimit,
          availableCreditLimit: account.availableCreditLimit,
          brand: account.brand,
          providerStatus: account.providerStatus,
          closingDate: account.closingDate,
          dueDate: account.dueDate,
          providerCreatedAt: account.providerCreatedAt,
          providerUpdatedAt: account.providerUpdatedAt,
          rawPayload: account.rawPayload,
          lastSeenAt: seenAt,
          unavailableAt: null
        },
        update: {
          type: account.type,
          subtype: account.subtype,
          name: account.name,
          currencyCode: account.currencyCode,
          balance: account.balance,
          availableBalance: account.availableBalance,
          creditLimit: account.creditLimit,
          availableCreditLimit: account.availableCreditLimit,
          brand: account.brand,
          providerStatus: account.providerStatus,
          closingDate: account.closingDate,
          dueDate: account.dueDate,
          providerCreatedAt: account.providerCreatedAt,
          providerUpdatedAt: account.providerUpdatedAt,
          rawPayload: account.rawPayload,
          lastSeenAt: seenAt,
          unavailableAt: null
        }
      });

      if (account.type === 'BANK') {
        await this.upsertBankProjection(userId, canonical.id, account);
      } else {
        await this.upsertCardProjection(userId, canonical.id, account);
      }
    }
  }

  async markUnseenAccountsUnavailable(connectionId: string, seenAt: Date): Promise<void> {
    const now = new Date();
    const unseen = await this.prisma.openFinanceAccount.findMany({
      where: { connectionId, lastSeenAt: { lt: seenAt }, unavailableAt: null },
      select: { id: true }
    });
    const ids = unseen.map((row) => row.id);

    await this.prisma.openFinanceAccount.updateMany({
      where: { id: { in: ids } },
      data: { unavailableAt: now }
    });
    await this.prisma.account.updateMany({
      where: { openFinanceAccountId: { in: ids }, hiddenAt: null },
      data: { hiddenAt: now }
    });
    await this.prisma.creditCard.updateMany({
      where: { openFinanceAccountId: { in: ids }, hiddenAt: null },
      data: { hiddenAt: now }
    });
  }

  async upsertBills(accountExternalId: string, connectionId: string, bills: MappedProviderBill[], seenAt: Date) {
    const account = await this.prisma.openFinanceAccount.findUnique({
      where: { connectionId_externalId: { connectionId, externalId: accountExternalId } }
    });

    if (!account) {
      return;
    }

    const persisted: Array<{
      canonical: { id: string; dueOn: Date; closingOn: Date | null };
      bill: MappedProviderBill;
    }> = [];

    for (const bill of bills) {
      const canonical = await this.prisma.openFinanceBill.upsert({
        where: { accountId_externalId: { accountId: account.id, externalId: bill.externalId } },
        create: {
          accountId: account.id,
          externalId: bill.externalId,
          dueOn: bill.dueOn,
          closingOn: bill.closingOn,
          totalAmount: bill.totalAmount,
          minimumPaymentAmount: bill.minimumPaymentAmount,
          currencyCode: bill.currencyCode,
          allowsInstallments: bill.allowsInstallments,
          providerCreatedAt: bill.providerCreatedAt,
          providerUpdatedAt: bill.providerUpdatedAt,
          rawPayload: bill.rawPayload,
          lastSeenAt: seenAt,
          unavailableAt: null
        },
        update: {
          dueOn: bill.dueOn,
          closingOn: bill.closingOn,
          totalAmount: bill.totalAmount,
          minimumPaymentAmount: bill.minimumPaymentAmount,
          currencyCode: bill.currencyCode,
          allowsInstallments: bill.allowsInstallments,
          providerCreatedAt: bill.providerCreatedAt,
          providerUpdatedAt: bill.providerUpdatedAt,
          rawPayload: bill.rawPayload,
          lastSeenAt: seenAt,
          unavailableAt: null
        }
      });

      for (const payment of bill.payments) {
        await this.prisma.openFinanceBillPayment.upsert({
          where: { billId_externalId: { billId: canonical.id, externalId: payment.externalId } },
          create: {
            billId: canonical.id,
            externalId: payment.externalId,
            valueType: payment.valueType,
            paymentDate: payment.paymentDate,
            paymentMode: payment.paymentMode,
            amount: payment.amount,
            currencyCode: payment.currencyCode,
            rawPayload: payment.rawPayload,
            lastSeenAt: seenAt,
            unavailableAt: null
          },
          update: {
            valueType: payment.valueType,
            paymentDate: payment.paymentDate,
            paymentMode: payment.paymentMode,
            amount: payment.amount,
            currencyCode: payment.currencyCode,
            rawPayload: payment.rawPayload,
            lastSeenAt: seenAt,
            unavailableAt: null
          }
        });
      }

      for (const charge of bill.financeCharges) {
        await this.prisma.openFinanceBillFinanceCharge.upsert({
          where: { billId_externalId: { billId: canonical.id, externalId: charge.externalId } },
          create: {
            billId: canonical.id,
            externalId: charge.externalId,
            type: charge.type,
            amount: charge.amount,
            currencyCode: charge.currencyCode,
            additionalInfo: charge.additionalInfo,
            rawPayload: charge.rawPayload,
            lastSeenAt: seenAt,
            unavailableAt: null
          },
          update: {
            type: charge.type,
            amount: charge.amount,
            currencyCode: charge.currencyCode,
            additionalInfo: charge.additionalInfo,
            rawPayload: charge.rawPayload,
            lastSeenAt: seenAt,
            unavailableAt: null
          }
        });
      }

      persisted.push({ canonical, bill });
    }

    await refreshImportedCardCycleDays(this.prisma, account.id);
    await pruneUnbilledInvoicesOverlappingBilled(this.prisma, account.id);

    for (const { canonical, bill } of persisted) {
      const invoiceId = await mergeCanonicalBillIntoInvoice(this.prisma, account.id, {
        id: canonical.id,
        dueOn: canonical.dueOn,
        closingOn: canonical.closingOn,
        totalAmount: bill.totalAmount,
        totalAmountCents: bill.totalAmountCents,
        currencyCode: bill.currencyCode,
        minimumPaymentAmount: bill.minimumPaymentAmount,
        minimumPaymentAmountCents: bill.minimumPaymentAmountCents,
        allowsInstallments: bill.allowsInstallments
      });

      if (invoiceId) {
        await upsertInvoicePaymentsFromBill(this.prisma, invoiceId, canonical.id);
      }
    }

    await ensureUnbilledInvoiceForDate(this.prisma, account.id, new Date());
  }

  async markUnseenBillsUnavailable(connectionId: string, seenAt: Date): Promise<void> {
    await this.prisma.openFinanceBill.updateMany({
      where: {
        account: { connectionId },
        lastSeenAt: { lt: seenAt },
        unavailableAt: null
      },
      data: { unavailableAt: new Date() }
    });
  }

  async upsertTransactions(
    connectionId: string,
    userId: string,
    transactions: MappedProviderTransaction[],
    seenAt: Date
  ): Promise<void> {
    const touchedInvoiceIds = new Set<string>();
    const creditAccountIds = new Set<string>();

    for (const transaction of transactions) {
      const ofAccount = await this.prisma.openFinanceAccount.findUnique({
        where: {
          connectionId_externalId: {
            connectionId,
            externalId: transaction.accountExternalId
          }
        },
        include: { bankProjection: true, creditCardProjection: true, bills: true }
      });

      if (!ofAccount) {
        continue;
      }

      const bill = transaction.billExternalId
        ? ofAccount.bills.find((item) => item.externalId === transaction.billExternalId)
        : null;
      const billForecastMonth =
        transaction.billForecastMonth ?? (bill ? bill.dueOn.toISOString().slice(0, 7) : null);

      const canonical = await this.prisma.openFinanceTransaction.upsert({
        where: {
          accountId_externalId: { accountId: ofAccount.id, externalId: transaction.externalId }
        },
        create: {
          accountId: ofAccount.id,
          billId: bill?.id ?? null,
          externalId: transaction.externalId,
          description: transaction.description,
          type: transaction.type,
          amount: transaction.amount,
          currencyCode: transaction.currencyCode,
          date: transaction.date,
          status: transaction.status,
          providerCategoryId: transaction.providerCategoryId,
          providerCategoryName: transaction.providerCategoryName,
          paymentMethod: transaction.paymentMethod,
          paymentReference: transaction.paymentReference,
          merchantName: transaction.merchantName,
          operationType: transaction.operationType,
          sameDayOrder: transaction.sameDayOrder,
          billForecastMonth,
          creditCardMetadata: transaction.creditCardMetadata ?? undefined,
          paymentParticipants: transaction.paymentParticipants ?? undefined,
          cashFlowRole: transaction.cashFlowRole,
          classificationEvidence: transaction.classificationEvidence,
          providerCreatedAt: transaction.providerCreatedAt,
          providerUpdatedAt: transaction.providerUpdatedAt,
          rawPayload: transaction.rawPayload,
          lastSeenAt: seenAt,
          unavailableAt: null
        },
        update: {
          billId: bill?.id ?? null,
          description: transaction.description,
          type: transaction.type,
          amount: transaction.amount,
          currencyCode: transaction.currencyCode,
          date: transaction.date,
          status: transaction.status,
          providerCategoryId: transaction.providerCategoryId,
          providerCategoryName: transaction.providerCategoryName,
          paymentMethod: transaction.paymentMethod,
          paymentReference: transaction.paymentReference,
          merchantName: transaction.merchantName,
          operationType: transaction.operationType,
          sameDayOrder: transaction.sameDayOrder,
          billForecastMonth,
          creditCardMetadata: transaction.creditCardMetadata ?? undefined,
          paymentParticipants: transaction.paymentParticipants ?? undefined,
          cashFlowRole: transaction.cashFlowRole,
          classificationEvidence: transaction.classificationEvidence,
          providerCreatedAt: transaction.providerCreatedAt,
          providerUpdatedAt: transaction.providerUpdatedAt,
          rawPayload: transaction.rawPayload,
          lastSeenAt: seenAt,
          unavailableAt: null
        }
      });

      const existing = await this.prisma.transaction.findUnique({
        where: { openFinanceTransactionId: canonical.id }
      });
      const isPaid = transaction.status === 'POSTED';
      const accountId = ofAccount.type === 'BANK' ? ofAccount.bankProjection?.id ?? null : null;
      const cardId = ofAccount.type === 'CREDIT' ? ofAccount.creditCardProjection?.id ?? null : null;
      if (ofAccount.type === 'CREDIT') {
        creditAccountIds.add(ofAccount.id);
      }
      const invoiceId =
        ofAccount.type === 'CREDIT'
          ? await resolveInvoiceIdForCardMovement(this.prisma, {
              openFinanceAccountId: ofAccount.id,
              openFinanceBillId: bill?.id ?? null,
              cashFlowRole: transaction.cashFlowRole,
              transactionDate: transaction.date,
              billForecastMonth: transaction.billForecastMonth
            })
          : null;

      if (invoiceId) {
        touchedInvoiceIds.add(invoiceId);
      }
      if (existing?.invoiceId) {
        touchedInvoiceIds.add(existing.invoiceId);
      }

      if (!existing) {
        const created = await this.prisma.transaction.create({
          data: {
            userId,
            accountId,
            cardId,
            invoiceId,
            description: transaction.description,
            type: transaction.type,
            amount: transaction.amountCents,
            date: transaction.date,
            isPaid,
            isProjected: false,
            source: 'PLUGGY',
            openFinanceTransactionId: canonical.id,
            providerStatus: transaction.status,
            currencyCode: transaction.currencyCode,
            cashFlowRole: transaction.cashFlowRole,
            hiddenAt: null
          }
        });

        if (cardId) {
          await maybeRecordCardPaymentLedger(this.prisma, {
            cardId,
            cashFlowRole: transaction.cashFlowRole,
            amountCents: transaction.amountCents,
            paymentDate: transaction.date,
            transactionId: created.id,
            openFinanceBillId: bill?.id ?? null
          });
        }
        continue;
      }

      const overridden = new Set(existing.overriddenFields);
      const nextInvoiceId = overridden.has('invoiceId') ? existing.invoiceId : invoiceId;
      if (nextInvoiceId) {
        touchedInvoiceIds.add(nextInvoiceId);
      }

      await this.prisma.transaction.update({
        where: { id: existing.id },
        data: {
          accountId: overridden.has('accountId') ? existing.accountId : accountId,
          cardId: overridden.has('cardId') ? existing.cardId : cardId,
          invoiceId: nextInvoiceId,
          description: overridden.has('description') ? existing.description : transaction.description,
          type: overridden.has('type') ? existing.type : transaction.type,
          amount: overridden.has('amount') ? existing.amount : transaction.amountCents,
          date: overridden.has('date') ? existing.date : transaction.date,
          isPaid: overridden.has('isPaid') ? existing.isPaid : isPaid,
          providerStatus: transaction.status,
          currencyCode: transaction.currencyCode,
          cashFlowRole: existing.cashFlowRole === 'NORMAL' ? transaction.cashFlowRole : existing.cashFlowRole,
          hiddenAt: null
        }
      });

      if (cardId) {
        await maybeRecordCardPaymentLedger(this.prisma, {
          cardId,
          cashFlowRole: existing.cashFlowRole === 'NORMAL' ? transaction.cashFlowRole : existing.cashFlowRole,
          amountCents: overridden.has('amount') ? existing.amount : transaction.amountCents,
          paymentDate: overridden.has('date') ? existing.date : transaction.date,
          transactionId: existing.id,
          openFinanceBillId: bill?.id ?? null
        });
      }
    }

    for (const accountId of creditAccountIds) {
      const pruned = await pruneUnbilledInvoicesOverlappingBilled(this.prisma, accountId);
      for (const invoiceId of pruned) {
        touchedInvoiceIds.add(invoiceId);
      }
    }

    await recalcTouchedUnbilledOpenInvoices(this.prisma, touchedInvoiceIds);
  }

  async markUnseenTransactionsUnavailable(connectionId: string, seenAt: Date): Promise<void> {
    const now = new Date();
    const unseen = await this.prisma.openFinanceTransaction.findMany({
      where: {
        account: { connectionId },
        lastSeenAt: { lt: seenAt },
        unavailableAt: null
      },
      select: { id: true }
    });
    const ids = unseen.map((row) => row.id);
    await this.prisma.openFinanceTransaction.updateMany({
      where: { id: { in: ids } },
      data: { unavailableAt: now }
    });
    await this.prisma.transaction.updateMany({
      where: { openFinanceTransactionId: { in: ids }, hiddenAt: null },
      data: { hiddenAt: now }
    });
  }

  async markTransactionsUnavailableByExternalIds(
    connectionId: string,
    accountExternalId: string | null,
    externalIds: string[]
  ): Promise<void> {
    if (externalIds.length === 0) {
      return;
    }

    const now = new Date();
    const rows = await this.prisma.openFinanceTransaction.findMany({
      where: {
        externalId: { in: externalIds },
        account: {
          connectionId,
          ...(accountExternalId ? { externalId: accountExternalId } : {})
        }
      },
      select: { id: true }
    });
    const ids = rows.map((row) => row.id);
    await this.prisma.openFinanceTransaction.updateMany({
      where: { id: { in: ids } },
      data: { unavailableAt: now }
    });
    await this.prisma.transaction.updateMany({
      where: { openFinanceTransactionId: { in: ids }, hiddenAt: null },
      data: { hiddenAt: now }
    });
  }

  async applyTransferMatches(connectionId: string): Promise<void> {
    const rows = await this.prisma.openFinanceTransaction.findMany({
      where: { account: { connectionId }, unavailableAt: null, cashFlowRole: 'NORMAL' },
      select: {
        id: true,
        accountId: true,
        amount: true,
        currencyCode: true,
        date: true,
        type: true,
        paymentReference: true,
        classificationEvidence: true
      }
    });

    const candidates = rows.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      amountCents: providerAmountToCents(Number(row.amount)),
      currencyCode: row.currencyCode,
      date: row.date,
      type: row.type,
      paymentReference: row.paymentReference
    }));

    for (const current of candidates) {
      const match = matchTransferCounterpart(current, candidates);
      if (!match) {
        continue;
      }

      await this.prisma.openFinanceTransaction.updateMany({
        where: { id: { in: [current.id, match.id] } },
        data: {
          cashFlowRole: 'TRANSFER',
          classificationEvidence: ['amount_currency_date_reference']
        }
      });
      await this.prisma.transaction.updateMany({
        where: { openFinanceTransactionId: { in: [current.id, match.id] } },
        data: { cashFlowRole: 'TRANSFER' }
      });
    }
  }

  async upsertInvestments(
    connectionId: string,
    investments: MappedInvestment[],
    seenAt: Date
  ): Promise<void> {
    for (const investment of investments) {
      await this.prisma.investment.upsert({
        where: {
          connectionId_externalId: { connectionId, externalId: investment.externalId }
        },
        create: {
          connectionId,
          externalId: investment.externalId,
          name: investment.name,
          code: investment.code,
          isin: investment.isin,
          number: investment.number,
          type: investment.type,
          subtype: investment.subtype,
          status: investment.status,
          currencyCode: investment.currencyCode,
          balance: investment.balance,
          amount: investment.amount,
          amountOriginal: investment.amountOriginal,
          amountProfit: investment.amountProfit,
          amountWithdrawal: investment.amountWithdrawal,
          taxes: investment.taxes,
          taxes2: investment.taxes2,
          quantity: investment.quantity,
          value: investment.value,
          lastMonthRate: investment.lastMonthRate,
          lastTwelveMonthsRate: investment.lastTwelveMonthsRate,
          annualRate: investment.annualRate,
          rate: investment.rate,
          rateType: investment.rateType,
          fixedAnnualRate: investment.fixedAnnualRate,
          issuer: investment.issuer,
          issueDate: investment.issueDate,
          dueDate: investment.dueDate,
          gracePeriodDate: investment.gracePeriodDate,
          date: investment.date,
          institutionName: investment.institutionName,
          providerCreatedAt: investment.providerCreatedAt,
          providerUpdatedAt: investment.providerUpdatedAt,
          rawPayload: investment.rawPayload,
          lastSeenAt: seenAt,
          unavailableAt: null
        },
        update: {
          name: investment.name,
          code: investment.code,
          isin: investment.isin,
          number: investment.number,
          type: investment.type,
          subtype: investment.subtype,
          status: investment.status,
          currencyCode: investment.currencyCode,
          balance: investment.balance,
          amount: investment.amount,
          amountOriginal: investment.amountOriginal,
          amountProfit: investment.amountProfit,
          amountWithdrawal: investment.amountWithdrawal,
          taxes: investment.taxes,
          taxes2: investment.taxes2,
          quantity: investment.quantity,
          value: investment.value,
          lastMonthRate: investment.lastMonthRate,
          lastTwelveMonthsRate: investment.lastTwelveMonthsRate,
          annualRate: investment.annualRate,
          rate: investment.rate,
          rateType: investment.rateType,
          fixedAnnualRate: investment.fixedAnnualRate,
          issuer: investment.issuer,
          issueDate: investment.issueDate,
          dueDate: investment.dueDate,
          gracePeriodDate: investment.gracePeriodDate,
          date: investment.date,
          institutionName: investment.institutionName,
          providerCreatedAt: investment.providerCreatedAt,
          providerUpdatedAt: investment.providerUpdatedAt,
          rawPayload: investment.rawPayload,
          lastSeenAt: seenAt,
          unavailableAt: null
        }
      });
    }
  }

  async upsertInvestmentTransactions(
    connectionId: string,
    investmentExternalId: string,
    transactions: MappedInvestmentTransaction[],
    seenAt: Date
  ): Promise<void> {
    const investment = await this.prisma.investment.findUnique({
      where: {
        connectionId_externalId: { connectionId, externalId: investmentExternalId }
      }
    });

    if (!investment) {
      return;
    }

    for (const transaction of transactions) {
      await this.prisma.investmentTransaction.upsert({
        where: {
          investmentId_externalId: {
            investmentId: investment.id,
            externalId: transaction.externalId
          }
        },
        create: {
          investmentId: investment.id,
          externalId: transaction.externalId,
          type: transaction.type,
          description: transaction.description,
          quantity: transaction.quantity,
          value: transaction.value,
          amount: transaction.amount,
          netAmount: transaction.netAmount,
          agreedRate: transaction.agreedRate,
          date: transaction.date,
          tradeDate: transaction.tradeDate,
          brokerageNumber: transaction.brokerageNumber,
          expenses: transaction.expenses ?? undefined,
          providerCreatedAt: transaction.providerCreatedAt,
          providerUpdatedAt: transaction.providerUpdatedAt,
          rawPayload: transaction.rawPayload,
          lastSeenAt: seenAt,
          unavailableAt: null
        },
        update: {
          type: transaction.type,
          description: transaction.description,
          quantity: transaction.quantity,
          value: transaction.value,
          amount: transaction.amount,
          netAmount: transaction.netAmount,
          agreedRate: transaction.agreedRate,
          date: transaction.date,
          tradeDate: transaction.tradeDate,
          brokerageNumber: transaction.brokerageNumber,
          expenses: transaction.expenses ?? undefined,
          providerCreatedAt: transaction.providerCreatedAt,
          providerUpdatedAt: transaction.providerUpdatedAt,
          rawPayload: transaction.rawPayload,
          lastSeenAt: seenAt,
          unavailableAt: null
        }
      });
    }
  }

  async markUnseenInvestmentsUnavailable(connectionId: string, seenAt: Date): Promise<void> {
    await this.prisma.investment.updateMany({
      where: { connectionId, lastSeenAt: { lt: seenAt }, unavailableAt: null },
      data: { unavailableAt: new Date() }
    });
  }

  async listInvestments(userId: string): Promise<ListInvestmentsOutput> {
    const rows = await this.prisma.investment.findMany({
      where: { connection: { userId }, unavailableAt: null },
      orderBy: { name: 'asc' }
    });

    return rows.map((row) => this.mapInvestment(row));
  }

  async getInvestment(investmentId: string, userId: string): Promise<InvestmentOutput | null> {
    const row = await this.prisma.investment.findFirst({
      where: { id: investmentId, connection: { userId }, unavailableAt: null }
    });

    return row ? this.mapInvestment(row) : null;
  }

  async listInvestmentTransactions(
    investmentId: string,
    userId: string
  ): Promise<ListInvestmentTransactionsOutput> {
    const rows = await this.prisma.investmentTransaction.findMany({
      where: {
        investmentId,
        unavailableAt: null,
        investment: { connection: { userId }, unavailableAt: null }
      },
      orderBy: { date: 'desc' }
    });

    return rows.map((row) => this.mapInvestmentTransaction(row));
  }

  async listBillsForCreditCard(creditCardId: string, userId: string): Promise<ListProviderBillsOutput> {
    const card = await this.prisma.creditCard.findFirst({
      where: { id: creditCardId, userId, source: 'PLUGGY', hiddenAt: null },
      select: { openFinanceAccountId: true }
    });

    if (!card?.openFinanceAccountId) {
      return [];
    }

    const bills = await this.prisma.openFinanceBill.findMany({
      where: { accountId: card.openFinanceAccountId, unavailableAt: null },
      include: { payments: true, financeCharges: true },
      orderBy: { dueOn: 'desc' }
    });

    const now = new Date();
    return bills.map((bill) => this.mapBill(bill, creditCardId, now));
  }

  async resetAccountOverrides(accountId: string, userId: string, fields: string[]): Promise<void> {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId, source: 'PLUGGY' },
      include: { openFinanceAccount: true }
    });

    if (!account?.openFinanceAccount) {
      return;
    }

    const remaining = account.overriddenFields.filter((field) => !fields.includes(field));
    const data: { name?: string; balance?: number; overriddenFields: string[] } = {
      overriddenFields: remaining
    };

    if (fields.includes('name')) {
      data.name = account.openFinanceAccount.name;
    }

    if (fields.includes('balance')) {
      data.balance = providerAmountToCents(Number(account.openFinanceAccount.balance));
    }

    await this.prisma.account.update({ where: { id: accountId }, data });
  }

  async resetTransactionOverrides(transactionId: string, userId: string, fields: string[]): Promise<void> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId, source: 'PLUGGY' },
      include: { openFinanceTransaction: true }
    });

    if (!transaction?.openFinanceTransaction) {
      return;
    }

    const canonical = transaction.openFinanceTransaction;
    const remaining = transaction.overriddenFields.filter((field) => !fields.includes(field));
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        overriddenFields: remaining,
        description: fields.includes('description') ? canonical.description : undefined,
        amount: fields.includes('amount')
          ? providerAmountToCents(Number(canonical.amount))
          : undefined,
        date: fields.includes('date') ? canonical.date : undefined,
        isPaid: fields.includes('isPaid') ? canonical.status === 'POSTED' : undefined,
        categoryId: fields.includes('categoryId') ? null : undefined
      }
    });
  }

  async resetCreditCardOverrides(creditCardId: string, userId: string, fields: string[]): Promise<void> {
    const card = await this.prisma.creditCard.findFirst({
      where: { id: creditCardId, userId, source: 'PLUGGY' },
      include: { openFinanceAccount: true }
    });

    if (!card?.openFinanceAccount) {
      return;
    }

    const remaining = card.overriddenFields.filter((field) => !fields.includes(field));
    await this.prisma.creditCard.update({
      where: { id: creditCardId },
      data: {
        overriddenFields: remaining,
        name: fields.includes('name') ? card.openFinanceAccount.name : undefined,
        limit: fields.includes('limit')
          ? providerAmountToCents(Number(card.openFinanceAccount.creditLimit ?? 0))
          : undefined
      }
    });
  }

  private async upsertBankProjection(
    userId: string,
    openFinanceAccountId: string,
    account: MappedProviderAccount
  ): Promise<void> {
    const existing = await this.prisma.account.findUnique({
      where: { openFinanceAccountId }
    });

    if (!existing) {
      await this.prisma.account.create({
        data: {
          userId,
          name: account.name,
          balance: account.projectionBalanceCents,
          source: 'PLUGGY',
          openFinanceAccountId,
          hiddenAt: null
        }
      });
      return;
    }

    const overridden = new Set(existing.overriddenFields);
    await this.prisma.account.update({
      where: { id: existing.id },
      data: {
        name: overridden.has('name') ? existing.name : account.name,
        balance: overridden.has('balance') ? existing.balance : account.projectionBalanceCents,
        hiddenAt: null
      }
    });
  }

  private async upsertCardProjection(
    userId: string,
    openFinanceAccountId: string,
    account: MappedProviderAccount
  ): Promise<void> {
    const existing = await this.prisma.creditCard.findUnique({
      where: { openFinanceAccountId }
    });
    const dueDay = account.dueDate?.getUTCDate() ?? 10;
    const closingFromAccount = account.closingDate
      ? cycleDaysFromAccountClosingDate(account.closingDate)
      : { closingDay: dueDay, closingOnLastDay: false };

    if (!existing) {
      await this.prisma.creditCard.create({
        data: {
          userId,
          accountId: null,
          name: account.name,
          limit: account.projectionLimitCents,
          closingDay: closingFromAccount.closingDay,
          closingOnLastDay: closingFromAccount.closingOnLastDay,
          dueDay,
          source: 'PLUGGY',
          openFinanceAccountId,
          hiddenAt: null
        }
      });
      return;
    }

    const overridden = new Set(existing.overriddenFields);
    await this.prisma.creditCard.update({
      where: { id: existing.id },
      data: {
        name: overridden.has('name') ? existing.name : account.name,
        limit: overridden.has('limit') ? existing.limit : account.projectionLimitCents,
        closingDay:
          account.closingDate && !overridden.has('closingDay')
            ? closingFromAccount.closingDay
            : existing.closingDay,
        closingOnLastDay:
          account.closingDate && !overridden.has('closingDay')
            ? closingFromAccount.closingOnLastDay
            : existing.closingOnLastDay,
        dueDay: account.dueDate && !overridden.has('dueDay') ? dueDay : existing.dueDay,
        hiddenAt: null
      }
    });
  }

  private mapInvestment(row: {
    id: string;
    connectionId: string;
    externalId: string;
    name: string;
    code: string | null;
    isin: string | null;
    number: string | null;
    type: InvestmentOutput['type'];
    subtype: string | null;
    status: InvestmentOutput['status'];
    currencyCode: string | null;
    balance: { toString(): string };
    amount: { toString(): string };
    amountOriginal: { toString(): string } | null;
    amountProfit: { toString(): string } | null;
    amountWithdrawal: { toString(): string } | null;
    taxes: { toString(): string } | null;
    taxes2: { toString(): string } | null;
    quantity: { toString(): string } | null;
    value: { toString(): string } | null;
    lastMonthRate: { toString(): string } | null;
    lastTwelveMonthsRate: { toString(): string } | null;
    annualRate: { toString(): string } | null;
    rate: { toString(): string } | null;
    rateType: string | null;
    fixedAnnualRate: { toString(): string } | null;
    issuer: string | null;
    issueDate: Date | null;
    dueDate: Date | null;
    gracePeriodDate: Date | null;
    date: Date | null;
    institutionName: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): InvestmentOutput {
    return investmentOutputSchema.parse({
      id: row.id,
      connectionId: row.connectionId,
      externalId: row.externalId,
      source: 'PLUGGY',
      name: row.name,
      code: row.code,
      isin: row.isin,
      number: row.number,
      type: row.type,
      subtype: row.subtype,
      status: row.status,
      currencyCode: row.currencyCode,
      balance: providerAmountToCents(Number(row.balance)),
      amount: providerAmountToCents(Number(row.amount)),
      amountOriginal: row.amountOriginal ? providerAmountToCents(Number(row.amountOriginal)) : null,
      amountProfit: row.amountProfit ? providerAmountToCents(Number(row.amountProfit)) : null,
      amountWithdrawal: row.amountWithdrawal
        ? providerAmountToCents(Number(row.amountWithdrawal))
        : null,
      taxes: row.taxes ? providerAmountToCents(Number(row.taxes)) : null,
      taxes2: row.taxes2 ? providerAmountToCents(Number(row.taxes2)) : null,
      quantity: decimalToString(Number(row.quantity)),
      value: decimalToString(Number(row.value)),
      lastMonthRate: decimalToString(Number(row.lastMonthRate)),
      lastTwelveMonthsRate: decimalToString(Number(row.lastTwelveMonthsRate)),
      annualRate: decimalToString(Number(row.annualRate)),
      rate: decimalToString(Number(row.rate)),
      rateType: row.rateType,
      fixedAnnualRate: decimalToString(Number(row.fixedAnnualRate)),
      issuer: row.issuer,
      issueDate: toIsoString(row.issueDate),
      dueDate: toIsoString(row.dueDate),
      gracePeriodDate: toIsoString(row.gracePeriodDate),
      date: toIsoString(row.date),
      institutionName: row.institutionName,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    });
  }

  private mapInvestmentTransaction(row: {
    id: string;
    investmentId: string;
    externalId: string;
    type: InvestmentTransactionOutput['type'];
    description: string | null;
    quantity: { toString(): string } | null;
    value: { toString(): string } | null;
    amount: { toString(): string } | null;
    netAmount: { toString(): string } | null;
    agreedRate: { toString(): string } | null;
    date: Date;
    tradeDate: Date | null;
    brokerageNumber: string | null;
    expenses: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): InvestmentTransactionOutput {
    return investmentTransactionOutputSchema.parse({
      id: row.id,
      investmentId: row.investmentId,
      externalId: row.externalId,
      type: row.type,
      description: row.description,
      quantity: decimalToString(Number(row.quantity)) ?? '0',
      value: decimalToString(Number(row.value)) ?? '0',
      amount: decimalToString(Number(row.amount)) ?? '0',
      netAmount: decimalToString(Number(row.netAmount)),
      agreedRate: decimalToString(Number(row.agreedRate)),
      date: row.date.toISOString(),
      tradeDate: row.tradeDate?.toISOString() ?? row.date.toISOString(),
      brokerageNumber: row.brokerageNumber,
      expenses: row.expenses ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    });
  }

  private mapBill(
    bill: {
      id: string;
      externalId: string;
      dueOn: Date;
      closingOn: Date | null;
      totalAmount: { toString(): string };
      minimumPaymentAmount: { toString(): string } | null;
      currencyCode: string;
      allowsInstallments: boolean | null;
      createdAt: Date;
      updatedAt: Date;
      payments: Array<{
        id: string;
        externalId: string;
        valueType: ProviderBillOutput['payments'][number]['valueType'];
        paymentDate: Date;
        paymentMode: string | null;
        amount: { toString(): string };
        currencyCode: string;
      }>;
      financeCharges: Array<{
        id: string;
        externalId: string;
        type: ProviderBillOutput['financeCharges'][number]['type'];
        amount: { toString(): string };
        currencyCode: string;
        additionalInfo: string | null;
      }>;
    },
    creditCardId: string,
    now: Date
  ): ProviderBillOutput {
    const totalAmount = providerAmountToCents(Number(bill.totalAmount));
    const paid = bill.payments.reduce(
      (sum, payment) => sum + providerAmountToCents(Number(payment.amount)),
      0
    );
    const dueMonth = bill.dueOn.toISOString().slice(0, 7);
    const currentMonth = now.toISOString().slice(0, 7);

    return providerBillOutputSchema.parse({
      id: bill.id,
      creditCardId,
      externalId: bill.externalId,
      source: 'PLUGGY',
      dueOn: bill.dueOn.toISOString().slice(0, 10),
      closingOn: bill.closingOn ? bill.closingOn.toISOString().slice(0, 10) : null,
      totalAmount,
      minimumPaymentAmount: bill.minimumPaymentAmount
        ? providerAmountToCents(Number(bill.minimumPaymentAmount))
        : null,
      currencyCode: bill.currencyCode,
      allowsInstallments: bill.allowsInstallments,
      isFullyPaid: paid >= totalAmount && totalAmount > 0,
      isForecast: dueMonth > currentMonth,
      forecastMonth: dueMonth > currentMonth ? dueMonth : null,
      payments: bill.payments.map((payment) => ({
        id: payment.id,
        externalId: payment.externalId,
        valueType: payment.valueType,
        paymentDate: payment.paymentDate.toISOString(),
        paymentMode: payment.paymentMode,
        amount: providerAmountToCents(Number(payment.amount)),
        currencyCode: payment.currencyCode
      })),
      financeCharges: bill.financeCharges.map((charge) => ({
        id: charge.id,
        externalId: charge.externalId,
        type: charge.type,
        amount: providerAmountToCents(Number(charge.amount)),
        currencyCode: charge.currencyCode,
        additionalInfo: charge.additionalInfo
      })),
      createdAt: bill.createdAt.toISOString(),
      updatedAt: bill.updatedAt.toISOString()
    });
  }
}
