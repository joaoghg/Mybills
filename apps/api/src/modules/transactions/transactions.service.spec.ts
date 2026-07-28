import { Test, TestingModule } from '@nestjs/testing';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { TransactionType } from 'src/generated/prisma/client';
import { Account } from '../accounts/entities/account.entity';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { CreditCardsService } from '../credit-cards/credit-cards.service';
import { Transaction } from './entities/transaction.entity';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionSeriesMaintenanceService } from './transaction-series-maintenance.service';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repository: jest.Mocked<TransactionRepository>;
  let accountsService: jest.Mocked<AccountsService>;
  let categoriesService: jest.Mocked<CategoriesService>;
  let creditCardsService: jest.Mocked<CreditCardsService>;

  const baseTransaction: Transaction = {
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

  const account: Account = {
    id: '4f2f72e9-517c-4f6e-83f6-c9a9df15ddef',
    userId: '6d35154f-0d4f-4efb-95a1-6997e2759c60',
    name: 'Main account',
    balance: 10000,
    createdAt: '2026-04-04T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z'
  };

  const expenseCategory = {
    id: baseTransaction.categoryId as string,
    userId: baseTransaction.userId,
    name: 'Food',
    icon: 'restaurant-outline' as const,
    types: ['EXPENSE'] as const,
    createdAt: baseTransaction.createdAt,
    updatedAt: baseTransaction.updatedAt
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: 'TransactionRepository',
          useValue: {
            findAllByUserId: jest.fn(),
            findByIdAndUserId: jest.fn(),
            create: jest.fn(),
            createTransferPair: jest.fn(),
            update: jest.fn(),
            updateIsPaid: jest.fn(),
            delete: jest.fn(),
            findByTransferGroupIdAndUserId: jest.fn(),
            updateTransferPair: jest.fn(),
            deleteTransferPair: jest.fn(),
            createSeriesWithOccurrences: jest.fn(),
            promoteToSeries: jest.fn(),
            convertSeriesToRecurring: jest.fn(),
            convertSeriesToInstallment: jest.fn(),
            updateManyFromOccurrence: jest.fn(),
            findBySeriesFromOccurrence: jest.fn(),
            deleteFromOccurrence: jest.fn(),
            findSeriesById: jest.fn(),
            findActiveRecurringSeries: jest.fn(),
            appendSeriesOccurrences: jest.fn(),
            activateDueProjected: jest.fn()
          }
        },
        {
          provide: TransactionSeriesMaintenanceService,
          useValue: {
            buildInitialRecurringOccurrences: jest.fn(),
            runMaintenance: jest.fn(),
            extendActiveRecurringSeries: jest.fn()
          }
        },
        {
          provide: AccountsService,
          useValue: {
            accountExistsForUser: jest.fn(),
            findById: jest.fn(),
            update: jest.fn()
          }
        },
        {
          provide: CategoriesService,
          useValue: {
            findById: jest.fn(),
            ensureDefaultTransferCategory: jest.fn()
          }
        },
        {
          provide: CreditCardsService,
          useValue: {
            findById: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    repository = module.get('TransactionRepository') as jest.Mocked<TransactionRepository>;
    accountsService = module.get(AccountsService) as jest.Mocked<AccountsService>;
    categoriesService = module.get(CategoriesService) as jest.Mocked<CategoriesService>;
    creditCardsService = module.get(CreditCardsService) as jest.Mocked<CreditCardsService>;

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all transactions from the authenticated user', async () => {
      repository.findAllByUserId.mockResolvedValue([baseTransaction]);

      const result = await service.findAll(baseTransaction.userId);

      expect(result).toEqual([baseTransaction]);
      expect(repository.findAllByUserId).toHaveBeenCalledWith(baseTransaction.userId, undefined);
    });

    it('should pass filters to repository and validate category ownership', async () => {
      const filters = {
        year: 2026,
        month: 4,
        categoryId: baseTransaction.categoryId as string,
        type: 'EXPENSE' as const,
        includeTransfer: false
      };

      repository.findAllByUserId.mockResolvedValue([baseTransaction]);
      categoriesService.findById.mockResolvedValue(expenseCategory);

      const result = await service.findAll(baseTransaction.userId, filters);

      expect(result).toEqual([baseTransaction]);
      expect(categoriesService.findById).toHaveBeenCalledWith(filters.categoryId, baseTransaction.userId);
      expect(repository.findAllByUserId).toHaveBeenCalledWith(baseTransaction.userId, filters);
    });

    it('should throw NotFoundError when category filter does not belong to user', async () => {
      categoriesService.findById.mockRejectedValue(
        new NotFoundError({
          code: 'categories.category_not_found',
          i18nKey: 'errors.not_found.resource',
          i18nArgs: { resource: 'category' }
        })
      );

      await expect(
        service.findAll(baseTransaction.userId, {
          year: 2026,
          month: 4,
          categoryId: baseTransaction.categoryId as string
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw InvalidArgumentError if user id is invalid', async () => {
      await expect(service.findAll('')).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('findById', () => {
    it('should return transaction when found', async () => {
      repository.findByIdAndUserId.mockResolvedValue(baseTransaction);

      const result = await service.findById(baseTransaction.id, baseTransaction.userId);

      expect(result).toEqual(baseTransaction);
      expect(repository.findByIdAndUserId).toHaveBeenCalledWith(
        baseTransaction.id,
        baseTransaction.userId
      );
    });

    it('should throw NotFoundError if transaction does not exist', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.findById(baseTransaction.id, baseTransaction.userId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('create', () => {
    it('should create a paid expense transaction and decrease account balance', async () => {
      const paidTransaction: Transaction = {
        ...baseTransaction,
        isPaid: true
      };

      accountsService.accountExistsForUser.mockResolvedValue(true);
      categoriesService.findById.mockResolvedValue(expenseCategory);
      repository.create.mockResolvedValue(paidTransaction);
      accountsService.findById.mockResolvedValue(account);
      accountsService.update.mockResolvedValue({
        ...account,
        balance: account.balance - paidTransaction.amount
      });

      const result = await service.create({
        userId: paidTransaction.userId,
        accountId: paidTransaction.accountId,
        categoryId: paidTransaction.categoryId,
        cardId: paidTransaction.cardId,
        description: paidTransaction.description,
        type: paidTransaction.type,
        amount: paidTransaction.amount,
        date: '2026-04-04',
        isPaid: true
      });

      expect(result).toEqual(paidTransaction);
      expect(accountsService.update).toHaveBeenCalledWith(account.id, account.userId, {
        balance: account.balance - paidTransaction.amount
      });
    });

    it('should create unpaid transaction without changing account balance', async () => {
      accountsService.accountExistsForUser.mockResolvedValue(true);
      categoriesService.findById.mockResolvedValue(expenseCategory);
      repository.create.mockResolvedValue(baseTransaction);

      const result = await service.create({
        userId: baseTransaction.userId,
        accountId: baseTransaction.accountId,
        categoryId: baseTransaction.categoryId,
        cardId: baseTransaction.cardId,
        description: baseTransaction.description,
        type: baseTransaction.type,
        amount: baseTransaction.amount,
        date: '2026-04-04',
        isPaid: false
      });

      expect(result).toEqual(baseTransaction);
      expect(accountsService.update).not.toHaveBeenCalled();
    });

    it('should create installment series and pay only the first occurrence', async () => {
      const first: Transaction = {
        ...baseTransaction,
        seriesId: '11111111-1111-1111-1111-111111111111',
        occurrenceNumber: 1,
        seriesType: 'INSTALLMENT',
        seriesTotalOccurrences: 3,
        isPaid: true
      };

      accountsService.accountExistsForUser.mockResolvedValue(true);
      categoriesService.findById.mockResolvedValue(expenseCategory);
      repository.createSeriesWithOccurrences.mockResolvedValue({
        seriesId: first.seriesId as string,
        firstTransactionId: first.id
      });
      repository.findByIdAndUserId.mockResolvedValue(first);
      accountsService.findById.mockResolvedValue(account);
      accountsService.update.mockResolvedValue({
        ...account,
        balance: account.balance - first.amount
      });

      const result = await service.create({
        userId: first.userId,
        accountId: first.accountId,
        categoryId: first.categoryId,
        type: TransactionType.EXPENSE,
        amount: first.amount,
        date: '2026-01-15',
        isPaid: true,
        schedule: { mode: 'INSTALLMENT', endDate: '2026-03-15' }
      });

      expect(result).toEqual(first);
      expect(repository.createSeriesWithOccurrences).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INSTALLMENT',
          totalOccurrences: 3,
          occurrences: [
            expect.objectContaining({ occurrenceNumber: 1, isPaid: true, isProjected: false }),
            expect.objectContaining({ occurrenceNumber: 2, isPaid: false, isProjected: false }),
            expect.objectContaining({ occurrenceNumber: 3, isPaid: false, isProjected: false })
          ]
        })
      );
      expect(accountsService.update).toHaveBeenCalledTimes(1);
    });

    it('should create card installment series by invoice payment months', async () => {
      const cardId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const first: Transaction = {
        ...baseTransaction,
        cardId,
        seriesId: '33333333-3333-3333-3333-333333333333',
        occurrenceNumber: 1,
        seriesType: 'INSTALLMENT',
        seriesTotalOccurrences: 12,
        date: '2026-07-21T00:00:00.000Z',
        invoicePaymentMonth: '2026-08',
        isPaid: false
      };

      accountsService.accountExistsForUser.mockResolvedValue(true);
      categoriesService.findById.mockResolvedValue(expenseCategory);
      creditCardsService.findById.mockResolvedValue({
        id: cardId,
        userId: first.userId,
        accountId: first.accountId,
        name: 'Nubank',
        limit: 500000,
        closingDay: 4,
        dueDay: 11,
        usedAmount: 0,
        createdAt: first.createdAt,
        updatedAt: first.updatedAt
      });
      repository.createSeriesWithOccurrences.mockResolvedValue({
        seriesId: first.seriesId as string,
        firstTransactionId: first.id
      });
      repository.findByIdAndUserId.mockResolvedValue(first);

      const result = await service.create({
        userId: first.userId,
        accountId: first.accountId,
        categoryId: first.categoryId,
        cardId,
        type: TransactionType.EXPENSE,
        amount: first.amount,
        date: '2026-07-21',
        isPaid: false,
        schedule: { mode: 'INSTALLMENT', endDate: '2027-07-15' }
      });

      expect(result).toEqual(first);
      expect(repository.createSeriesWithOccurrences).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INSTALLMENT',
          totalOccurrences: 12,
          occurrences: expect.arrayContaining([
            expect.objectContaining({ occurrenceNumber: 1, date: '2026-07-21' }),
            expect.objectContaining({ occurrenceNumber: 12, date: '2027-06-21' })
          ])
        })
      );
      const call = repository.createSeriesWithOccurrences.mock.calls[0]?.[0];
      expect(call?.occurrences).toHaveLength(12);
    });

    it('should create recurring series with projected future occurrences', async () => {
      const first: Transaction = {
        ...baseTransaction,
        seriesId: '22222222-2222-2222-2222-222222222222',
        occurrenceNumber: 1,
        seriesType: 'RECURRING',
        seriesTotalOccurrences: null,
        isPaid: false,
        isProjected: false
      };
      const seriesMaintenance = (
        service as unknown as {
          seriesMaintenance: {
            buildInitialRecurringOccurrences: jest.Mock;
          };
        }
      ).seriesMaintenance;

      seriesMaintenance.buildInitialRecurringOccurrences.mockReturnValue([
        { occurrenceNumber: 1, date: '2026-01-10', isPaid: false, isProjected: false },
        { occurrenceNumber: 2, date: '2026-02-10', isPaid: false, isProjected: true }
      ]);
      accountsService.accountExistsForUser.mockResolvedValue(true);
      categoriesService.findById.mockResolvedValue(expenseCategory);
      repository.createSeriesWithOccurrences.mockResolvedValue({
        seriesId: first.seriesId as string,
        firstTransactionId: first.id
      });
      repository.findByIdAndUserId.mockResolvedValue(first);

      const result = await service.create({
        userId: first.userId,
        accountId: first.accountId,
        categoryId: first.categoryId,
        type: TransactionType.EXPENSE,
        amount: first.amount,
        date: '2026-01-10',
        isPaid: false,
        schedule: { mode: 'RECURRING' }
      });

      expect(result).toEqual(first);
      expect(repository.createSeriesWithOccurrences).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RECURRING',
          totalOccurrences: null
        })
      );
    });

    it('should throw InvalidArgumentError when category type does not match transaction type', async () => {
      categoriesService.findById.mockResolvedValue({
        ...expenseCategory,
        types: ['INCOME']
      });

      await expect(
        service.create({
          userId: baseTransaction.userId,
          categoryId: baseTransaction.categoryId,
          type: TransactionType.EXPENSE,
          amount: baseTransaction.amount,
          date: '2026-04-04',
          isPaid: false
        })
      ).rejects.toThrow(InvalidArgumentError);
    });

    it('should throw InvalidArgumentError when category is provided for transfer', async () => {
      await expect(
        service.create({
          userId: baseTransaction.userId,
          categoryId: baseTransaction.categoryId,
          type: TransactionType.TRANSFER,
          amount: baseTransaction.amount,
          date: '2026-04-04',
          isPaid: false
        })
      ).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('update', () => {
    it('should rebalance account when updating a paid transaction', async () => {
      const paidCurrentTransaction: Transaction = {
        ...baseTransaction,
        isPaid: true,
        amount: 1000
      };
      const updatedTransaction: Transaction = {
        ...paidCurrentTransaction,
        amount: 3000
      };

      repository.findByIdAndUserId.mockResolvedValue(paidCurrentTransaction);
      accountsService.accountExistsForUser.mockResolvedValue(true);
      categoriesService.findById.mockResolvedValue(expenseCategory);
      repository.update.mockResolvedValue(updatedTransaction);
      accountsService.findById.mockResolvedValueOnce(account).mockResolvedValueOnce({
        ...account,
        balance: account.balance + paidCurrentTransaction.amount
      });
      accountsService.update
        .mockResolvedValueOnce({
          ...account,
          balance: account.balance + paidCurrentTransaction.amount
        })
        .mockResolvedValueOnce({
          ...account,
          balance: account.balance - 2000
        });

      const result = await service.update(updatedTransaction.id, updatedTransaction.userId, {
        amount: updatedTransaction.amount
      });

      expect(result).toEqual(updatedTransaction);
      expect(accountsService.update).toHaveBeenCalledTimes(2);
      expect(accountsService.update).toHaveBeenNthCalledWith(1, account.id, account.userId, {
        balance: account.balance + paidCurrentTransaction.amount
      });
      expect(accountsService.update).toHaveBeenNthCalledWith(2, account.id, account.userId, {
        balance: account.balance - 2000
      });
    });

    it('should throw InvalidArgumentError when no fields are provided', async () => {
      await expect(service.update(baseTransaction.id, baseTransaction.userId, {})).rejects.toThrow(
        InvalidArgumentError
      );
    });

    it('should reject update when transaction belongs to a transfer pair', async () => {
      repository.findByIdAndUserId.mockResolvedValue({
        ...baseTransaction,
        transferGroupId: 'group-1'
      });

      await expect(
        service.update(baseTransaction.id, baseTransaction.userId, { amount: 1000 })
      ).rejects.toThrow(InvalidArgumentError);
    });

    it('should promote a standalone transaction to installment series', async () => {
      const promoted: Transaction = {
        ...baseTransaction,
        seriesId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        occurrenceNumber: 1,
        seriesType: 'INSTALLMENT',
        seriesTotalOccurrences: 3
      };

      repository.findByIdAndUserId
        .mockResolvedValueOnce(baseTransaction)
        .mockResolvedValueOnce(promoted);
      accountsService.accountExistsForUser.mockResolvedValue(true);
      categoriesService.findById.mockResolvedValue(expenseCategory);
      repository.promoteToSeries.mockResolvedValue({
        seriesId: promoted.seriesId as string,
        firstTransactionId: promoted.id
      });

      const result = await service.update(baseTransaction.id, baseTransaction.userId, {
        schedule: { mode: 'INSTALLMENT', endDate: '2026-06-04' }
      });

      expect(result).toEqual(promoted);
      expect(repository.promoteToSeries).toHaveBeenCalledWith(
        baseTransaction.id,
        expect.objectContaining({
          type: 'INSTALLMENT',
          totalOccurrences: 3,
          occurrences: expect.arrayContaining([
            expect.objectContaining({ occurrenceNumber: 1, isPaid: false })
          ])
        })
      );
    });

    it('should convert installment series to recurring', async () => {
      const installment: Transaction = {
        ...baseTransaction,
        seriesId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        occurrenceNumber: 1,
        seriesType: 'INSTALLMENT',
        seriesTotalOccurrences: 3
      };
      const converted: Transaction = {
        ...installment,
        seriesType: 'RECURRING',
        seriesTotalOccurrences: null
      };
      const seriesMaintenance = (
        service as unknown as {
          seriesMaintenance: {
            extendActiveRecurringSeries: jest.Mock;
          };
        }
      ).seriesMaintenance;

      repository.findByIdAndUserId
        .mockResolvedValueOnce(installment)
        .mockResolvedValueOnce(converted);
      accountsService.accountExistsForUser.mockResolvedValue(true);
      categoriesService.findById.mockResolvedValue(expenseCategory);
      repository.findBySeriesFromOccurrence.mockResolvedValue([installment]);
      repository.convertSeriesToRecurring.mockResolvedValue(converted);
      seriesMaintenance.extendActiveRecurringSeries.mockResolvedValue(2);

      const result = await service.update(installment.id, installment.userId, {
        schedule: { mode: 'RECURRING' }
      });

      expect(result).toEqual(converted);
      expect(repository.convertSeriesToRecurring).toHaveBeenCalledWith(
        expect.objectContaining({
          seriesId: installment.seriesId,
          fromOccurrenceNumber: 1
        })
      );
      expect(seriesMaintenance.extendActiveRecurringSeries).toHaveBeenCalled();
    });

    it('should convert recurring series to installment', async () => {
      const recurring: Transaction = {
        ...baseTransaction,
        seriesId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        occurrenceNumber: 1,
        seriesType: 'RECURRING',
        seriesTotalOccurrences: null
      };
      const converted: Transaction = {
        ...recurring,
        seriesType: 'INSTALLMENT',
        seriesTotalOccurrences: 3
      };

      repository.findByIdAndUserId
        .mockResolvedValueOnce(recurring)
        .mockResolvedValueOnce(converted);
      accountsService.accountExistsForUser.mockResolvedValue(true);
      categoriesService.findById.mockResolvedValue(expenseCategory);
      repository.findBySeriesFromOccurrence.mockResolvedValue([recurring]);
      repository.convertSeriesToInstallment.mockResolvedValue(converted);

      const result = await service.update(recurring.id, recurring.userId, {
        schedule: { mode: 'INSTALLMENT', endDate: '2026-06-04' }
      });

      expect(result).toEqual(converted);
      expect(repository.convertSeriesToInstallment).toHaveBeenCalledWith(
        expect.objectContaining({
          seriesId: recurring.seriesId,
          startDate: '2026-04-04',
          endDate: '2026-06-04'
        })
      );
    });

    it('should reject detaching a series back to NONE', async () => {
      repository.findByIdAndUserId.mockResolvedValue({
        ...baseTransaction,
        seriesId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        occurrenceNumber: 1,
        seriesType: 'INSTALLMENT',
        seriesTotalOccurrences: 2
      });
      accountsService.accountExistsForUser.mockResolvedValue(true);
      categoriesService.findById.mockResolvedValue(expenseCategory);

      await expect(
        service.update(baseTransaction.id, baseTransaction.userId, {
          schedule: { mode: 'NONE' },
          amount: 1000
        })
      ).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('updateIsPaid', () => {
    it('should decrease account balance when marking an expense as paid', async () => {
      repository.findByIdAndUserId.mockResolvedValue(baseTransaction);
      repository.updateIsPaid.mockResolvedValue({
        ...baseTransaction,
        isPaid: true
      });
      accountsService.findById.mockResolvedValue(account);
      accountsService.update.mockResolvedValue({
        ...account,
        balance: account.balance - baseTransaction.amount
      });

      const result = await service.updateIsPaid(baseTransaction.id, baseTransaction.userId, true);

      expect(result.isPaid).toBe(true);
      expect(accountsService.update).toHaveBeenCalledWith(account.id, account.userId, {
        balance: account.balance - baseTransaction.amount
      });
    });

    it('should reject paid status update for transfer legs', async () => {
      repository.findByIdAndUserId.mockResolvedValue({
        ...baseTransaction,
        transferGroupId: 'group-1',
        isPaid: true
      });

      await expect(
        service.updateIsPaid(baseTransaction.id, baseTransaction.userId, false)
      ).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('createTransfer', () => {
    const destinationAccount: Account = {
      id: '8f2a9366-df4d-4ff4-ac12-e1b5e49f30f4',
      userId: account.userId,
      name: 'Savings',
      balance: 5000,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };

    const transferInput = {
      userId: account.userId,
      sourceAccountId: account.id,
      destinationAccountId: destinationAccount.id,
      amount: 1500,
      date: '2026-04-04'
    };

    it('should create linked expense and income transactions', async () => {
      accountsService.findById
        .mockResolvedValueOnce(account)
        .mockResolvedValueOnce(destinationAccount);
      categoriesService.ensureDefaultTransferCategory.mockResolvedValue({
        id: '2df2cc34-219b-4df3-8107-1ab2d1f0ec88',
        userId: account.userId,
        name: 'Transferência',
        icon: 'swap-horizontal-outline',
        isSystem: true,
        createdAt: baseTransaction.createdAt,
        updatedAt: baseTransaction.updatedAt
      });

      const sourceTransaction: Transaction = {
        ...baseTransaction,
        type: TransactionType.EXPENSE,
        amount: 1500,
        isPaid: true,
        transferGroupId: 'group-1'
      };
      const destinationTransaction: Transaction = {
        ...sourceTransaction,
        id: 'dest-tx-id',
        accountId: destinationAccount.id,
        type: TransactionType.INCOME
      };

      repository.createTransferPair.mockResolvedValue({
        transferGroupId: 'group-1',
        sourceTransaction,
        destinationTransaction
      });

      const result = await service.createTransfer(transferInput);

      expect(result.transferGroupId).toBe('group-1');
      expect(repository.createTransferPair).toHaveBeenCalled();
      expect(categoriesService.ensureDefaultTransferCategory).toHaveBeenCalledWith(account.userId);
    });

    it('should throw when source and destination accounts are the same', async () => {
      await expect(
        service.createTransfer({
          ...transferInput,
          destinationAccountId: transferInput.sourceAccountId
        })
      ).rejects.toThrow(InvalidArgumentError);
    });

    it('should throw when source account has insufficient balance', async () => {
      accountsService.findById
        .mockResolvedValueOnce({ ...account, balance: 100 })
        .mockResolvedValueOnce(destinationAccount);

      await expect(service.createTransfer(transferInput)).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('remove', () => {
    it('should revert account balance before deleting a paid transaction', async () => {
      const paidTransaction: Transaction = {
        ...baseTransaction,
        isPaid: true
      };

      repository.findByIdAndUserId.mockResolvedValue(paidTransaction);
      accountsService.findById.mockResolvedValue(account);
      accountsService.update.mockResolvedValue({
        ...account,
        balance: account.balance + paidTransaction.amount
      });
      repository.delete.mockResolvedValue(undefined);

      await service.remove(paidTransaction.id, paidTransaction.userId);

      expect(accountsService.update).toHaveBeenCalledWith(account.id, account.userId, {
        balance: account.balance + paidTransaction.amount
      });
      expect(repository.delete).toHaveBeenCalledWith(paidTransaction.id);
    });

    it('should delete transfer pair without applying single-leg balance impact', async () => {
      const transferLeg: Transaction = {
        ...baseTransaction,
        transferGroupId: 'group-1',
        isPaid: true
      };

      repository.findByIdAndUserId.mockResolvedValue(transferLeg);
      repository.deleteTransferPair.mockResolvedValue(true);

      await service.remove(transferLeg.id, transferLeg.userId);

      expect(repository.deleteTransferPair).toHaveBeenCalledWith('group-1', transferLeg.userId);
      expect(accountsService.update).not.toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('findTransferByGroupId', () => {
    it('should return transfer pair when found', async () => {
      const sourceTransaction: Transaction = {
        ...baseTransaction,
        type: TransactionType.EXPENSE,
        transferGroupId: 'group-1',
        isPaid: true
      };
      const destinationTransaction: Transaction = {
        ...sourceTransaction,
        id: 'dest-tx-id',
        type: TransactionType.INCOME
      };

      repository.findByTransferGroupIdAndUserId.mockResolvedValue({
        sourceTransaction,
        destinationTransaction
      });

      const result = await service.findTransferByGroupId('group-1', baseTransaction.userId);

      expect(result.transferGroupId).toBe('group-1');
      expect(result.sourceTransaction.id).toBe(sourceTransaction.id);
    });

    it('should throw NotFoundError when transfer pair is missing', async () => {
      repository.findByTransferGroupIdAndUserId.mockResolvedValue(null);

      await expect(
        service.findTransferByGroupId('group-1', baseTransaction.userId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateTransfer', () => {
    const destinationAccount: Account = {
      id: '8f2a9366-df4d-4ff4-ac12-e1b5e49f30f4',
      userId: account.userId,
      name: 'Savings',
      balance: 5000,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };

    const sourceTransaction: Transaction = {
      ...baseTransaction,
      type: TransactionType.EXPENSE,
      amount: 1500,
      isPaid: true,
      transferGroupId: 'group-1'
    };
    const destinationTransaction: Transaction = {
      ...sourceTransaction,
      id: 'dest-tx-id',
      accountId: destinationAccount.id,
      type: TransactionType.INCOME
    };

    const updateInput = {
      sourceAccountId: account.id,
      destinationAccountId: destinationAccount.id,
      amount: 2000,
      date: '2026-04-05'
    };

    it('should update transfer pair through repository', async () => {
      repository.findByTransferGroupIdAndUserId.mockResolvedValue({
        sourceTransaction,
        destinationTransaction
      });
      accountsService.findById
        .mockResolvedValueOnce(account)
        .mockResolvedValueOnce(destinationAccount)
        .mockResolvedValueOnce(account);
      repository.updateTransferPair.mockResolvedValue({
        transferGroupId: 'group-1',
        sourceTransaction: { ...sourceTransaction, amount: 2000 },
        destinationTransaction: { ...destinationTransaction, amount: 2000 }
      });

      const result = await service.updateTransfer('group-1', account.userId, updateInput);

      expect(result.sourceTransaction.amount).toBe(2000);
      expect(repository.updateTransferPair).toHaveBeenCalledWith('group-1', {
        ...updateInput,
        userId: account.userId
      });
    });
  });
});
