import {
  getCycleContainingDate,
  getInvoiceDueYmd,
  resolveClosingDay,
  utcTodayYmd
} from '@mybills/utils';
import {
  CashFlowRole,
  InvoiceStatus,
  Prisma,
  TransactionType
} from 'src/generated/prisma/client';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import { providerAmountToCents } from '../mappers/money';

type Db = PrismaService | Prisma.TransactionClient;

type CardRef = {
  id: string;
  userId: string;
  closingDay: number;
  closingOnLastDay: boolean;
  dueDay: number;
};

type CycleDates = {
  startsOn: Date;
  endsOn: Date;
  dueOn: Date;
};

function ymdFromUtcDate(d: Date): string {
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${month}-${day}`;
}

function utcDateFromYmd(ymd: string): Date {
  const parts = ymd.slice(0, 10).split('-').map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function dateOnly(value: Date): Date {
  return utcDateFromYmd(ymdFromUtcDate(value));
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function cycleDatesForCard(card: CardRef, anchor: Date): CycleDates {
  const closingDay = resolveClosingDay(card);
  const anchorYmd = ymdFromUtcDate(anchor);
  const cycle = getCycleContainingDate(closingDay, anchorYmd);
  return {
    startsOn: utcDateFromYmd(cycle.start),
    endsOn: utcDateFromYmd(cycle.end),
    dueOn: utcDateFromYmd(getInvoiceDueYmd(closingDay, card.dueDay, anchorYmd))
  };
}

function cycleDatesFromAccount(
  card: CardRef,
  account: { closingDate: Date | null; dueDate: Date | null }
): CycleDates {
  const anchor = account.closingDate ?? account.dueDate ?? utcDateFromYmd(utcTodayYmd());
  const fallback = cycleDatesForCard(card, anchor);
  return {
    startsOn: fallback.startsOn,
    endsOn: account.closingDate ? dateOnly(account.closingDate) : fallback.endsOn,
    dueOn: account.dueDate ? dateOnly(account.dueDate) : fallback.dueOn
  };
}

function cycleDatesFromBill(
  card: CardRef,
  bill: { dueOn: Date; closingOn: Date | null }
): CycleDates {
  const endsOn = dateOnly(bill.closingOn ?? bill.dueOn);
  const fallback = cycleDatesForCard(card, endsOn);
  return {
    startsOn: fallback.startsOn,
    endsOn,
    dueOn: dateOnly(bill.dueOn)
  };
}

async function findCardByOpenFinanceAccountId(db: Db, openFinanceAccountId: string): Promise<CardRef | null> {
  return db.creditCard.findUnique({
    where: { openFinanceAccountId },
    select: {
      id: true,
      userId: true,
      closingDay: true,
      closingOnLastDay: true,
      dueDay: true
    }
  });
}

async function findUnbilledOpenInvoice(db: Db, creditCardId: string) {
  return db.invoice.findFirst({
    where: {
      creditCardId,
      status: InvoiceStatus.OPEN,
      openFinanceBillId: null
    }
  });
}

function derivePaidFields(payments: Array<{ amount: number; transactionId: string | null }>) {
  const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  let paymentTransactionId: string | null = null;
  for (const payment of payments) {
    if (payment.transactionId) {
      paymentTransactionId = payment.transactionId;
    }
  }
  return { paidAmount, paymentTransactionId };
}

async function refreshInvoicePaidState(
  db: Db,
  invoiceId: string,
  billed: boolean
): Promise<void> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { orderBy: { paymentDate: 'asc' } } }
  });

  if (!invoice) {
    return;
  }

  const { paidAmount, paymentTransactionId } = derivePaidFields(invoice.payments);
  const isPaid = paidAmount >= invoice.amount && invoice.amount > 0;
  const status = isPaid
    ? InvoiceStatus.PAID
    : billed || invoice.openFinanceBillId
      ? InvoiceStatus.CLOSED
      : InvoiceStatus.OPEN;

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      paidAmount,
      paymentTransactionId,
      paidAt: isPaid ? (invoice.paidAt ?? new Date()) : null
    }
  });
}

export async function ensureUnbilledOpenInvoice(
  db: Db,
  openFinanceAccountId: string,
  accountDates: { closingDate: Date | null; dueDate: Date | null }
): Promise<string | null> {
  const card = await findCardByOpenFinanceAccountId(db, openFinanceAccountId);
  if (!card) {
    return null;
  }

  const existing = await findUnbilledOpenInvoice(db, card.id);
  const dates = cycleDatesFromAccount(card, accountDates);

  if (existing) {
    const colliding = await db.invoice.findUnique({
      where: {
        creditCardId_endsOn: { creditCardId: card.id, endsOn: dates.endsOn }
      },
      select: { id: true }
    });

    await db.invoice.update({
      where: { id: existing.id },
      data: {
        dueOn: dates.dueOn,
        startsOn: dates.startsOn,
        endsOn: colliding && colliding.id !== existing.id ? existing.endsOn : dates.endsOn
      }
    });
    return existing.id;
  }

  try {
    const created = await db.invoice.create({
      data: {
        userId: card.userId,
        creditCardId: card.id,
        startsOn: dates.startsOn,
        endsOn: dates.endsOn,
        dueOn: dates.dueOn,
        status: InvoiceStatus.OPEN,
        amount: 0,
        source: 'PLUGGY'
      }
    });
    return created.id;
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    const unbilled = await findUnbilledOpenInvoice(db, card.id);
    if (unbilled) {
      return unbilled.id;
    }

    const byEndsOn = await db.invoice.findUnique({
      where: { creditCardId_endsOn: { creditCardId: card.id, endsOn: dates.endsOn } }
    });
    if (byEndsOn && !byEndsOn.openFinanceBillId && byEndsOn.status === InvoiceStatus.OPEN) {
      return byEndsOn.id;
    }

    return null;
  }
}

async function findInvoiceFromPurchasesWithBill(
  db: Db,
  cardId: string,
  openFinanceBillId: string
) {
  const ofTransactions = await db.openFinanceTransaction.findMany({
    where: { billId: openFinanceBillId },
    select: { id: true }
  });
  const ofIds = ofTransactions.map((row) => row.id);
  if (ofIds.length === 0) {
    return null;
  }

  const purchase = await db.transaction.findFirst({
    where: {
      cardId,
      invoiceId: { not: null },
      openFinanceTransactionId: { in: ofIds },
      cashFlowRole: { not: CashFlowRole.CARD_PAYMENT }
    },
    select: { invoiceId: true }
  });

  if (!purchase?.invoiceId) {
    return null;
  }

  return db.invoice.findUnique({ where: { id: purchase.invoiceId } });
}

async function attachBillToInvoice(
  db: Db,
  invoiceId: string,
  creditCardId: string,
  bill: {
    id: string;
    dueOn: Date;
    closingOn: Date | null;
    totalAmountCents: number;
    currencyCode: string;
    minimumPaymentAmountCents: number | null;
    allowsInstallments: boolean | null;
  },
  dates: CycleDates
): Promise<void> {
  const colliding = await db.invoice.findUnique({
    where: {
      creditCardId_endsOn: { creditCardId, endsOn: dates.endsOn }
    },
    select: { id: true }
  });

  const baseData = {
    openFinanceBillId: bill.id,
    amount: bill.totalAmountCents,
    dueOn: dates.dueOn,
    startsOn: dates.startsOn,
    currencyCode: bill.currencyCode,
    minimumPaymentAmount: bill.minimumPaymentAmountCents,
    allowsInstallments: bill.allowsInstallments,
    source: 'PLUGGY' as const,
    status: InvoiceStatus.CLOSED
  };

  try {
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        ...baseData,
        endsOn: colliding && colliding.id !== invoiceId ? undefined : dates.endsOn
      }
    });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: baseData
    });
  }
}

export async function mergeCanonicalBillIntoInvoice(
  db: Db,
  openFinanceAccountId: string,
  bill: {
    id: string;
    dueOn: Date;
    closingOn: Date | null;
    totalAmount: { toString(): string } | number;
    totalAmountCents?: number;
    currencyCode: string;
    minimumPaymentAmount: { toString(): string } | number | null;
    minimumPaymentAmountCents?: number | null;
    allowsInstallments: boolean | null;
  }
): Promise<string | null> {
  const card = await findCardByOpenFinanceAccountId(db, openFinanceAccountId);
  if (!card) {
    return null;
  }

  const totalAmountCents =
    bill.totalAmountCents ?? providerAmountToCents(Number(bill.totalAmount));
  const minimumPaymentAmountCents =
    bill.minimumPaymentAmountCents ??
    (bill.minimumPaymentAmount == null
      ? null
      : providerAmountToCents(Number(bill.minimumPaymentAmount)));
  const mappedBill = {
    id: bill.id,
    dueOn: bill.dueOn,
    closingOn: bill.closingOn,
    totalAmountCents,
    currencyCode: bill.currencyCode,
    minimumPaymentAmountCents,
    allowsInstallments: bill.allowsInstallments
  };
  const dates = cycleDatesFromBill(card, bill);

  const linked = await db.invoice.findUnique({
    where: { openFinanceBillId: bill.id }
  });
  if (linked) {
    await attachBillToInvoice(db, linked.id, card.id, mappedBill, dates);
    return linked.id;
  }

  const fromPurchases = await findInvoiceFromPurchasesWithBill(db, card.id, bill.id);
  if (fromPurchases) {
    await attachBillToInvoice(db, fromPurchases.id, card.id, mappedBill, dates);
    return fromPurchases.id;
  }

  const unbilled = await findUnbilledOpenInvoice(db, card.id);
  if (unbilled) {
    await attachBillToInvoice(db, unbilled.id, card.id, mappedBill, dates);
    return unbilled.id;
  }

  try {
    const created = await db.invoice.create({
      data: {
        userId: card.userId,
        creditCardId: card.id,
        startsOn: dates.startsOn,
        endsOn: dates.endsOn,
        dueOn: dates.dueOn,
        status: InvoiceStatus.CLOSED,
        amount: totalAmountCents,
        source: 'PLUGGY',
        openFinanceBillId: bill.id,
        currencyCode: bill.currencyCode,
        minimumPaymentAmount: minimumPaymentAmountCents,
        allowsInstallments: bill.allowsInstallments
      }
    });
    return created.id;
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    const existingLinked = await db.invoice.findUnique({
      where: { openFinanceBillId: bill.id }
    });
    if (existingLinked) {
      await attachBillToInvoice(db, existingLinked.id, card.id, mappedBill, dates);
      return existingLinked.id;
    }

    const byEndsOn = await db.invoice.findUnique({
      where: { creditCardId_endsOn: { creditCardId: card.id, endsOn: dates.endsOn } }
    });
    if (byEndsOn) {
      await attachBillToInvoice(db, byEndsOn.id, card.id, mappedBill, dates);
      return byEndsOn.id;
    }

    throw error;
  }
}

export async function upsertInvoicePaymentsFromBill(
  db: Db,
  invoiceId: string,
  billId: string
): Promise<void> {
  const payments = await db.openFinanceBillPayment.findMany({
    where: { billId, unavailableAt: null }
  });

  for (const payment of payments) {
    const amount = providerAmountToCents(Number(payment.amount));
    const paymentDate = dateOnly(payment.paymentDate);

    await db.invoicePayment.upsert({
      where: { openFinanceBillPaymentId: payment.id },
      create: {
        invoiceId,
        amount,
        paymentDate,
        openFinanceBillPaymentId: payment.id,
        source: 'PLUGGY'
      },
      update: {
        invoiceId,
        amount,
        paymentDate
      }
    });
  }

  await refreshInvoicePaidState(db, invoiceId, true);
}

export async function maybeRecordCardPaymentLedger(
  db: Db,
  params: {
    cardId: string;
    cashFlowRole: CashFlowRole;
    amountCents: number;
    paymentDate: Date;
    transactionId: string;
    openFinanceBillId: string | null;
  }
): Promise<void> {
  if (params.cashFlowRole !== CashFlowRole.CARD_PAYMENT) {
    return;
  }

  if (!params.openFinanceBillId) {
    return;
  }

  const invoice = await db.invoice.findUnique({
    where: { openFinanceBillId: params.openFinanceBillId }
  });
  if (!invoice || invoice.creditCardId !== params.cardId) {
    return;
  }

  const paymentDate = dateOnly(params.paymentDate);
  const matching = await db.invoicePayment.findFirst({
    where: {
      invoiceId: invoice.id,
      amount: params.amountCents,
      paymentDate
    }
  });

  if (matching) {
    if (!matching.transactionId) {
      await db.invoicePayment.update({
        where: { id: matching.id },
        data: { transactionId: params.transactionId }
      });
      await refreshInvoicePaidState(db, invoice.id, true);
    }
    return;
  }

  await db.invoicePayment.create({
    data: {
      invoiceId: invoice.id,
      amount: params.amountCents,
      paymentDate,
      transactionId: params.transactionId,
      source: 'PLUGGY'
    }
  });
  await refreshInvoicePaidState(db, invoice.id, true);
}

export async function resolveInvoiceIdForCardMovement(
  db: Db,
  params: {
    openFinanceAccountId: string;
    openFinanceBillId: string | null;
    cashFlowRole: CashFlowRole;
    accountDates: { closingDate: Date | null; dueDate: Date | null };
  }
): Promise<string | null> {
  if (params.cashFlowRole === CashFlowRole.CARD_PAYMENT) {
    return null;
  }

  if (params.openFinanceBillId) {
    const bill = await db.openFinanceBill.findUnique({
      where: { id: params.openFinanceBillId }
    });
    if (bill) {
      return mergeCanonicalBillIntoInvoice(db, params.openFinanceAccountId, bill);
    }
  }

  return ensureUnbilledOpenInvoice(db, params.openFinanceAccountId, params.accountDates);
}

export async function recalcUnbilledOpenInvoiceAmount(db: Db, invoiceId: string): Promise<void> {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.openFinanceBillId || invoice.status !== InvoiceStatus.OPEN) {
    return;
  }

  const rows = await db.transaction.findMany({
    where: {
      invoiceId,
      hiddenAt: null,
      cashFlowRole: { not: CashFlowRole.CARD_PAYMENT },
      type: { in: [TransactionType.EXPENSE, TransactionType.INCOME] }
    },
    select: { type: true, amount: true }
  });

  const amount = rows.reduce((sum, row) => {
    if (row.type === TransactionType.EXPENSE) {
      return sum + row.amount;
    }
    if (row.type === TransactionType.INCOME) {
      return sum - row.amount;
    }
    return sum;
  }, 0);

  await db.invoice.update({
    where: { id: invoiceId },
    data: { amount }
  });
}

export async function recalcTouchedUnbilledOpenInvoices(db: Db, invoiceIds: Iterable<string>): Promise<void> {
  const unique = [...new Set(invoiceIds)].filter(Boolean);
  for (const invoiceId of unique) {
    await recalcUnbilledOpenInvoiceAmount(db, invoiceId);
  }
}
