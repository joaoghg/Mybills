import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountOutput,
  CreateAccountInput,
  ListAccountsOutput,
  TransferBalanceInput,
  TransferBalanceOutput,
  UpdateAccountInput
} from '@mybills/dtos';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { TransactionsService } from '../transactions/transactions.service';

describe('AccountsController', () => {
  let controller: AccountsController;
  let service: jest.Mocked<AccountsService>;
  let transactionsService: jest.Mocked<TransactionsService>;

  const baseAccount: AccountOutput = {
    id: '5ea4f605-31d5-4dcf-93bc-45fafad6f319',
    name: 'Main Account',
    balance: 1000,
    userId: '2cea6915-f57e-4ba4-84ec-08f47e4eb7f9',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        {
          provide: AccountsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            transferBalance: jest.fn(),
            update: jest.fn(),
            remove: jest.fn()
          }
        },
        {
          provide: TransactionsService,
          useValue: {
            createTransfer: jest.fn()
          }
        }
      ]
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
    service = module.get(AccountsService) as jest.Mocked<AccountsService>;
    transactionsService = module.get(TransactionsService) as jest.Mocked<TransactionsService>;
  });

  describe('findAll', () => {
    it('should call accountsService.findAll with current user id and return accounts', async () => {
      const output: ListAccountsOutput = [baseAccount];
      service.findAll.mockResolvedValue(output);

      const result = await controller.findAll(baseAccount.userId);

      expect(result).toEqual(output);
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith(baseAccount.userId);
    });
  });

  describe('findOne', () => {
    it('should call accountsService.findById with account id and user id', async () => {
      service.findById.mockResolvedValue(baseAccount);

      const result = await controller.findOne(baseAccount.userId, { id: baseAccount.id });

      expect(result).toEqual(baseAccount);
      expect(service.findById).toHaveBeenCalledTimes(1);
      expect(service.findById).toHaveBeenCalledWith(baseAccount.id, baseAccount.userId);
    });
  });

  describe('create', () => {
    it('should call accountsService.create with payload and user id', async () => {
      const input: CreateAccountInput = {
        name: 'Wallet',
        balance: 12345
      };

      service.create.mockResolvedValue(baseAccount);

      const result = await controller.create(baseAccount.userId, input);

      expect(result).toEqual(baseAccount);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith({
        userId: baseAccount.userId,
        name: input.name,
        balance: input.balance
      });
    });
  });

  describe('update', () => {
    it('should call accountsService.update with account id, user id and payload', async () => {
      const input: UpdateAccountInput = {
        name: 'Updated Wallet'
      };
      const output: AccountOutput = {
        ...baseAccount,
        name: 'Updated Wallet'
      };

      service.update.mockResolvedValue(output);

      const result = await controller.update(baseAccount.userId, { id: baseAccount.id }, input);

      expect(result).toEqual(output);
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith(baseAccount.id, baseAccount.userId, input);
    });
  });

  describe('transferBalance', () => {
    it('should create transfer transactions and return updated accounts', async () => {
      const input: TransferBalanceInput = {
        sourceAccountId: '5ea4f605-31d5-4dcf-93bc-45fafad6f319',
        destinationAccountId: '8f2a9366-df4d-4ff4-ac12-e1b5e49f30f4',
        amount: 450
      };

      const output: TransferBalanceOutput = {
        sourceAccount: {
          ...baseAccount,
          balance: 550
        },
        destinationAccount: {
          ...baseAccount,
          id: input.destinationAccountId,
          name: 'Savings Account',
          balance: 1450
        }
      };

      transactionsService.createTransfer.mockResolvedValue({
        transferGroupId: 'group-1',
        sourceTransaction: {} as never,
        destinationTransaction: {} as never
      });
      service.findById
        .mockResolvedValueOnce(output.sourceAccount)
        .mockResolvedValueOnce(output.destinationAccount);

      const result = await controller.transferBalance(baseAccount.userId, input);

      expect(result).toEqual(output);
      expect(transactionsService.createTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: baseAccount.userId,
          sourceAccountId: input.sourceAccountId,
          destinationAccountId: input.destinationAccountId,
          amount: input.amount
        })
      );
    });
  });

  describe('remove', () => {
    it('should call accountsService.remove with account id and user id', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(baseAccount.userId, { id: baseAccount.id });

      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(baseAccount.id, baseAccount.userId);
    });
  });
});
