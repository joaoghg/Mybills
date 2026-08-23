import { Injectable } from '@nestjs/common';
import {
  canPayBillingCycle,
  getCycleContainingDate,
  getInvoiceDueYmd,
  resolveClosingDay,
  utcTodayYmd
} from '@mybills/utils';
import {
  Invoice as PrismaInvoice,
  InvoicePayment as PrismaInvoicePayment,
  InvoiceStatus,
  CreditCard as PrismaCreditCard,
  TransactionType
} from 'src/generated/prisma/client';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import { CreateCreditCardData } from '../../contracts/create-credit-card-data.contract';
import {
  PayInvoiceData,
  PayInvoiceResult
} from '../../contracts/pay-invoice-data.contract';
import { UpdateCreditCardData } from '../../contracts/update-credit-card-data.contract';
import { CreditCard, OpenInvoiceSummary } from '../../entities/credit-card.entity';
import { InvoiceRecord } from '../../entities/invoice.entity';
import { utcDateFromYmd, ymdFromUtcDate } from '../../lib/invoice-assignment';
import { CreditCardRepository } from '../credit-card.repository';

const invoiceWithPaymentsInclude = {
  payments: {
    orderBy: [{ paymentDate: 'asc' as const }, { createdAt: 'asc' as const }]
  }
};

type InvoiceWithPayments = PrismaInvoice & {
  payments?: PrismaInvoicePayment[];
};

@Injectable()
export class PrismaCreditCardRepository implements CreditCardRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapPayments(payments: PrismaInvoicePayment[]) {
    return payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      paymentDate: ymdFromUtcDate(payment.paymentDate),
      transactionId: payment.transactionId
    }));
  }

  private derivePaidFields(payments: PrismaInvoicePayment[]) {
    const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    let paymentTransactionId: string | null = null;
    for (const payment of payments) {
      if (payment.transactionId) {
        paymentTransactionId = payment.transactionId;
      }
    }
    return { paidAmount, paymentTransactionId };
  }

  private mapInvoice(invoice: InvoiceWithPayments): InvoiceRecord {
    const payments = invoice.payments ?? [];
    const { paidAmount, paymentTransactionId } = this.derivePaidFields(payments);
    const isFullyPaid = paidAmount >= invoice.amount && invoice.amount > 0;

    return {
      id: invoice.id,
      userId: invoice.userId,
      creditCardId: invoice.creditCardId,
      startsOn: ymdFromUtcDate(invoice.startsOn),
      endsOn: ymdFromUtcDate(invoice.endsOn),
      dueOn: ymdFromUtcDate(invoice.dueOn),
      status: isFullyPaid ? InvoiceStatus.PAID : invoice.status,
      amount: invoice.amount,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      paidAmount,
      paymentTransactionId,
      paidFromAccountId: invoice.paidFromAccountId,
      source: invoice.source,
      currencyCode: invoice.currencyCode,
      closingOn: null,
      minimumPaymentAmount: invoice.minimumPaymentAmount,
      allowsInstallments: invoice.allowsInstallments,
      isFullyPaid,
      isForecast: false,
      providerBillId: invoice.openFinanceBillId,
      payments: this.mapPayments(payments),
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString()
    };
  }

  private toOpenSummary(invoice: InvoiceWithPayments | null): OpenInvoiceSummary | null {
    if (!invoice) {
      return null;
    }
    return {
      id: invoice.id,
      startsOn: ymdFromUtcDate(invoice.startsOn),
      endsOn: ymdFromUtcDate(invoice.endsOn),
      dueOn: ymdFromUtcDate(invoice.dueOn),
      status: invoice.status,
      amount: invoice.amount,
      source: invoice.source,
      isForecast: false,
      providerBillId: invoice.openFinanceBillId
    };
  }

  private mapToEntity(
    creditCard: PrismaCreditCard,
    usedAmount: number,
    openInvoice: InvoiceWithPayments | null
  ): CreditCard {
    return {
      id: creditCard.id,
      userId: creditCard.userId,
      accountId: creditCard.accountId,
      name: creditCard.name,
      limit: creditCard.limit,
      closingDay: creditCard.closingDay,
      closingOnLastDay: creditCard.closingOnLastDay,
      dueDay: creditCard.dueDay,
      usedAmount,
      availableLimit:
        creditCard.source === 'PLUGGY' ? Math.max(creditCard.limit - usedAmount, 0) : null,
      brand: null,
      providerStatus: null,
      currencyCode: null,
      source: creditCard.source,
      overriddenFields: creditCard.overriddenFields,
      hiddenAt: creditCard.hiddenAt?.toISOString() ?? null,
      openInvoice: this.toOpenSummary(openInvoice),
      createdAt: creditCard.createdAt.toISOString(),
      updatedAt: creditCard.updatedAt.toISOString()
    };
  }

  private async sumUsedAmountByCardIds(
    userId: string,
    cardIds: string[]
  ): Promise<Map<string, number>> {
    const usedByCardId = new Map<string, number>();

    if (cardIds.length === 0) {
      return usedByCardId;
    }

    const aggregates = await this.prisma.transaction.groupBy({
      by: ['cardId'],
      where: {
        userId,
        cardId: { in: cardIds },
        type: TransactionType.EXPENSE,
        isPaid: false,
        isProjected: false
      },
      _sum: { amount: true }
    });

    for (const row of aggregates) {
      if (row.cardId === null) {
        continue;
      }

      usedByCardId.set(row.cardId, row._sum.amount ?? 0);
    }

    return usedByCardId;
  }

  private async sumUsedAmountForCard(userId: string, cardId: string): Promise<number> {
    const aggregate = await this.prisma.transaction.aggregate({
      where: {
        userId,
        cardId,
        type: TransactionType.EXPENSE,
        isPaid: false,
        isProjected: false
      },
      _sum: { amount: true }
    });

    return aggregate._sum.amount ?? 0;
  }

  private async findPersistedOpenInvoice(
    creditCard: PrismaCreditCard
  ): Promise<InvoiceWithPayments | null> {
    const todayUtc = utcDateFromYmd(utcTodayYmd());
    return await this.prisma.invoice.findFirst({
      where: {
        creditCardId: creditCard.id,
        userId: creditCard.userId,
        startsOn: { lte: todayUtc },
        endsOn: { gt: todayUtc }
      },
      orderBy: { startsOn: 'desc' },
      include: invoiceWithPaymentsInclude
    });
  }

  private async ensureOpenInvoiceForCard(
    creditCard: PrismaCreditCard
  ): Promise<InvoiceWithPayments | null> {
    if (creditCard.source === 'PLUGGY') {
      return await this.findPersistedOpenInvoice(creditCard);
    }

    const todayYmd = utcTodayYmd();
    const closingDay = resolveClosingDay(creditCard);
    const cycle = getCycleContainingDate(closingDay, todayYmd);
    const existing = await this.prisma.invoice.findUnique({
      where: {
        creditCardId_endsOn: {
          creditCardId: creditCard.id,
          endsOn: utcDateFromYmd(cycle.end)
        }
      },
      include: invoiceWithPaymentsInclude
    });
    if (existing) {
      if (
        existing.status === InvoiceStatus.OPEN &&
        canPayBillingCycle(ymdFromUtcDate(existing.endsOn), todayYmd)
      ) {
        return await this.prisma.invoice.update({
          where: { id: existing.id },
          data: { status: InvoiceStatus.CLOSED },
          include: invoiceWithPaymentsInclude
        });
      }
      if (existing.status === InvoiceStatus.PAID) {
        return null;
      }
      return existing;
    }

    const dueOn = getInvoiceDueYmd(closingDay, creditCard.dueDay, todayYmd);
    return await this.prisma.invoice.create({
      data: {
        userId: creditCard.userId,
        creditCardId: creditCard.id,
        startsOn: utcDateFromYmd(cycle.start),
        endsOn: utcDateFromYmd(cycle.end),
        dueOn: utcDateFromYmd(dueOn),
        status: canPayBillingCycle(cycle.end, todayYmd)
          ? InvoiceStatus.CLOSED
          : InvoiceStatus.OPEN,
        amount: 0
      },
      include: invoiceWithPaymentsInclude
    });
  }

  async findAllByUserId(userId: string): Promise<CreditCard[]> {
    const creditCards = await this.prisma.creditCard.findMany({
      where: { userId, hiddenAt: null },
      orderBy: { createdAt: 'desc' }
    });

    const usedByCardId = await this.sumUsedAmountByCardIds(
      userId,
      creditCards.map((creditCard) => creditCard.id)
    );

    const openByCard = new Map<string, InvoiceWithPayments | null>();
    for (const creditCard of creditCards) {
      openByCard.set(creditCard.id, await this.ensureOpenInvoiceForCard(creditCard));
    }

    return creditCards.map((creditCard) =>
      this.mapToEntity(
        creditCard,
        usedByCardId.get(creditCard.id) ?? 0,
        openByCard.get(creditCard.id) ?? null
      )
    );
  }

  async findByIdAndUserId(creditCardId: string, userId: string): Promise<CreditCard | null> {
    const creditCard = await this.prisma.creditCard.findFirst({
      where: {
        id: creditCardId,
        userId,
        hiddenAt: null
      }
    });

    if (!creditCard) {
      return null;
    }

    const usedAmount = await this.sumUsedAmountForCard(userId, creditCardId);
    const openInvoice = await this.ensureOpenInvoiceForCard(creditCard);

    return this.mapToEntity(creditCard, usedAmount, openInvoice);
  }

  async create(data: CreateCreditCardData): Promise<CreditCard> {
    const creditCard = await this.prisma.creditCard.create({
      data: {
        userId: data.userId,
        accountId: data.accountId ?? null,
        name: data.name,
        limit: data.limit,
        closingDay: data.closingDay as number,
        closingOnLastDay: data.closingOnLastDay ?? false,
        dueDay: data.dueDay
      }
    });

    const openInvoice = await this.ensureOpenInvoiceForCard(creditCard);
    return this.mapToEntity(creditCard, 0, openInvoice);
  }

  async update(creditCardId: string, data: UpdateCreditCardData): Promise<CreditCard> {
    const creditCard = await this.prisma.creditCard.update({
      where: { id: creditCardId },
      data: {
        accountId: data.accountId,
        name: data.name,
        limit: data.limit,
        closingDay: data.closingDay,
        closingOnLastDay: data.closingOnLastDay,
        dueDay: data.dueDay
      }
    });

    const usedAmount = await this.sumUsedAmountForCard(creditCard.userId, creditCardId);
    const openInvoice = await this.ensureOpenInvoiceForCard(creditCard);

    return this.mapToEntity(creditCard, usedAmount, openInvoice);
  }

  async hide(creditCardId: string): Promise<void> {
    await this.prisma.creditCard.update({
      where: { id: creditCardId },
      data: { hiddenAt: new Date() }
    });
  }

  async delete(creditCardId: string): Promise<void> {
    await this.prisma.creditCard.delete({
      where: { id: creditCardId }
    });
  }

  async findInvoicesByCreditCardId(
    creditCardId: string,
    userId: string,
    status?: 'OPEN' | 'CLOSED' | 'PAID'
  ): Promise<InvoiceRecord[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        creditCardId,
        userId,
        ...(status ? { status } : {})
      },
      include: invoiceWithPaymentsInclude,
      orderBy: { endsOn: 'desc' }
    });

    return invoices.map((invoice) => this.mapInvoice(invoice));
  }

  async findInvoicesDueInMonth(userId: string, yearMonth: string): Promise<InvoiceRecord[]> {
    const dueMonthStart = utcDateFromYmd(`${yearMonth}-01`);
    const year = dueMonthStart.getUTCFullYear();
    const month = dueMonthStart.getUTCMonth();
    const dueMonthEnd = new Date(Date.UTC(year, month + 1, 1));

    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        dueOn: {
          gte: dueMonthStart,
          lt: dueMonthEnd
        }
      },
      include: invoiceWithPaymentsInclude,
      orderBy: { dueOn: 'asc' }
    });

    return invoices.map((invoice) => this.mapInvoice(invoice));
  }

  async findInvoiceByIdAndCreditCard(
    invoiceId: string,
    creditCardId: string,
    userId: string
  ): Promise<InvoiceRecord | null> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        creditCardId,
        userId
      },
      include: invoiceWithPaymentsInclude
    });

    if (!invoice) {
      return null;
    }

    if (
      invoice.status === InvoiceStatus.OPEN &&
      canPayBillingCycle(ymdFromUtcDate(invoice.endsOn), utcTodayYmd())
    ) {
      const closed = await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.CLOSED },
        include: invoiceWithPaymentsInclude
      });
      return this.mapInvoice(closed);
    }

    return this.mapInvoice(invoice);
  }

  async payInvoice(data: PayInvoiceData): Promise<PayInvoiceResult | null> {
    return await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: data.invoiceId,
          creditCardId: data.creditCardId,
          userId: data.userId
        }
      });

      if (!invoice || invoice.status === InvoiceStatus.PAID) {
        return null;
      }

      const endsOn = ymdFromUtcDate(invoice.endsOn);
      if (!canPayBillingCycle(endsOn, data.paymentDate)) {
        return null;
      }

      if (invoice.status === InvoiceStatus.OPEN) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.CLOSED }
        });
      }

      const unpaid = await tx.transaction.findMany({
        where: {
          userId: data.userId,
          cardId: data.creditCardId,
          invoiceId: data.invoiceId,
          type: TransactionType.EXPENSE,
          isPaid: false,
          isProjected: false
        },
        select: { id: true, amount: true }
      });

      if (unpaid.length === 0) {
        return null;
      }

      const amount = unpaid.reduce((sum, transaction) => sum + transaction.amount, 0);

      const payment = await tx.transaction.create({
        data: {
          userId: data.userId,
          accountId: data.accountId,
          cardId: null,
          invoiceId: null,
          description: data.description,
          type: TransactionType.EXPENSE,
          amount,
          date: utcDateFromYmd(data.paymentDate),
          isPaid: true,
          isProjected: false
        }
      });

      await tx.transaction.updateMany({
        where: {
          id: { in: unpaid.map((transaction) => transaction.id) }
        },
        data: { isPaid: true }
      });

      await tx.account.update({
        where: {
          id: data.accountId,
          userId: data.userId
        },
        data: {
          balance: { decrement: amount }
        }
      });

      await tx.invoicePayment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          paymentDate: utcDateFromYmd(data.paymentDate),
          transactionId: payment.id,
          source: invoice.source
        }
      });

      const payments = await tx.invoicePayment.findMany({
        where: { invoiceId: invoice.id },
        orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }]
      });
      const { paidAmount, paymentTransactionId } = this.derivePaidFields(payments);
      const isPaid = paidAmount >= invoice.amount && invoice.amount > 0;

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: isPaid ? InvoiceStatus.PAID : InvoiceStatus.CLOSED,
          paidAt: isPaid ? new Date() : invoice.paidAt,
          paidAmount,
          paymentTransactionId,
          paidFromAccountId: data.accountId
        }
      });

      return {
        amount,
        accountId: data.accountId,
        paymentTransactionId: payment.id,
        paidCount: unpaid.length,
        invoiceId: invoice.id,
        cycleStart: ymdFromUtcDate(invoice.startsOn),
        cycleEnd: endsOn
      };
    });
  }
}
