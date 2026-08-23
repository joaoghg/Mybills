import { addOneCalendarDay, compareYmd, subtractOneCalendarDay } from '@mybills/utils';
import {
  CashFlowRole,
  InvoiceStatus,
  Prisma,
  TransactionType
} from 'src/generated/prisma/client';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import { deriveImportedCardCycleDays } from './imported-card-cycle-days';
import {
  billCycleAnchorDate,
  dateOnlyUtc,
  dueOnYearMonthRange,
  importedCycleDatesForAnchor,
  importedCycleDatesForDueMonth,
  importedCycleDatesFromBill,
  type ImportedCycleDates,
  utcDateFromYmd,
  ymdFromUtcDate
} from './imported-invoice-cycle-dates';
import { providerAmountToCents } from '../mappers/money';

type Db = PrismaService | Prisma.TransactionClient;

type CardRef = {
  id: string;
  userId: string;
  closingDay: number;
  closingOnLastDay: boolean;
  dueDay: number;
};

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
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

function remainingFromPayments(
  amount: number,
  payments: Array<{ amount: number }> | undefined,
  paidAmount: number | null
): number {
  if (payments) {
    return amount - payments.reduce((sum, payment) => sum + payment.amount, 0);
  }
  return amount - (paidAmount ?? 0);
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

export async function refreshImportedCardCycleDays(db: Db, openFinanceAccountId: string): Promise<void> {
  const card = await db.creditCard.findUnique({
    where: { openFinanceAccountId },
    select: { id: true, overriddenFields: true }
  });
  if (!card) {
    return;
  }

  const account = await db.openFinanceAccount.findUnique({
    where: { id: openFinanceAccountId },
    select: { closingDate: true, dueDate: true }
  });
  const bills = await db.openFinanceBill.findMany({
    where: { accountId: openFinanceAccountId, unavailableAt: null },
    select: { closingOn: true, dueOn: true }
  });

  const derived = deriveImportedCardCycleDays({
    accountClosingDate: account?.closingDate ?? null,
    accountDueDate: account?.dueDate ?? null,
    billClosingDates: bills
      .map((bill) => bill.closingOn)
      .filter((closingOn): closingOn is Date => closingOn != null),
    billDueDates: bills.map((bill) => bill.dueOn)
  });

  const overridden = new Set(card.overriddenFields);
  const data: {
    closingDay?: number;
    closingOnLastDay?: boolean;
    dueDay?: number;
  } = {};

  if (!overridden.has('closingDay') && derived.closingDay != null && derived.closingOnLastDay != null) {
    data.closingDay = derived.closingDay;
    data.closingOnLastDay = derived.closingOnLastDay;
  }
  if (!overridden.has('dueDay') && derived.dueDay != null) {
    data.dueDay = derived.dueDay;
  }
  if (Object.keys(data).length === 0) {
    return;
  }

  await db.creditCard.update({
    where: { id: card.id },
    data
  });
}

async function purchaseCount(db: Db, invoiceId: string): Promise<number> {
  return db.transaction.count({ where: { invoiceId } });
}

async function mergeInvoiceRowsOnEndsOnCollision(
  db: Db,
  leftId: string,
  rightId: string
): Promise<string> {
  const [left, right] = await Promise.all([
    db.invoice.findUnique({ where: { id: leftId } }),
    db.invoice.findUnique({ where: { id: rightId } })
  ]);
  if (!left) {
    return rightId;
  }
  if (!right) {
    return leftId;
  }

  if (left.openFinanceBillId && right.openFinanceBillId && left.openFinanceBillId !== right.openFinanceBillId) {
    return leftId;
  }

  const [leftCount, rightCount] = await Promise.all([purchaseCount(db, leftId), purchaseCount(db, rightId)]);
  const keep =
    left.openFinanceBillId && !right.openFinanceBillId
      ? left
      : right.openFinanceBillId && !left.openFinanceBillId
        ? right
        : leftCount >= rightCount
          ? left
          : right;
  const drop = keep.id === left.id ? right : left;

  await db.transaction.updateMany({
    where: { invoiceId: drop.id },
    data: { invoiceId: keep.id }
  });
  await db.invoicePayment.updateMany({
    where: { invoiceId: drop.id },
    data: { invoiceId: keep.id }
  });
  await db.invoice.delete({ where: { id: drop.id } });
  return keep.id;
}

async function findOverlappingUnbilledInvoices(
  db: Db,
  cardId: string,
  dates: ImportedCycleDates
) {
  return db.invoice.findMany({
    where: {
      creditCardId: cardId,
      openFinanceBillId: null,
      startsOn: { lt: dates.endsOn },
      endsOn: { gt: dates.startsOn }
    }
  });
}

async function persistUnbilledCycleDates(
  db: Db,
  invoiceId: string,
  cardId: string,
  dates: ImportedCycleDates
): Promise<string> {
  try {
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        startsOn: dates.startsOn,
        endsOn: dates.endsOn,
        dueOn: dates.dueOn
      }
    });
    return invoiceId;
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    const colliding = await db.invoice.findUnique({
      where: { creditCardId_endsOn: { creditCardId: cardId, endsOn: dates.endsOn } }
    });
    if (colliding) {
      return mergeInvoiceRowsOnEndsOnCollision(db, invoiceId, colliding.id);
    }
    throw error;
  }
}

export async function ensureUnbilledInvoiceForCycle(
  db: Db,
  card: CardRef,
  dates: ImportedCycleDates
): Promise<string> {
  const existing = await db.invoice.findUnique({
    where: {
      creditCardId_endsOn: { creditCardId: card.id, endsOn: dates.endsOn }
    }
  });

  const overlapping = await findOverlappingUnbilledInvoices(db, card.id, dates);

  if (existing?.openFinanceBillId) {
    let keepId = existing.id;
    for (const leftover of overlapping) {
      if (leftover.id === keepId) {
        continue;
      }
      const stillThere = await db.invoice.findUnique({ where: { id: leftover.id } });
      if (!stillThere || stillThere.openFinanceBillId) {
        continue;
      }
      keepId = await mergeInvoiceRowsOnEndsOnCollision(db, keepId, leftover.id);
    }
    return keepId;
  }
  let keepId = existing?.id ?? overlapping[0]?.id ?? null;

  if (keepId) {
    keepId = await persistUnbilledCycleDates(db, keepId, card.id, dates);
  } else {
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
      keepId = created.id;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      const byEndsOn = await db.invoice.findUnique({
        where: { creditCardId_endsOn: { creditCardId: card.id, endsOn: dates.endsOn } }
      });
      if (!byEndsOn) {
        throw error;
      }
      keepId = byEndsOn.openFinanceBillId
        ? byEndsOn.id
        : await persistUnbilledCycleDates(db, byEndsOn.id, card.id, dates);
    }
  }

  for (const leftover of overlapping) {
    if (leftover.id === keepId) {
      continue;
    }
    const stillThere = await db.invoice.findUnique({ where: { id: leftover.id } });
    if (!stillThere || stillThere.openFinanceBillId) {
      continue;
    }
    keepId = await mergeInvoiceRowsOnEndsOnCollision(db, keepId, leftover.id);
  }

  return keepId;
}

export async function ensureUnbilledInvoiceForDate(
  db: Db,
  openFinanceAccountId: string,
  dateInCycle: Date
): Promise<string | null> {
  const card = await findCardByOpenFinanceAccountId(db, openFinanceAccountId);
  if (!card) {
    return null;
  }
  return ensureUnbilledInvoiceForCycle(db, card, importedCycleDatesForAnchor(card, dateInCycle));
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

async function findUnbilledInvoiceForBillCycle(
  db: Db,
  cardId: string,
  dates: ImportedCycleDates,
  bill: { id: string; dueOn: Date; closingOn: Date | null }
) {
  const byEndsOn = await db.invoice.findUnique({
    where: { creditCardId_endsOn: { creditCardId: cardId, endsOn: dates.endsOn } }
  });
  if (byEndsOn && (!byEndsOn.openFinanceBillId || byEndsOn.openFinanceBillId === bill.id)) {
    return byEndsOn;
  }

  const anchor = billCycleAnchorDate(bill);
  return db.invoice.findFirst({
    where: {
      creditCardId: cardId,
      openFinanceBillId: null,
      startsOn: { lte: anchor },
      endsOn: { gt: anchor }
    }
  });
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
  dates: ImportedCycleDates
): Promise<string> {
  let targetId = invoiceId;
  const colliding = await db.invoice.findUnique({
    where: {
      creditCardId_endsOn: { creditCardId, endsOn: dates.endsOn }
    },
    select: { id: true, openFinanceBillId: true }
  });

  if (colliding && colliding.id !== invoiceId) {
    const self = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { openFinanceBillId: true }
    });
    const differentBills =
      Boolean(self?.openFinanceBillId) &&
      Boolean(colliding.openFinanceBillId) &&
      self?.openFinanceBillId !== colliding.openFinanceBillId;

    if (!differentBills) {
      targetId = await mergeInvoiceRowsOnEndsOnCollision(db, invoiceId, colliding.id);
    }
  }

  const stillColliding = await db.invoice.findUnique({
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
    source: 'PLUGGY' as const
  };

  try {
    await db.invoice.update({
      where: { id: targetId },
      data: {
        ...baseData,
        endsOn: stillColliding && stillColliding.id !== targetId ? undefined : dates.endsOn
      }
    });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    await db.invoice.update({
      where: { id: targetId },
      data: baseData
    });
  }

  await refreshInvoicePaidState(db, targetId, true);
  return targetId;
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
  const dates = importedCycleDatesFromBill(card, bill);

  const linked = await db.invoice.findUnique({
    where: { openFinanceBillId: bill.id }
  });
  if (linked) {
    return attachBillToInvoice(db, linked.id, card.id, mappedBill, dates);
  }

  const fromPurchases = await findInvoiceFromPurchasesWithBill(db, card.id, bill.id);
  if (fromPurchases) {
    return attachBillToInvoice(db, fromPurchases.id, card.id, mappedBill, dates);
  }

  const unbilledForCycle = await findUnbilledInvoiceForBillCycle(db, card.id, dates, bill);
  if (unbilledForCycle) {
    return attachBillToInvoice(db, unbilledForCycle.id, card.id, mappedBill, dates);
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
      return attachBillToInvoice(db, existingLinked.id, card.id, mappedBill, dates);
    }

    const byEndsOn = await db.invoice.findUnique({
      where: { creditCardId_endsOn: { creditCardId: card.id, endsOn: dates.endsOn } }
    });
    if (byEndsOn) {
      return attachBillToInvoice(db, byEndsOn.id, card.id, mappedBill, dates);
    }

    throw error;
  }
}

type InvoiceWithPayments = {
  id: string;
  creditCardId: string;
  amount: number;
  dueOn: Date;
  paidAmount: number | null;
  openFinanceBillId: string | null;
  source: 'MANUAL' | 'PLUGGY';
  payments: Array<{ amount: number }>;
};

async function findDuplicateLedgerOnCard(
  db: Db,
  cardId: string,
  amountCents: number,
  paymentDate: Date
) {
  const invoices = await db.invoice.findMany({
    where: { creditCardId: cardId },
    select: { id: true }
  });
  const invoiceIds = invoices.map((invoice) => invoice.id);
  if (invoiceIds.length === 0) {
    return null;
  }

  const ymd = ymdFromUtcDate(paymentDate);
  return db.invoicePayment.findFirst({
    where: {
      invoiceId: { in: invoiceIds },
      amount: amountCents,
      paymentDate: {
        gte: utcDateFromYmd(subtractOneCalendarDay(ymd)),
        lte: utcDateFromYmd(addOneCalendarDay(ymd))
      }
    }
  });
}

function pickSettlementInvoice(
  invoices: InvoiceWithPayments[],
  amountCents: number,
  paymentDate: Date,
  billInvoiceId: string | null,
  billTotalAmountCents: number | null
): InvoiceWithPayments | null {
  const candidates = invoices.filter((invoice) => {
    if (invoice.source !== 'PLUGGY') {
      return false;
    }
    const remaining = remainingFromPayments(invoice.amount, invoice.payments, invoice.paidAmount);
    return remaining === amountCents && remaining > 0;
  });
  if (candidates.length === 0) {
    return null;
  }

  const own = billInvoiceId ? candidates.find((invoice) => invoice.id === billInvoiceId) : undefined;
  if (own && billTotalAmountCents != null && billTotalAmountCents === amountCents) {
    return own;
  }

  const paymentYmd = ymdFromUtcDate(paymentDate);
  const onOrBefore = candidates
    .filter((invoice) => compareYmd(ymdFromUtcDate(invoice.dueOn), paymentYmd) <= 0)
    .sort((left, right) => compareYmd(ymdFromUtcDate(right.dueOn), ymdFromUtcDate(left.dueOn)));

  if (onOrBefore[0]) {
    return onOrBefore[0];
  }

  return own ?? null;
}

async function attachIdsToLedgerRow(
  db: Db,
  ledgerId: string,
  invoiceId: string,
  params: { openFinanceBillPaymentId?: string | null; transactionId?: string | null }
): Promise<void> {
  const existing = await db.invoicePayment.findUnique({ where: { id: ledgerId } });
  if (!existing) {
    return;
  }

  const data: {
    openFinanceBillPaymentId?: string;
    transactionId?: string;
  } = {};
  if (params.openFinanceBillPaymentId && !existing.openFinanceBillPaymentId) {
    data.openFinanceBillPaymentId = params.openFinanceBillPaymentId;
  }
  if (params.transactionId && !existing.transactionId) {
    data.transactionId = params.transactionId;
  }
  if (Object.keys(data).length > 0) {
    try {
      await db.invoicePayment.update({
        where: { id: ledgerId },
        data
      });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
    }
  }

  await refreshInvoicePaidState(db, invoiceId, true);
}

async function settleImportedPayment(
  db: Db,
  params: {
    cardId: string;
    amountCents: number;
    paymentDate: Date;
    openFinanceBillPaymentId?: string | null;
    transactionId?: string | null;
    billInvoiceId?: string | null;
    billTotalAmountCents?: number | null;
  }
): Promise<void> {
  const paymentDate = dateOnlyUtc(params.paymentDate);

  if (params.openFinanceBillPaymentId) {
    const byBillPayment = await db.invoicePayment.findUnique({
      where: { openFinanceBillPaymentId: params.openFinanceBillPaymentId }
    });
    if (byBillPayment) {
      await attachIdsToLedgerRow(db, byBillPayment.id, byBillPayment.invoiceId, {
        transactionId: params.transactionId
      });
      return;
    }
  }

  const duplicate = await findDuplicateLedgerOnCard(db, params.cardId, params.amountCents, paymentDate);
  if (duplicate) {
    await attachIdsToLedgerRow(db, duplicate.id, duplicate.invoiceId, {
      openFinanceBillPaymentId: params.openFinanceBillPaymentId,
      transactionId: params.transactionId
    });
    return;
  }

  const invoices = (await db.invoice.findMany({
    where: { creditCardId: params.cardId, source: 'PLUGGY' },
    include: { payments: true }
  })) as InvoiceWithPayments[];

  const target = pickSettlementInvoice(
    invoices,
    params.amountCents,
    paymentDate,
    params.billInvoiceId ?? null,
    params.billTotalAmountCents ?? null
  );
  if (!target) {
    return;
  }

  const remaining = remainingFromPayments(target.amount, target.payments, target.paidAmount);
  if (params.amountCents > remaining) {
    return;
  }

  await db.invoicePayment.create({
    data: {
      invoiceId: target.id,
      amount: params.amountCents,
      paymentDate,
      openFinanceBillPaymentId: params.openFinanceBillPaymentId ?? null,
      transactionId: params.transactionId ?? null,
      source: 'PLUGGY'
    }
  });
  await refreshInvoicePaidState(db, target.id, Boolean(target.openFinanceBillId));
}

export async function upsertInvoicePaymentsFromBill(
  db: Db,
  invoiceId: string,
  billId: string
): Promise<void> {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) {
    return;
  }

  const bill = await db.openFinanceBill.findUnique({ where: { id: billId } });
  const billTotalAmountCents = bill ? providerAmountToCents(Number(bill.totalAmount)) : invoice.amount;

  const payments = await db.openFinanceBillPayment.findMany({
    where: { billId, unavailableAt: null }
  });

  for (const payment of payments) {
    await settleImportedPayment(db, {
      cardId: invoice.creditCardId,
      amountCents: providerAmountToCents(Number(payment.amount)),
      paymentDate: payment.paymentDate,
      openFinanceBillPaymentId: payment.id,
      billInvoiceId: invoiceId,
      billTotalAmountCents
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

  let billInvoiceId: string | null = null;
  let billTotalAmountCents: number | null = null;
  if (params.openFinanceBillId) {
    const billInvoice = await db.invoice.findUnique({
      where: { openFinanceBillId: params.openFinanceBillId }
    });
    if (billInvoice && billInvoice.creditCardId === params.cardId) {
      billInvoiceId = billInvoice.id;
      billTotalAmountCents = billInvoice.amount;
    }
  }

  await settleImportedPayment(db, {
    cardId: params.cardId,
    amountCents: params.amountCents,
    paymentDate: params.paymentDate,
    transactionId: params.transactionId,
    billInvoiceId,
    billTotalAmountCents
  });
}

export async function resolveInvoiceIdForCardMovement(
  db: Db,
  params: {
    openFinanceAccountId: string;
    openFinanceBillId: string | null;
    cashFlowRole: CashFlowRole;
    transactionDate: Date;
    billForecastMonth: string | null;
  }
): Promise<string | null> {
  if (params.cashFlowRole === CashFlowRole.CARD_PAYMENT) {
    return null;
  }

  const card = await findCardByOpenFinanceAccountId(db, params.openFinanceAccountId);
  if (!card) {
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

  if (params.billForecastMonth) {
    const dueRange = dueOnYearMonthRange(params.billForecastMonth);
    const unbilledForMonth = await db.invoice.findFirst({
      where: {
        creditCardId: card.id,
        openFinanceBillId: null,
        dueOn: { gte: dueRange.gte, lt: dueRange.lt }
      }
    });
    if (unbilledForMonth) {
      return unbilledForMonth.id;
    }
    return ensureUnbilledInvoiceForCycle(
      db,
      card,
      importedCycleDatesForDueMonth(card, params.billForecastMonth)
    );
  }

  return ensureUnbilledInvoiceForCycle(
    db,
    card,
    importedCycleDatesForAnchor(card, params.transactionDate)
  );
}

export async function recalcUnbilledOpenInvoiceAmount(db: Db, invoiceId: string): Promise<void> {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.openFinanceBillId) {
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
