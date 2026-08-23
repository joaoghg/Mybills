import { randomUUID } from 'node:crypto';
import { CashFlowRole, InvoiceStatus, TransactionType } from 'src/generated/prisma/client';
import {
  ensureUnbilledInvoiceForDate,
  maybeRecordCardPaymentLedger,
  mergeCanonicalBillIntoInvoice,
  recalcUnbilledOpenInvoiceAmount,
  resolveInvoiceIdForCardMovement,
  upsertInvoicePaymentsFromBill
} from '../lib/project-imported-invoices';

type InvoiceRow = {
  id: string;
  userId: string;
  creditCardId: string;
  startsOn: Date;
  endsOn: Date;
  dueOn: Date;
  status: 'OPEN' | 'CLOSED' | 'PAID';
  amount: number;
  paidAt: Date | null;
  paidAmount: number | null;
  paymentTransactionId: string | null;
  paidFromAccountId: string | null;
  source: 'MANUAL' | 'PLUGGY';
  openFinanceBillId: string | null;
  currencyCode: string | null;
  minimumPaymentAmount: number | null;
  allowsInstallments: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

type InvoicePaymentRow = {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  transactionId: string | null;
  openFinanceBillPaymentId: string | null;
  source: 'MANUAL' | 'PLUGGY';
  createdAt: Date;
  updatedAt: Date;
};

type CardRow = {
  id: string;
  userId: string;
  closingDay: number;
  closingOnLastDay: boolean;
  dueDay: number;
  openFinanceAccountId: string;
  overriddenFields: string[];
};

type BillRow = {
  id: string;
  dueOn: Date;
  closingOn: Date | null;
  totalAmount: number;
  currencyCode: string;
  minimumPaymentAmount: number | null;
  allowsInstallments: boolean | null;
};

type BillPaymentRow = {
  id: string;
  billId: string;
  amount: number;
  paymentDate: Date;
  unavailableAt: Date | null;
};

type OfTransactionRow = {
  id: string;
  billId: string;
};

type PurchaseRow = {
  id: string;
  cardId: string;
  invoiceId: string | null;
  openFinanceTransactionId: string | null;
  cashFlowRole: CashFlowRole;
  type: TransactionType;
  amount: number;
  hiddenAt: Date | null;
};

type InvoiceWhere = {
  id?: string;
  creditCardId?: string;
  status?: 'OPEN' | 'CLOSED' | 'PAID';
  openFinanceBillId?: string | null;
  source?: 'MANUAL' | 'PLUGGY';
  startsOn?: { lte?: Date; lt?: Date };
  endsOn?: { gt?: Date };
  dueOn?: { gte?: Date; lt?: Date };
};

function sameUtcDay(left: Date, right: Date): boolean {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

function invoiceMatchesWhere(row: InvoiceRow, where: InvoiceWhere): boolean {
  if (where.id && row.id !== where.id) {
    return false;
  }
  if (where.creditCardId && row.creditCardId !== where.creditCardId) {
    return false;
  }
  if (where.status && row.status !== where.status) {
    return false;
  }
  if (where.openFinanceBillId !== undefined && row.openFinanceBillId !== where.openFinanceBillId) {
    return false;
  }
  if (where.source && row.source !== where.source) {
    return false;
  }
  if (where.startsOn?.lte && row.startsOn.getTime() > where.startsOn.lte.getTime()) {
    return false;
  }
  if (where.startsOn?.lt && !(row.startsOn.getTime() < where.startsOn.lt.getTime())) {
    return false;
  }
  if (where.endsOn?.gt && !(row.endsOn.getTime() > where.endsOn.gt.getTime())) {
    return false;
  }
  if (where.dueOn?.gte && row.dueOn.getTime() < where.dueOn.gte.getTime()) {
    return false;
  }
  if (where.dueOn?.lt && !(row.dueOn.getTime() < where.dueOn.lt.getTime())) {
    return false;
  }
  return true;
}

function createProjectDb(seed?: {
  cards?: CardRow[];
  invoices?: InvoiceRow[];
  invoicePayments?: InvoicePaymentRow[];
  bills?: BillRow[];
  billPayments?: BillPaymentRow[];
  ofTransactions?: OfTransactionRow[];
  purchases?: PurchaseRow[];
}) {
  const cards = [...(seed?.cards ?? [])];
  const invoices = [...(seed?.invoices ?? [])];
  const invoicePayments = [...(seed?.invoicePayments ?? [])];
  const bills = [...(seed?.bills ?? [])];
  const billPayments = [...(seed?.billPayments ?? [])];
  const ofTransactions = [...(seed?.ofTransactions ?? [])];
  const purchases = [...(seed?.purchases ?? [])];

  function findInvoice(where: {
    id?: string;
    openFinanceBillId?: string;
    creditCardId_endsOn?: { creditCardId: string; endsOn: Date };
  }): InvoiceRow | null {
    if (where.id) {
      return invoices.find((row) => row.id === where.id) ?? null;
    }
    if (where.openFinanceBillId) {
      return invoices.find((row) => row.openFinanceBillId === where.openFinanceBillId) ?? null;
    }
    if (where.creditCardId_endsOn) {
      return (
        invoices.find(
          (row) =>
            row.creditCardId === where.creditCardId_endsOn?.creditCardId &&
            sameUtcDay(row.endsOn, where.creditCardId_endsOn.endsOn)
        ) ?? null
      );
    }
    return null;
  }

  const invoiceCreate = jest.fn(
    async ({ data }: { data: Partial<InvoiceRow> & { userId: string; creditCardId: string } }) => {
      const created: InvoiceRow = {
        id: randomUUID(),
        userId: data.userId,
        creditCardId: data.creditCardId,
        startsOn: data.startsOn ?? new Date(),
        endsOn: data.endsOn ?? new Date(),
        dueOn: data.dueOn ?? new Date(),
        status: data.status ?? 'OPEN',
        amount: data.amount ?? 0,
        paidAt: data.paidAt ?? null,
        paidAmount: data.paidAmount ?? null,
        paymentTransactionId: data.paymentTransactionId ?? null,
        paidFromAccountId: data.paidFromAccountId ?? null,
        source: data.source ?? 'PLUGGY',
        openFinanceBillId: data.openFinanceBillId ?? null,
        currencyCode: data.currencyCode ?? null,
        minimumPaymentAmount: data.minimumPaymentAmount ?? null,
        allowsInstallments: data.allowsInstallments ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      invoices.push(created);
      return created;
    }
  );

  const invoicePaymentCreate = jest.fn(async ({ data }: { data: Partial<InvoicePaymentRow> }) => {
    const created: InvoicePaymentRow = {
      id: randomUUID(),
      invoiceId: data.invoiceId ?? '',
      amount: data.amount ?? 0,
      paymentDate: data.paymentDate ?? new Date(),
      transactionId: data.transactionId ?? null,
      openFinanceBillPaymentId: data.openFinanceBillPaymentId ?? null,
      source: data.source ?? 'PLUGGY',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    invoicePayments.push(created);
    return created;
  });

  const db = {
    creditCard: {
      findUnique: jest.fn(async ({ where }: { where: { openFinanceAccountId: string } }) => {
        return cards.find((row) => row.openFinanceAccountId === where.openFinanceAccountId) ?? null;
      })
    },
    invoice: {
      findFirst: jest.fn(async ({ where }: { where: InvoiceWhere }) => {
        return invoices.find((row) => invoiceMatchesWhere(row, where)) ?? null;
      }),
      findMany: jest.fn(
        async ({
          where,
          include,
          select
        }: {
          where?: InvoiceWhere;
          include?: { payments?: unknown };
          select?: { id?: true };
        }) => {
          const rows = invoices.filter((row) => invoiceMatchesWhere(row, where ?? {}));
          if (select?.id) {
            return rows.map((row) => ({ id: row.id }));
          }
          if (include?.payments) {
            return rows.map((row) => ({
              ...row,
              payments: invoicePayments.filter((payment) => payment.invoiceId === row.id)
            }));
          }
          return rows;
        }
      ),
      findUnique: jest.fn(
        async ({
          where,
          include
        }: {
          where: {
            id?: string;
            openFinanceBillId?: string;
            creditCardId_endsOn?: { creditCardId: string; endsOn: Date };
          };
          select?: { id: true; openFinanceBillId?: true };
          include?: { payments: unknown };
        }) => {
          const found = findInvoice(where);
          if (!found) {
            return null;
          }
          if (include?.payments) {
            const payments = invoicePayments
              .filter((row) => row.invoiceId === found.id)
              .sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());
            return { ...found, payments };
          }
          return found;
        }
      ),
      create: invoiceCreate,
      update: jest.fn(
        async ({ where, data }: { where: { id: string }; data: Partial<InvoiceRow> }) => {
          const found = invoices.find((row) => row.id === where.id);
          if (!found) {
            throw new Error(`invoice ${where.id} not found`);
          }
          (Object.keys(data) as Array<keyof InvoiceRow>).forEach((key) => {
            const value = data[key];
            if (value !== undefined) {
              Object.assign(found, { [key]: value });
            }
          });
          found.updatedAt = new Date();
          return found;
        }
      ),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        const index = invoices.findIndex((row) => row.id === where.id);
        if (index < 0) {
          throw new Error(`invoice ${where.id} not found`);
        }
        const [removed] = invoices.splice(index, 1);
        return removed;
      })
    },
    openFinanceTransaction: {
      findMany: jest.fn(async ({ where }: { where: { billId: string } }) => {
        return ofTransactions.filter((row) => row.billId === where.billId).map((row) => ({ id: row.id }));
      })
    },
    transaction: {
      findFirst: jest.fn(
        async ({
          where
        }: {
          where: {
            cardId: string;
            invoiceId: { not: null };
            openFinanceTransactionId: { in: string[] };
            cashFlowRole: { not: CashFlowRole };
          };
        }) => {
          return (
            purchases.find(
              (row) =>
                row.cardId === where.cardId &&
                row.invoiceId !== null &&
                row.openFinanceTransactionId !== null &&
                where.openFinanceTransactionId.in.includes(row.openFinanceTransactionId) &&
                row.cashFlowRole !== where.cashFlowRole.not
            ) ?? null
          );
        }
      ),
      findMany: jest.fn(
        async ({
          where
        }: {
          where: {
            invoiceId: string;
            hiddenAt: null;
            cashFlowRole: { not: CashFlowRole };
            type: { in: TransactionType[] };
          };
        }) => {
          return purchases.filter(
            (row) =>
              row.invoiceId === where.invoiceId &&
              row.hiddenAt === where.hiddenAt &&
              row.cashFlowRole !== where.cashFlowRole.not &&
              where.type.in.includes(row.type)
          );
        }
      ),
      count: jest.fn(async ({ where }: { where: { invoiceId: string } }) => {
        return purchases.filter((row) => row.invoiceId === where.invoiceId).length;
      }),
      updateMany: jest.fn(
        async ({
          where,
          data
        }: {
          where: { invoiceId: string };
          data: { invoiceId: string };
        }) => {
          let count = 0;
          for (const row of purchases) {
            if (row.invoiceId === where.invoiceId) {
              row.invoiceId = data.invoiceId;
              count += 1;
            }
          }
          return { count };
        }
      )
    },
    openFinanceBill: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        return bills.find((row) => row.id === where.id) ?? null;
      })
    },
    openFinanceBillPayment: {
      findMany: jest.fn(async ({ where }: { where: { billId: string; unavailableAt: null } }) => {
        return billPayments.filter(
          (row) => row.billId === where.billId && row.unavailableAt === where.unavailableAt
        );
      })
    },
    invoicePayment: {
      upsert: jest.fn(
        async ({
          where,
          create,
          update
        }: {
          where: { openFinanceBillPaymentId: string };
          create: Partial<InvoicePaymentRow>;
          update: Partial<InvoicePaymentRow>;
        }) => {
          const existing = invoicePayments.find(
            (row) => row.openFinanceBillPaymentId === where.openFinanceBillPaymentId
          );
          if (existing) {
            Object.assign(existing, update);
            return existing;
          }
          return invoicePaymentCreate({ data: create });
        }
      ),
      findUnique: jest.fn(
        async ({
          where
        }: {
          where: { id?: string; openFinanceBillPaymentId?: string };
        }) => {
          if (where.id) {
            return invoicePayments.find((row) => row.id === where.id) ?? null;
          }
          if (where.openFinanceBillPaymentId) {
            return (
              invoicePayments.find(
                (row) => row.openFinanceBillPaymentId === where.openFinanceBillPaymentId
              ) ?? null
            );
          }
          return null;
        }
      ),
      findFirst: jest.fn(
        async ({
          where
        }: {
          where: {
            invoiceId?: string | { in: string[] };
            amount: number;
            paymentDate: Date | { gte: Date; lte: Date };
          };
        }) => {
          return (
            invoicePayments.find((row) => {
              if (typeof where.invoiceId === 'string' && row.invoiceId !== where.invoiceId) {
                return false;
              }
              if (
                where.invoiceId &&
                typeof where.invoiceId !== 'string' &&
                !where.invoiceId.in.includes(row.invoiceId)
              ) {
                return false;
              }
              if (row.amount !== where.amount) {
                return false;
              }
              if (where.paymentDate instanceof Date) {
                return sameUtcDay(row.paymentDate, where.paymentDate);
              }
              return (
                row.paymentDate.getTime() >= where.paymentDate.gte.getTime() &&
                row.paymentDate.getTime() <= where.paymentDate.lte.getTime()
              );
            }) ?? null
          );
        }
      ),
      create: invoicePaymentCreate,
      update: jest.fn(
        async ({
          where,
          data
        }: {
          where: { id: string };
          data: Partial<InvoicePaymentRow>;
        }) => {
          const found = invoicePayments.find((row) => row.id === where.id);
          if (!found) {
            throw new Error(`invoicePayment ${where.id} not found`);
          }
          Object.assign(found, data);
          return found;
        }
      ),
      updateMany: jest.fn(
        async ({
          where,
          data
        }: {
          where: { invoiceId: string };
          data: { invoiceId: string };
        }) => {
          let count = 0;
          for (const row of invoicePayments) {
            if (row.invoiceId === where.invoiceId) {
              row.invoiceId = data.invoiceId;
              count += 1;
            }
          }
          return { count };
        }
      )
    }
  };

  return {
    db,
    invoices,
    invoicePayments,
    purchases,
    invoiceCreate,
    invoicePaymentCreate
  };
}

function asProjectDb(db: ReturnType<typeof createProjectDb>['db']) {
  return db as unknown as Parameters<typeof mergeCanonicalBillIntoInvoice>[0];
}

describe('project-imported-invoices', () => {
  const userId = '2cea6915-f57e-4ba4-84ec-08f47e4eb7f9';
  const cardId = '5ea4f605-31d5-4dcf-93bc-45fafad6f319';
  const openFinanceAccountId = '3ea4f605-31d5-4dcf-93bc-45fafad6f318';
  const card: CardRow = {
    id: cardId,
    userId,
    closingDay: 10,
    closingOnLastDay: false,
    dueDay: 18,
    openFinanceAccountId,
    overriddenFields: []
  };
  const nubankCard: CardRow = {
    ...card,
    closingDay: 4,
    dueDay: 11
  };
  const cycleDate = new Date(Date.UTC(2026, 5, 15));
  const billId = '6ea4f605-31d5-4dcf-93bc-45fafad6f316';
  const bill: BillRow = {
    id: billId,
    dueOn: new Date(Date.UTC(2026, 5, 18)),
    closingOn: new Date(Date.UTC(2026, 5, 9)),
    totalAmount: 150,
    currencyCode: 'BRL',
    minimumPaymentAmount: 50,
    allowsInstallments: true
  };

  function makeInvoice(overrides: Partial<InvoiceRow> & { id: string }): InvoiceRow {
    return {
      userId,
      creditCardId: cardId,
      startsOn: new Date(Date.UTC(2026, 4, 10)),
      endsOn: new Date(Date.UTC(2026, 5, 9)),
      dueOn: new Date(Date.UTC(2026, 5, 18)),
      status: 'OPEN',
      amount: 0,
      paidAt: null,
      paidAmount: null,
      paymentTransactionId: null,
      paidFromAccountId: null,
      source: 'PLUGGY',
      openFinanceBillId: null,
      currencyCode: null,
      minimumPaymentAmount: null,
      allowsInstallments: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  describe('ensureUnbilledInvoiceForDate', () => {
    it('should upsert one unbilled invoice per cycle and not create a second on resync', async () => {
      const { db, invoices, invoiceCreate } = createProjectDb({ cards: [card] });

      const firstId = await ensureUnbilledInvoiceForDate(asProjectDb(db), openFinanceAccountId, cycleDate);
      const secondId = await ensureUnbilledInvoiceForDate(asProjectDb(db), openFinanceAccountId, cycleDate);

      expect(firstId).toEqual(expect.any(String));
      expect(secondId).toBe(firstId);
      expect(invoiceCreate).toHaveBeenCalledTimes(1);
      expect(invoices.filter((row) => row.openFinanceBillId === null)).toHaveLength(1);
    });

    it('should remap a stale last-day unbilled invoice onto the derived cycle instead of creating another', async () => {
      const staleId = randomUUID();
      const { db, invoices, invoiceCreate } = createProjectDb({
        cards: [nubankCard],
        invoices: [
          makeInvoice({
            id: staleId,
            startsOn: new Date(Date.UTC(2026, 6, 31)),
            endsOn: new Date(Date.UTC(2026, 7, 31)),
            dueOn: new Date(Date.UTC(2026, 8, 10)),
            status: 'OPEN',
            amount: 150463
          })
        ]
      });

      const remappedId = await ensureUnbilledInvoiceForDate(
        asProjectDb(db),
        openFinanceAccountId,
        new Date(Date.UTC(2026, 7, 19))
      );

      expect(remappedId).toBe(staleId);
      expect(invoiceCreate).not.toHaveBeenCalled();
      expect(invoices).toHaveLength(1);
      expect(invoices[0]?.startsOn).toEqual(new Date(Date.UTC(2026, 7, 4)));
      expect(invoices[0]?.endsOn).toEqual(new Date(Date.UTC(2026, 8, 4)));
      expect(invoices[0]?.dueOn).toEqual(new Date(Date.UTC(2026, 8, 11)));
    });
  });

  describe('mergeCanonicalBillIntoInvoice', () => {
    it('should reuse the invoice already linked by openFinanceBillId', async () => {
      const linkedId = randomUUID();
      const { db, invoices, invoiceCreate } = createProjectDb({
        cards: [card],
        invoices: [
          makeInvoice({
            id: linkedId,
            status: 'CLOSED',
            amount: 1,
            openFinanceBillId: billId
          })
        ]
      });

      const mergedId = await mergeCanonicalBillIntoInvoice(asProjectDb(db), openFinanceAccountId, bill);

      expect(mergedId).toBe(linkedId);
      expect(invoiceCreate).not.toHaveBeenCalled();
      expect(invoices).toHaveLength(1);
      expect(invoices[0]?.amount).toBe(15000);
      expect(invoices[0]?.dueOn).toEqual(new Date(Date.UTC(2026, 5, 18)));
    });

    it('should merge via purchases with the canonical bill id before creating', async () => {
      const purchaseInvoiceId = randomUUID();
      const ofTxId = randomUUID();
      const { db, invoices, invoiceCreate } = createProjectDb({
        cards: [card],
        invoices: [
          makeInvoice({
            id: purchaseInvoiceId,
            dueOn: new Date(Date.UTC(2026, 4, 20)),
            amount: 8000
          })
        ],
        ofTransactions: [{ id: ofTxId, billId }],
        purchases: [
          {
            id: randomUUID(),
            cardId,
            invoiceId: purchaseInvoiceId,
            openFinanceTransactionId: ofTxId,
            cashFlowRole: CashFlowRole.NORMAL,
            type: TransactionType.EXPENSE,
            amount: 8000,
            hiddenAt: null
          }
        ]
      });

      const mergedId = await mergeCanonicalBillIntoInvoice(asProjectDb(db), openFinanceAccountId, bill);

      expect(mergedId).toBe(purchaseInvoiceId);
      expect(invoiceCreate).not.toHaveBeenCalled();
      expect(invoices[0]?.openFinanceBillId).toBe(billId);
      expect(invoices[0]?.amount).toBe(15000);
      expect(invoices[0]?.status).toBe(InvoiceStatus.CLOSED);
    });

    it('should attach the unbilled invoice whose cycle contains the bill closing date', async () => {
      const unbilledId = randomUUID();
      const { db, invoices, invoiceCreate } = createProjectDb({
        cards: [card],
        invoices: [
          makeInvoice({
            id: unbilledId,
            amount: 0
          })
        ]
      });

      const mergedId = await mergeCanonicalBillIntoInvoice(asProjectDb(db), openFinanceAccountId, bill);

      expect(mergedId).toBe(unbilledId);
      expect(invoiceCreate).not.toHaveBeenCalled();
      expect(invoices[0]?.openFinanceBillId).toBe(billId);
      expect(invoices[0]?.amount).toBe(15000);
    });

    it('should create a billed invoice instead of matching another cycle by dueOn', async () => {
      const otherDueOnId = randomUUID();
      const { db, invoices, invoiceCreate } = createProjectDb({
        cards: [card],
        invoices: [
          makeInvoice({
            id: otherDueOnId,
            startsOn: new Date(Date.UTC(2026, 2, 10)),
            endsOn: new Date(Date.UTC(2026, 3, 9)),
            status: 'CLOSED',
            amount: 999
          })
        ]
      });

      const mergedId = await mergeCanonicalBillIntoInvoice(asProjectDb(db), openFinanceAccountId, bill);

      expect(mergedId).not.toBe(otherDueOnId);
      expect(invoiceCreate).toHaveBeenCalledTimes(1);
      expect(invoices).toHaveLength(2);
      const created = invoices.find((row) => row.id === mergedId);
      expect(created?.amount).toBe(15000);
      expect(created?.openFinanceBillId).toBe(billId);
      expect(invoices.find((row) => row.id === otherDueOnId)?.amount).toBe(999);
    });

    it('should not attach a bill to the next cycle unbilled invoice', async () => {
      const currentId = randomUUID();
      const nextId = randomUUID();
      const nubankBill: BillRow = {
        id: billId,
        dueOn: new Date(Date.UTC(2026, 7, 11)),
        closingOn: new Date(Date.UTC(2026, 7, 4)),
        totalAmount: 890.1,
        currencyCode: 'BRL',
        minimumPaymentAmount: null,
        allowsInstallments: null
      };
      const { db, invoices, invoiceCreate } = createProjectDb({
        cards: [nubankCard],
        invoices: [
          makeInvoice({
            id: currentId,
            startsOn: new Date(Date.UTC(2026, 6, 4)),
            endsOn: new Date(Date.UTC(2026, 7, 4)),
            dueOn: new Date(Date.UTC(2026, 7, 11)),
            amount: 150463
          }),
          makeInvoice({
            id: nextId,
            startsOn: new Date(Date.UTC(2026, 7, 4)),
            endsOn: new Date(Date.UTC(2026, 8, 4)),
            dueOn: new Date(Date.UTC(2026, 8, 11)),
            amount: 11133
          })
        ]
      });

      const mergedId = await mergeCanonicalBillIntoInvoice(asProjectDb(db), openFinanceAccountId, nubankBill);

      expect(mergedId).toBe(currentId);
      expect(invoiceCreate).not.toHaveBeenCalled();
      expect(invoices.find((row) => row.id === currentId)?.openFinanceBillId).toBe(billId);
      expect(invoices.find((row) => row.id === nextId)?.openFinanceBillId).toBeNull();
      expect(invoices.find((row) => row.id === nextId)?.amount).toBe(11133);
    });

    it('should keep PAID after the same bill is merged again', async () => {
      const invoiceId = randomUUID();
      const { db, invoices } = createProjectDb({
        cards: [nubankCard],
        invoices: [
          makeInvoice({
            id: invoiceId,
            startsOn: new Date(Date.UTC(2026, 6, 4)),
            endsOn: new Date(Date.UTC(2026, 7, 4)),
            dueOn: new Date(Date.UTC(2026, 7, 11)),
            status: 'PAID',
            amount: 172754,
            paidAmount: 172754,
            paidAt: new Date(Date.UTC(2026, 7, 12)),
            openFinanceBillId: billId
          })
        ],
        invoicePayments: [
          {
            id: randomUUID(),
            invoiceId,
            amount: 172754,
            paymentDate: new Date(Date.UTC(2026, 7, 12)),
            transactionId: null,
            openFinanceBillPaymentId: randomUUID(),
            source: 'PLUGGY',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      });

      const nubankBill: BillRow = {
        id: billId,
        dueOn: new Date(Date.UTC(2026, 7, 11)),
        closingOn: new Date(Date.UTC(2026, 7, 4)),
        totalAmount: 1727.54,
        currencyCode: 'BRL',
        minimumPaymentAmount: null,
        allowsInstallments: null
      };

      await mergeCanonicalBillIntoInvoice(asProjectDb(db), openFinanceAccountId, nubankBill);

      expect(invoices[0]?.status).toBe(InvoiceStatus.PAID);
      expect(invoices[0]?.paidAmount).toBe(172754);
    });
  });

  describe('resolveInvoiceIdForCardMovement', () => {
    it('should return null for CARD_PAYMENT movements', async () => {
      const { db, invoiceCreate } = createProjectDb({ cards: [card] });

      const invoiceId = await resolveInvoiceIdForCardMovement(asProjectDb(db), {
        openFinanceAccountId,
        openFinanceBillId: billId,
        cashFlowRole: CashFlowRole.CARD_PAYMENT,
        transactionDate: cycleDate,
        billForecastMonth: null
      });

      expect(invoiceId).toBeNull();
      expect(invoiceCreate).not.toHaveBeenCalled();
    });

    it('should assign purchases to the billed invoice via canonical bill id', async () => {
      const { db } = createProjectDb({ cards: [card], bills: [bill] });

      const invoiceId = await resolveInvoiceIdForCardMovement(asProjectDb(db), {
        openFinanceAccountId,
        openFinanceBillId: billId,
        cashFlowRole: CashFlowRole.NORMAL,
        transactionDate: cycleDate,
        billForecastMonth: null
      });

      expect(invoiceId).toEqual(expect.any(String));
    });

    it('should create per-cycle unbilled invoices for current purchases and future installments', async () => {
      const { db, invoices, invoiceCreate, purchases } = createProjectDb({ cards: [nubankCard] });

      const currentId = await resolveInvoiceIdForCardMovement(asProjectDb(db), {
        openFinanceAccountId,
        openFinanceBillId: null,
        cashFlowRole: CashFlowRole.NORMAL,
        transactionDate: new Date(Date.UTC(2026, 7, 19)),
        billForecastMonth: null
      });
      const futureId = await resolveInvoiceIdForCardMovement(asProjectDb(db), {
        openFinanceAccountId,
        openFinanceBillId: null,
        cashFlowRole: CashFlowRole.NORMAL,
        transactionDate: new Date(Date.UTC(2026, 8, 19)),
        billForecastMonth: '2026-10'
      });

      expect(currentId).toEqual(expect.any(String));
      expect(futureId).toEqual(expect.any(String));
      expect(futureId).not.toBe(currentId);
      expect(invoiceCreate).toHaveBeenCalledTimes(2);

      const current = invoices.find((row) => row.id === currentId);
      const future = invoices.find((row) => row.id === futureId);
      expect(current?.dueOn).toEqual(new Date(Date.UTC(2026, 8, 11)));
      expect(future?.dueOn).toEqual(new Date(Date.UTC(2026, 9, 11)));

      purchases.push(
        {
          id: randomUUID(),
          cardId,
          invoiceId: currentId,
          openFinanceTransactionId: randomUUID(),
          cashFlowRole: CashFlowRole.NORMAL,
          type: TransactionType.EXPENSE,
          amount: 150463,
          hiddenAt: null
        },
        {
          id: randomUUID(),
          cardId,
          invoiceId: futureId,
          openFinanceTransactionId: randomUUID(),
          cashFlowRole: CashFlowRole.NORMAL,
          type: TransactionType.EXPENSE,
          amount: 11133,
          hiddenAt: null
        }
      );
      await recalcUnbilledOpenInvoiceAmount(asProjectDb(db), currentId ?? '');
      await recalcUnbilledOpenInvoiceAmount(asProjectDb(db), futureId ?? '');

      expect(invoices.find((row) => row.id === currentId)?.amount).toBe(150463);
      expect(invoices.find((row) => row.id === futureId)?.amount).toBe(11133);
    });
  });

  describe('payment ledger', () => {
    it('should upsert bill payments by openFinanceBillPaymentId and not insert a second CARD_PAYMENT row', async () => {
      const invoiceId = randomUUID();
      const billPaymentId = randomUUID();
      const cardPaymentTxId = randomUUID();
      const { db, invoicePayments, invoicePaymentCreate } = createProjectDb({
        cards: [card],
        invoices: [
          makeInvoice({
            id: invoiceId,
            status: 'CLOSED',
            amount: 15000,
            openFinanceBillId: billId,
            currencyCode: 'BRL',
            minimumPaymentAmount: 5000,
            allowsInstallments: true
          })
        ],
        bills: [bill],
        billPayments: [
          {
            id: billPaymentId,
            billId,
            amount: 150,
            paymentDate: new Date(Date.UTC(2026, 5, 20, 15, 0, 0)),
            unavailableAt: null
          }
        ]
      });

      await upsertInvoicePaymentsFromBill(asProjectDb(db), invoiceId, billId);
      expect(invoicePayments).toHaveLength(1);
      expect(invoicePayments[0]?.openFinanceBillPaymentId).toBe(billPaymentId);
      expect(invoicePayments[0]?.amount).toBe(15000);
      expect(invoicePayments[0]?.transactionId).toBeNull();

      await upsertInvoicePaymentsFromBill(asProjectDb(db), invoiceId, billId);
      expect(invoicePayments).toHaveLength(1);

      await maybeRecordCardPaymentLedger(asProjectDb(db), {
        cardId,
        cashFlowRole: CashFlowRole.CARD_PAYMENT,
        amountCents: 15000,
        paymentDate: new Date(Date.UTC(2026, 5, 20, 18, 30, 0)),
        transactionId: cardPaymentTxId,
        openFinanceBillId: billId
      });

      expect(invoicePaymentCreate).toHaveBeenCalledTimes(1);
      expect(invoicePayments).toHaveLength(1);
      expect(invoicePayments[0]?.transactionId).toBe(cardPaymentTxId);
    });

    it('should not add a Nubank-style prior CARD_PAYMENT to the next invoice', async () => {
      const julId = randomUUID();
      const augId = randomUUID();
      const julBillId = randomUUID();
      const augBillId = billId;
      const julLedgerId = randomUUID();
      const { db, invoicePayments, invoices } = createProjectDb({
        cards: [nubankCard],
        invoices: [
          makeInvoice({
            id: julId,
            startsOn: new Date(Date.UTC(2026, 5, 4)),
            endsOn: new Date(Date.UTC(2026, 6, 4)),
            dueOn: new Date(Date.UTC(2026, 6, 11)),
            status: 'PAID',
            amount: 127968,
            paidAmount: 127968,
            openFinanceBillId: julBillId
          }),
          makeInvoice({
            id: augId,
            startsOn: new Date(Date.UTC(2026, 6, 4)),
            endsOn: new Date(Date.UTC(2026, 7, 4)),
            dueOn: new Date(Date.UTC(2026, 7, 11)),
            status: 'CLOSED',
            amount: 172754,
            openFinanceBillId: augBillId
          })
        ],
        invoicePayments: [
          {
            id: julLedgerId,
            invoiceId: julId,
            amount: 127968,
            paymentDate: new Date(Date.UTC(2026, 6, 15)),
            transactionId: null,
            openFinanceBillPaymentId: randomUUID(),
            source: 'PLUGGY',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        bills: [
          {
            id: augBillId,
            dueOn: new Date(Date.UTC(2026, 7, 11)),
            closingOn: new Date(Date.UTC(2026, 7, 4)),
            totalAmount: 1727.54,
            currencyCode: 'BRL',
            minimumPaymentAmount: null,
            allowsInstallments: null
          }
        ],
        billPayments: [
          {
            id: randomUUID(),
            billId: augBillId,
            amount: 1727.54,
            paymentDate: new Date(Date.UTC(2026, 7, 12)),
            unavailableAt: null
          }
        ]
      });

      await upsertInvoicePaymentsFromBill(asProjectDb(db), augId, augBillId);
      await maybeRecordCardPaymentLedger(asProjectDb(db), {
        cardId,
        cashFlowRole: CashFlowRole.CARD_PAYMENT,
        amountCents: 127968,
        paymentDate: new Date(Date.UTC(2026, 7, 10)),
        transactionId: randomUUID(),
        openFinanceBillId: augBillId
      });

      expect(invoices.find((row) => row.id === augId)?.paidAmount).toBe(172754);
      expect(invoices.find((row) => row.id === julId)?.paidAmount).toBe(127968);
      expect(invoicePayments.filter((row) => row.invoiceId === augId && row.amount === 127968)).toHaveLength(0);
      expect(invoicePayments.filter((row) => row.invoiceId === julId && row.amount === 127968)).toHaveLength(1);
    });

    it('should allocate Bradesco-style bill payments to the invoices they settle', async () => {
      const priorId = randomUUID();
      const currentId = randomUUID();
      const { db, invoicePayments, invoices } = createProjectDb({
        cards: [
          {
            ...card,
            closingDay: 31,
            closingOnLastDay: true,
            dueDay: 12
          }
        ],
        invoices: [
          makeInvoice({
            id: priorId,
            startsOn: new Date(Date.UTC(2026, 4, 31)),
            endsOn: new Date(Date.UTC(2026, 5, 30)),
            dueOn: new Date(Date.UTC(2026, 6, 12)),
            status: 'CLOSED',
            amount: 10000
          }),
          makeInvoice({
            id: currentId,
            startsOn: new Date(Date.UTC(2026, 5, 30)),
            endsOn: new Date(Date.UTC(2026, 6, 31)),
            dueOn: new Date(Date.UTC(2026, 7, 12)),
            status: 'CLOSED',
            amount: 20000,
            openFinanceBillId: billId
          })
        ],
        bills: [
          {
            id: billId,
            dueOn: new Date(Date.UTC(2026, 7, 12)),
            closingOn: new Date(Date.UTC(2026, 6, 31)),
            totalAmount: 200,
            currencyCode: 'BRL',
            minimumPaymentAmount: null,
            allowsInstallments: null
          }
        ],
        billPayments: [
          {
            id: randomUUID(),
            billId,
            amount: 100,
            paymentDate: new Date(Date.UTC(2026, 7, 5)),
            unavailableAt: null
          },
          {
            id: randomUUID(),
            billId,
            amount: 200,
            paymentDate: new Date(Date.UTC(2026, 7, 15)),
            unavailableAt: null
          }
        ]
      });

      await upsertInvoicePaymentsFromBill(asProjectDb(db), currentId, billId);

      expect(invoicePayments.find((row) => row.amount === 10000)?.invoiceId).toBe(priorId);
      expect(invoicePayments.find((row) => row.amount === 20000)?.invoiceId).toBe(currentId);
      expect(invoices.find((row) => row.id === priorId)?.paidAmount).toBe(10000);
      expect(invoices.find((row) => row.id === currentId)?.paidAmount).toBe(20000);
    });
  });
});
