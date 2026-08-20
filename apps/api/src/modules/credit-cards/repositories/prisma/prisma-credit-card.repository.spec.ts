import type {
  CreditCard as PrismaCreditCard,
  Invoice as PrismaInvoice,
  InvoicePayment as PrismaInvoicePayment
} from 'src/generated/prisma/client';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import { PrismaCreditCardRepository } from './prisma-credit-card.repository';

type InvoiceWithPayments = PrismaInvoice & { payments: PrismaInvoicePayment[] };

describe('PrismaCreditCardRepository', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const userId = '2cea6915-f57e-4ba4-84ec-08f47e4eb7f9';
  const cardId = '5ea4f605-31d5-4dcf-93bc-45fafad6f319';
  const accountId = '0f8a7e38-284d-4a8b-bf59-fb2f2c5d4b10';
  const invoiceId = '7aa4f605-31d5-4dcf-93bc-45fafad6f320';
  const paymentId = '9aa4f605-31d5-4dcf-93bc-45fafad6f322';
  const paymentTxId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  const pluggyCard: PrismaCreditCard = {
    id: cardId,
    userId,
    accountId,
    name: 'Imported Platinum',
    limit: 500000,
    closingDay: 10,
    closingOnLastDay: false,
    dueDay: 18,
    source: 'PLUGGY',
    openFinanceAccountId: '3ea4f605-31d5-4dcf-93bc-45fafad6f318',
    overriddenFields: [],
    hiddenAt: null,
    createdAt: now,
    updatedAt: now
  };

  const paymentRow: PrismaInvoicePayment = {
    id: paymentId,
    invoiceId,
    amount: 15000,
    paymentDate: new Date(Date.UTC(2026, 5, 20)),
    transactionId: paymentTxId,
    openFinanceBillPaymentId: '4ea4f605-31d5-4dcf-93bc-45fafad6f317',
    source: 'PLUGGY',
    createdAt: now,
    updatedAt: now
  };

  const openInvoice: InvoiceWithPayments = {
    id: invoiceId,
    userId,
    creditCardId: cardId,
    startsOn: new Date(Date.UTC(2026, 4, 10)),
    endsOn: new Date(Date.UTC(2026, 5, 9)),
    dueOn: new Date(Date.UTC(2026, 5, 18)),
    status: 'OPEN',
    amount: 15000,
    paidAt: null,
    paidAmount: null,
    paymentTransactionId: null,
    paidFromAccountId: null,
    source: 'PLUGGY',
    openFinanceBillId: '6ea4f605-31d5-4dcf-93bc-45fafad6f316',
    currencyCode: 'BRL',
    minimumPaymentAmount: 5000,
    allowsInstallments: true,
    createdAt: now,
    updatedAt: now,
    payments: [paymentRow]
  };

  const openFinanceBill = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn()
  };

  const prisma = {
    creditCard: {
      findMany: jest.fn(),
      findFirst: jest.fn()
    },
    transaction: {
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn()
    },
    invoice: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    invoicePayment: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    account: {
      update: jest.fn()
    },
    openFinanceBill,
    $transaction: jest.fn()
  };

  let repository: PrismaCreditCardRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PrismaCreditCardRepository(prisma as unknown as PrismaService);
  });

  describe('imported GET', () => {
    it('should list persisted invoices without calling openFinanceBill delegates', async () => {
      prisma.invoice.findMany.mockResolvedValue([openInvoice]);

      const result = await repository.findInvoicesByCreditCardId(cardId, userId);

      expect(result).toHaveLength(1);
      expect(result[0]?.payments).toEqual([
        {
          id: paymentId,
          amount: 15000,
          paymentDate: '2026-06-20',
          transactionId: paymentTxId
        }
      ]);
      expect(result[0]?.providerBillId).toBe(openInvoice.openFinanceBillId);
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { creditCardId: cardId, userId }
        })
      );
      expect(openFinanceBill.findMany).not.toHaveBeenCalled();
      expect(openFinanceBill.findFirst).not.toHaveBeenCalled();
      expect(openFinanceBill.findUnique).not.toHaveBeenCalled();
    });

    it('should load a PLUGGY card by id from persisted OPEN invoices only', async () => {
      prisma.creditCard.findFirst.mockResolvedValue(pluggyCard);
      prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      prisma.invoice.findFirst.mockResolvedValue(openInvoice);

      const result = await repository.findByIdAndUserId(cardId, userId);

      expect(result?.source).toBe('PLUGGY');
      expect(result?.openInvoice?.id).toBe(invoiceId);
      expect(prisma.invoice.create).not.toHaveBeenCalled();
      expect(openFinanceBill.findMany).not.toHaveBeenCalled();
      expect(openFinanceBill.findFirst).not.toHaveBeenCalled();
      expect(openFinanceBill.findUnique).not.toHaveBeenCalled();
    });

    it('should list PLUGGY cards without calling openFinanceBill delegates', async () => {
      prisma.creditCard.findMany.mockResolvedValue([pluggyCard]);
      prisma.transaction.groupBy.mockResolvedValue([]);
      prisma.invoice.findFirst.mockResolvedValue(openInvoice);

      const result = await repository.findAllByUserId(userId);

      expect(result).toHaveLength(1);
      expect(result[0]?.source).toBe('PLUGGY');
      expect(prisma.invoice.create).not.toHaveBeenCalled();
      expect(openFinanceBill.findMany).not.toHaveBeenCalled();
      expect(openFinanceBill.findFirst).not.toHaveBeenCalled();
      expect(openFinanceBill.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('payInvoice', () => {
    it('should write invoice_payments with amount, date and transactionId', async () => {
      const { payments: _payments, ...invoiceWithoutPayments } = openInvoice;
      const closedInvoice: PrismaInvoice = {
        ...invoiceWithoutPayments,
        status: 'CLOSED',
        source: 'MANUAL'
      };

      const createdLedgerRow: PrismaInvoicePayment = {
        ...paymentRow,
        source: 'MANUAL',
        openFinanceBillPaymentId: null,
        paymentDate: new Date(Date.UTC(2026, 5, 15))
      };

      prisma.$transaction.mockImplementation(
        async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)
      );
      prisma.invoice.findFirst.mockResolvedValue(closedInvoice);
      prisma.transaction.findMany.mockResolvedValue([
        { id: '11111111-1111-4111-8111-111111111111', amount: 10000 },
        { id: '22222222-2222-4222-8222-222222222222', amount: 5000 }
      ]);
      prisma.transaction.create.mockResolvedValue({ id: paymentTxId });
      prisma.transaction.updateMany.mockResolvedValue({ count: 2 });
      prisma.account.update.mockResolvedValue({});
      prisma.invoicePayment.create.mockResolvedValue(createdLedgerRow);
      prisma.invoicePayment.findMany.mockResolvedValue([createdLedgerRow]);
      prisma.invoice.update.mockResolvedValue(closedInvoice);

      const result = await repository.payInvoice({
        userId,
        creditCardId: cardId,
        accountId,
        invoiceId,
        paymentDate: '2026-06-15',
        description: 'Invoice payment'
      });

      expect(result).toEqual({
        amount: 15000,
        accountId,
        paymentTransactionId: paymentTxId,
        paidCount: 2,
        invoiceId,
        cycleStart: '2026-05-10',
        cycleEnd: '2026-06-09'
      });
      expect(prisma.invoicePayment.create).toHaveBeenCalledWith({
        data: {
          invoiceId,
          amount: 15000,
          paymentDate: new Date(Date.UTC(2026, 5, 15)),
          transactionId: paymentTxId,
          source: 'MANUAL'
        }
      });
    });
  });
});
