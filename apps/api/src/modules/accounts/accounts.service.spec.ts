import { Test, TestingModule } from '@nestjs/testing';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { AccountsService } from './accounts.service';
import { Account } from './entities/account.entity';
import { AccountRepository } from './repositories/account.repository';

describe('AccountsService', () => {
  let service: AccountsService;
  let repository: jest.Mocked<AccountRepository>;

  const account: Account = {
    id: '5ea4f605-31d5-4dcf-93bc-45fafad6f319',
    name: 'Main Account',
    balance: 1000,
    userId: '2cea6915-f57e-4ba4-84ec-08f47e4eb7f9',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: 'AccountRepository',
          useValue: {
            findAllByUserId: jest.fn(),
            findByIdAndUserId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    repository = module.get('AccountRepository') as jest.Mocked<AccountRepository>;

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all accounts from the authenticated user', async () => {
      repository.findAllByUserId.mockResolvedValue([account]);

      const result = await service.findAll(account.userId);

      expect(result).toEqual([account]);
      expect(repository.findAllByUserId).toHaveBeenCalledWith(account.userId);
    });

    it('should throw InvalidArgumentError if user id is invalid', async () => {
      await expect(service.findAll('')).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('findById', () => {
    it('should return account when found', async () => {
      repository.findByIdAndUserId.mockResolvedValue(account);

      const result = await service.findById(account.id, account.userId);

      expect(result).toEqual(account);
      expect(repository.findByIdAndUserId).toHaveBeenCalledWith(account.id, account.userId);
    });

    it('should throw NotFoundError if account does not exist', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.findById(account.id, account.userId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('accountExistsForUser', () => {
    it('should return true when account belongs to user', async () => {
      repository.findByIdAndUserId.mockResolvedValue(account);

      const result = await service.accountExistsForUser(account.id, account.userId);

      expect(result).toBe(true);
      expect(repository.findByIdAndUserId).toHaveBeenCalledWith(account.id, account.userId);
    });

    it('should return false when account does not belong to user', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);

      const result = await service.accountExistsForUser(account.id, account.userId);

      expect(result).toBe(false);
      expect(repository.findByIdAndUserId).toHaveBeenCalledWith(account.id, account.userId);
    });

    it('should throw InvalidArgumentError if account id is invalid', async () => {
      await expect(service.accountExistsForUser('', account.userId)).rejects.toThrow(
        InvalidArgumentError
      );
    });
  });

  describe('create', () => {
    it('should create account with provided data', async () => {
      repository.create.mockResolvedValue(account);

      const result = await service.create({
        userId: account.userId,
        name: account.name,
        balance: account.balance
      });

      expect(result).toEqual(account);
      expect(repository.create).toHaveBeenCalledWith({
        userId: account.userId,
        name: account.name,
        balance: account.balance
      });
    });

    it('should throw InvalidArgumentError if balance is not an integer', async () => {
      await expect(
        service.create({
          userId: account.userId,
          name: account.name,
          balance: 10.5
        })
      ).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('update', () => {
    it('should update account when account exists and data is valid', async () => {
      const updatedAccount: Account = { ...account, name: 'Updated Name' };

      repository.findByIdAndUserId.mockResolvedValue(account);
      repository.update.mockResolvedValue(updatedAccount);

      const result = await service.update(account.id, account.userId, { name: 'Updated Name' });

      expect(result).toEqual(updatedAccount);
      expect(repository.update).toHaveBeenCalledWith(account.id, { name: 'Updated Name' });
    });

    it('should throw InvalidArgumentError when no fields are provided', async () => {
      await expect(service.update(account.id, account.userId, {})).rejects.toThrow(
        InvalidArgumentError
      );
    });
  });

  describe('remove', () => {
    it('should delete account when account exists', async () => {
      repository.findByIdAndUserId.mockResolvedValue(account);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(account.id, account.userId);

      expect(repository.delete).toHaveBeenCalledWith(account.id);
    });

    it('should throw NotFoundError when account does not exist', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.remove(account.id, account.userId)).rejects.toThrow(NotFoundError);
    });
  });
});
