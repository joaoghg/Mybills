import { Test, TestingModule } from '@nestjs/testing';
import {
  CreateTransactionInput,
  ListTransactionsOutput,
  ListTransactionsQueryInput,
  MonthlySummaryOutput,
  TransactionOutput,
  UpdateTransactionInput,
  UpdateTransactionIsPaidInput
} from '@mybills/dtos';
import { TransactionType } from 'src/generated/prisma/client';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: jest.Mocked<TransactionsService>;

  const baseTransaction: TransactionOutput = {
    id: 'ef6f59a2-02db-4f07-929f-e685e4f7a01f',
    userId: '6d35154f-0d4f-4efb-95a1-6997e2759c60',
    accountId: '4f2f72e9-517c-4f6e-83f6-c9a9df15ddef',
    categoryId: '2df2cc34-219b-4df3-8107-1ab2d1f0ec88',
    cardId: null,
    transferGroupId: null,
    seriesId: null,
    occurrenceNumber: null,
    seriesType: null,
    seriesTotalOccurrences: null,
    description: 'Market purchase',
    type: TransactionType.EXPENSE,
    amount: 2590,
    date: '2026-04-04T00:00:00.000Z',
    isPaid: false,
    isProjected: false,
    invoicePaymentMonth: null,
    createdAt: '2026-04-04T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: {
            findAll: jest.fn(),
            getMonthlySummary: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateIsPaid: jest.fn(),
            remove: jest.fn()
          }
        }
      ]
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get(TransactionsService) as jest.Mocked<TransactionsService>;
  });

  describe('findAll', () => {
    it('should call transactionsService.findAll with current user id and return transactions', async () => {
      const output: ListTransactionsOutput = [baseTransaction];
      service.findAll.mockResolvedValue(output);

      const result = await controller.findAll(baseTransaction.userId, {});

      expect(result).toEqual(output);
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith(baseTransaction.userId, {});
    });

    it('should forward query filters to transactionsService.findAll', async () => {
      const query: ListTransactionsQueryInput = {
        year: 2026,
        month: 4,
        search: 'market',
        type: 'EXPENSE',
        includeTransfer: false
      };
      const output: ListTransactionsOutput = [baseTransaction];
      service.findAll.mockResolvedValue(output);

      const result = await controller.findAll(baseTransaction.userId, query);

      expect(result).toEqual(output);
      expect(service.findAll).toHaveBeenCalledWith(baseTransaction.userId, query);
    });

    it('should forward from/to, cardId, accountId, isPaid and limit filters', async () => {
      const query: ListTransactionsQueryInput = {
        from: '2026-05-04',
        to: '2026-06-03',
        cardId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        accountId: baseTransaction.accountId as string,
        isPaid: false,
        limit: 3
      };
      const output: ListTransactionsOutput = [baseTransaction];
      service.findAll.mockResolvedValue(output);

      const result = await controller.findAll(baseTransaction.userId, query);

      expect(result).toEqual(output);
      expect(service.findAll).toHaveBeenCalledWith(baseTransaction.userId, query);
    });
  });

  describe('getMonthlySummary', () => {
    it('should call transactionsService.getMonthlySummary with user id and query', async () => {
      const output: MonthlySummaryOutput = {
        month: '2026-08',
        incomeTotal: 0,
        expenseTotal: 2590,
        netTotal: -2590,
        income: [],
        expenses: [baseTransaction],
        cardInvoices: []
      };

      service.getMonthlySummary.mockResolvedValue(output);

      const result = await controller.getMonthlySummary(baseTransaction.userId, {
        month: 8,
        year: 2026
      });

      expect(result).toEqual(output);
      expect(service.getMonthlySummary).toHaveBeenCalledWith(baseTransaction.userId, {
        month: 8,
        year: 2026
      });
    });
  });

  describe('findOne', () => {
    it('should call transactionsService.findById with transaction id and user id', async () => {
      service.findById.mockResolvedValue(baseTransaction);

      const result = await controller.findOne(baseTransaction.userId, { id: baseTransaction.id });

      expect(result).toEqual(baseTransaction);
      expect(service.findById).toHaveBeenCalledTimes(1);
      expect(service.findById).toHaveBeenCalledWith(baseTransaction.id, baseTransaction.userId);
    });
  });

  describe('create', () => {
    it('should call transactionsService.create with payload and user id', async () => {
      const input: CreateTransactionInput = {
        accountId: baseTransaction.accountId,
        categoryId: baseTransaction.categoryId,
        cardId: null,
        description: baseTransaction.description,
        type: TransactionType.EXPENSE,
        amount: 2590,
        date: '2026-04-04',
        isPaid: false,
        schedule: { mode: 'NONE' }
      };

      service.create.mockResolvedValue(baseTransaction);

      const result = await controller.create(baseTransaction.userId, input);

      expect(result).toEqual(baseTransaction);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith({
        userId: baseTransaction.userId,
        accountId: input.accountId,
        categoryId: input.categoryId,
        cardId: input.cardId,
        description: input.description,
        type: input.type,
        amount: input.amount,
        date: input.date,
        isPaid: input.isPaid,
        schedule: input.schedule
      });
    });
  });

  describe('update', () => {
    it('should call transactionsService.update with transaction id, user id and payload', async () => {
      const input: UpdateTransactionInput = {
        amount: 3000,
        description: 'Updated description',
        scope: 'SINGLE'
      };
      const output: TransactionOutput = {
        ...baseTransaction,
        amount: 3000,
        description: 'Updated description'
      };

      service.update.mockResolvedValue(output);

      const result = await controller.update(
        baseTransaction.userId,
        { id: baseTransaction.id },
        input
      );

      expect(result).toEqual(output);
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith(baseTransaction.id, baseTransaction.userId, {
        accountId: input.accountId,
        categoryId: input.categoryId,
        cardId: input.cardId,
        description: input.description,
        type: input.type,
        amount: input.amount,
        date: input.date,
        scope: input.scope,
        schedule: input.schedule
      });
    });
  });

  describe('updateIsPaid', () => {
    it('should call transactionsService.updateIsPaid with transaction id, user id and paid status', async () => {
      const input: UpdateTransactionIsPaidInput = {
        isPaid: true
      };
      const output: TransactionOutput = {
        ...baseTransaction,
        isPaid: true
      };

      service.updateIsPaid.mockResolvedValue(output);

      const result = await controller.updateIsPaid(
        baseTransaction.userId,
        { id: baseTransaction.id },
        input
      );

      expect(result).toEqual(output);
      expect(service.updateIsPaid).toHaveBeenCalledTimes(1);
      expect(service.updateIsPaid).toHaveBeenCalledWith(
        baseTransaction.id,
        baseTransaction.userId,
        input.isPaid
      );
    });
  });

  describe('remove', () => {
    it('should call transactionsService.remove with transaction id and user id', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(baseTransaction.userId, { id: baseTransaction.id }, { scope: 'SINGLE' });

      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(
        baseTransaction.id,
        baseTransaction.userId,
        'SINGLE'
      );
    });
  });
});
