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
    description: 'Market purchase',
    type: TransactionType.EXPENSE,
    amount: 2590,
    date: '2026-04-04T00:00:00.000Z',
    isPaid: false,
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
            delete: jest.fn()
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
      categoriesService.findById.mockResolvedValue({
        id: filters.categoryId,
        userId: baseTransaction.userId,
        name: 'Food',
        createdAt: baseTransaction.createdAt,
        updatedAt: baseTransaction.updatedAt
      });

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
      categoriesService.findById.mockResolvedValue({
        id: baseTransaction.categoryId as string,
        userId: baseTransaction.userId,
        name: 'Food',
        createdAt: baseTransaction.createdAt,
        updatedAt: baseTransaction.updatedAt
      });
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
      categoriesService.findById.mockResolvedValue({
        id: baseTransaction.categoryId as string,
        userId: baseTransaction.userId,
        name: 'Food',
        createdAt: baseTransaction.createdAt,
        updatedAt: baseTransaction.updatedAt
      });
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
      categoriesService.findById.mockResolvedValue({
        id: paidCurrentTransaction.categoryId as string,
        userId: paidCurrentTransaction.userId,
        name: 'Food',
        createdAt: paidCurrentTransaction.createdAt,
        updatedAt: paidCurrentTransaction.updatedAt
      });
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
  });
});
