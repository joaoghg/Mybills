import { randomUUID } from 'node:crypto';
import { CashFlowRole, InvoiceStatus } from 'src/generated/prisma/enums';
import {
  ensureUnbilledOpenInvoice,
  maybeRecordCardPaymentLedger,
  mergeCanonicalBillIntoInvoice,
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
};

function sameUtcDay(left: Date, right: Date): boolean {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
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
      findFirst: jest.fn(
        async ({
          where
        }: {
          where: {
            creditCardId: string;
            status: 'OPEN' | 'CLOSED' | 'PAID';
            openFinanceBillId: string | null;
          };
        }) => {
          return (
            invoices.find(
              (row) =>
                row.creditCardId === where.creditCardId &&
                row.status === where.status &&
                row.openFinanceBillId === where.openFinanceBillId
            ) ?? null
          );
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
          select?: { id: true };
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
      )
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
      findFirst: jest.fn(
        async ({
          where
        }: {
          where: { invoiceId: string; amount: number; paymentDate: Date };
        }) => {
          return (
            invoicePayments.find(
              (row) =>
                row.invoiceId === where.invoiceId &&
                row.amount === where.amount &&
                sameUtcDay(row.paymentDate, where.paymentDate)
            ) ?? null
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
      )
    }
  };

  return {
    db,
    invoices,
    invoicePayments,
    invoiceCreate,
    invoicePaymentCreate
  };
}

function asProjectDb(db: ReturnType<typeof createProjectDb>['db']) {
  return db as unknown as Parameters<typeof ensureUnbilledOpenInvoice>[0];
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
    openFinanceAccountId
  };
  const accountDates = {
    closingDate: new Date(Date.UTC(2026, 5, 9)),
    dueDate: new Date(Date.UTC(2026, 5, 18))
  };
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

  describe('ensureUnbilledOpenInvoice', () => {
    it('should upsert one unbilled OPEN invoice per card and not create a second on resync', async () => {
      const { db, invoices, invoiceCreate } = createProjectDb({ cards: [card] });

      const firstId = await ensureUnbilledOpenInvoice(asProjectDb(db), openFinanceAccountId, accountDates);
      const secondId = await ensureUnbilledOpenInvoice(asProjectDb(db), openFinanceAccountId, accountDates);

      expect(firstId).toEqual(expect.any(String));
      expect(secondId).toBe(firstId);
      expect(invoiceCreate).toHaveBeenCalledTimes(1);
      expect(invoices.filter((row) => row.status === InvoiceStatus.OPEN && row.openFinanceBillId === null)).toHaveLength(
        1
      );
    });
  });

  describe('mergeCanonicalBillIntoInvoice', () => {
    it('should reuse the invoice already linked by openFinanceBillId', async () => {
      const linkedId = randomUUID();
      const { db, invoices, invoiceCreate } = createProjectDb({
        cards: [card],
        invoices: [
          {
            id: linkedId,
            userId,
            creditCardId: cardId,
            startsOn: new Date(Date.UTC(2026, 4, 10)),
            endsOn: new Date(Date.UTC(2026, 5, 9)),
            dueOn: new Date(Date.UTC(2026, 4, 1)),
            status: 'CLOSED',
            amount: 1,
            paidAt: null,
            paidAmount: null,
            paymentTransactionId: null,
            paidFromAccountId: null,
            source: 'PLUGGY',
            openFinanceBillId: billId,
            currencyCode: null,
            minimumPaymentAmount: null,
            allowsInstallments: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
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
          {
            id: purchaseInvoiceId,
            userId,
            creditCardId: cardId,
            startsOn: new Date(Date.UTC(2026, 4, 10)),
            endsOn: new Date(Date.UTC(2026, 5, 9)),
            dueOn: new Date(Date.UTC(2026, 4, 20)),
            status: 'OPEN',
            amount: 8000,
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
            updatedAt: new Date()
          }
        ],
        ofTransactions: [{ id: ofTxId, billId }],
        purchases: [
          {
            id: randomUUID(),
            cardId,
            invoiceId: purchaseInvoiceId,
            openFinanceTransactionId: ofTxId,
            cashFlowRole: CashFlowRole.NORMAL
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

    it('should attach the unbilled OPEN invoice when no bill id or purchase match exists', async () => {
      const unbilledId = randomUUID();
      const { db, invoices, invoiceCreate } = createProjectDb({
        cards: [card],
        invoices: [
          {
            id: unbilledId,
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
            updatedAt: new Date()
          }
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
          {
            id: otherDueOnId,
            userId,
            creditCardId: cardId,
            startsOn: new Date(Date.UTC(2026, 2, 10)),
            endsOn: new Date(Date.UTC(2026, 3, 9)),
            dueOn: new Date(Date.UTC(2026, 5, 18)),
            status: 'CLOSED',
            amount: 999,
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
            updatedAt: new Date()
          }
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
  });

  describe('resolveInvoiceIdForCardMovement', () => {
    it('should return null for CARD_PAYMENT movements', async () => {
      const { db, invoiceCreate } = createProjectDb({ cards: [card] });

      const invoiceId = await resolveInvoiceIdForCardMovement(asProjectDb(db), {
        openFinanceAccountId,
        openFinanceBillId: billId,
        cashFlowRole: CashFlowRole.CARD_PAYMENT,
        accountDates
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
        accountDates
      });

      expect(invoiceId).toEqual(expect.any(String));
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
          {
            id: invoiceId,
            userId,
            creditCardId: cardId,
            startsOn: new Date(Date.UTC(2026, 4, 10)),
            endsOn: new Date(Date.UTC(2026, 5, 9)),
            dueOn: new Date(Date.UTC(2026, 5, 18)),
            status: 'CLOSED',
            amount: 15000,
            paidAt: null,
            paidAmount: null,
            paymentTransactionId: null,
            paidFromAccountId: null,
            source: 'PLUGGY',
            openFinanceBillId: billId,
            currencyCode: 'BRL',
            minimumPaymentAmount: 5000,
            allowsInstallments: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
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
  });
});
