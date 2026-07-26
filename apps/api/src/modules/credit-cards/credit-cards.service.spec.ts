import { Test, TestingModule } from '@nestjs/testing';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { AccountsService } from '../accounts/accounts.service';
import { CreditCardsService } from './credit-cards.service';
import { CreditCard } from './entities/credit-card.entity';
import { CreditCardRepository } from './repositories/credit-card.repository';

describe('CreditCardsService', () => {
  let service: CreditCardsService;
  let repository: jest.Mocked<CreditCardRepository>;
  let accountsService: jest.Mocked<Pick<AccountsService, 'accountExistsForUser'>>;

  const creditCard: CreditCard = {
    id: '5ea4f605-31d5-4dcf-93bc-45fafad6f319',
    userId: '2cea6915-f57e-4ba4-84ec-08f47e4eb7f9',
    accountId: '0f8a7e38-284d-4a8b-bf59-fb2f2c5d4b10',
    name: 'Platinum',
    limit: 500000,
    closingDay: 10,
    dueDay: 18,
    usedAmount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditCardsService,
        {
          provide: 'CreditCardRepository',
          useValue: {
            findAllByUserId: jest.fn(),
            findByIdAndUserId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            payInvoice: jest.fn()
          }
        },
        {
          provide: AccountsService,
          useValue: {
            accountExistsForUser: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<CreditCardsService>(CreditCardsService);
    repository = module.get('CreditCardRepository') as jest.Mocked<CreditCardRepository>;
    accountsService = module.get(AccountsService) as jest.Mocked<
      Pick<AccountsService, 'accountExistsForUser'>
    >;

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all credit cards from the authenticated user', async () => {
      repository.findAllByUserId.mockResolvedValue([creditCard]);

      const result = await service.findAll(creditCard.userId);

      expect(result).toEqual([creditCard]);
      expect(repository.findAllByUserId).toHaveBeenCalledWith(creditCard.userId);
    });

    it('should throw InvalidArgumentError if user id is invalid', async () => {
      await expect(service.findAll('')).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('findById', () => {
    it('should return credit card when found', async () => {
      repository.findByIdAndUserId.mockResolvedValue(creditCard);

      const result = await service.findById(creditCard.id, creditCard.userId);

      expect(result).toEqual(creditCard);
      expect(repository.findByIdAndUserId).toHaveBeenCalledWith(creditCard.id, creditCard.userId);
    });

    it('should throw NotFoundError if credit card does not exist', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.findById(creditCard.id, creditCard.userId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('create', () => {
    it('should create credit card when account belongs to user', async () => {
      accountsService.accountExistsForUser.mockResolvedValue(true);
      repository.create.mockResolvedValue(creditCard);

      const result = await service.create({
        userId: creditCard.userId,
        accountId: creditCard.accountId,
        name: creditCard.name,
        limit: creditCard.limit,
        closingDay: creditCard.closingDay,
        dueDay: creditCard.dueDay
      });

      expect(result).toEqual(creditCard);
      expect(accountsService.accountExistsForUser).toHaveBeenCalledWith(
        creditCard.accountId,
        creditCard.userId
      );
      expect(repository.create).toHaveBeenCalledWith({
        userId: creditCard.userId,
        accountId: creditCard.accountId,
        name: creditCard.name,
        limit: creditCard.limit,
        closingDay: creditCard.closingDay,
        dueDay: creditCard.dueDay
      });
    });

    it('should create credit card without linked account', async () => {
      const cardWithoutAccount: CreditCard = { ...creditCard, accountId: null };
      repository.create.mockResolvedValue(cardWithoutAccount);

      const result = await service.create({
        userId: creditCard.userId,
        name: creditCard.name,
        limit: creditCard.limit,
        closingDay: creditCard.closingDay,
        dueDay: creditCard.dueDay
      });

      expect(result).toEqual(cardWithoutAccount);
      expect(accountsService.accountExistsForUser).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith({
        userId: creditCard.userId,
        name: creditCard.name,
        limit: creditCard.limit,
        closingDay: creditCard.closingDay,
        dueDay: creditCard.dueDay
      });
    });

    it('should throw NotFoundError when account does not belong to user', async () => {
      accountsService.accountExistsForUser.mockResolvedValue(false);

      await expect(
        service.create({
          userId: creditCard.userId,
          accountId: creditCard.accountId,
          name: creditCard.name,
          limit: creditCard.limit,
          closingDay: creditCard.closingDay,
          dueDay: creditCard.dueDay
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw InvalidArgumentError if closing day is not an integer', async () => {
      await expect(
        service.create({
          userId: creditCard.userId,
          accountId: creditCard.accountId,
          name: creditCard.name,
          limit: creditCard.limit,
          closingDay: 10.5,
          dueDay: creditCard.dueDay
        })
      ).rejects.toThrow(InvalidArgumentError);
    });
  });

  describe('update', () => {
    it('should update credit card when credit card exists and data is valid', async () => {
      const updatedCreditCard: CreditCard = { ...creditCard, name: 'Updated Name' };

      repository.findByIdAndUserId.mockResolvedValue(creditCard);
      repository.update.mockResolvedValue(updatedCreditCard);

      const result = await service.update(creditCard.id, creditCard.userId, {
        name: 'Updated Name'
      });

      expect(result).toEqual(updatedCreditCard);
      expect(repository.update).toHaveBeenCalledWith(creditCard.id, { name: 'Updated Name' });
    });

    it('should throw InvalidArgumentError when no fields are provided', async () => {
      await expect(service.update(creditCard.id, creditCard.userId, {})).rejects.toThrow(
        InvalidArgumentError
      );
    });

    it('should throw NotFoundError when updated account does not belong to user', async () => {
      repository.findByIdAndUserId.mockResolvedValue(creditCard);
      accountsService.accountExistsForUser.mockResolvedValue(false);

      await expect(
        service.update(creditCard.id, creditCard.userId, { accountId: creditCard.accountId })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('should delete credit card when credit card exists', async () => {
      repository.findByIdAndUserId.mockResolvedValue(creditCard);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(creditCard.id, creditCard.userId);

      expect(repository.delete).toHaveBeenCalledWith(creditCard.id);
    });

    it('should throw NotFoundError when credit card does not exist', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.remove(creditCard.id, creditCard.userId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('payInvoice', () => {
    const now = new Date(Date.UTC(2026, 5, 15));
    const cycleEnd = '2026-06-09';
    const payResult = {
      amount: 15000,
      accountId: creditCard.accountId as string,
      paymentTransactionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      paidCount: 2,
      cycleStart: '2026-05-10',
      cycleEnd
    };

    it('should pay closed invoice using linked account', async () => {
      repository.findByIdAndUserId.mockResolvedValue(creditCard);
      accountsService.accountExistsForUser.mockResolvedValue(true);
      repository.payInvoice.mockResolvedValue(payResult);

      const result = await service.payInvoice(
        creditCard.id,
        creditCard.userId,
        { cycleEnd },
        now
      );

      expect(result).toEqual(payResult);
      expect(repository.payInvoice).toHaveBeenCalledWith({
        userId: creditCard.userId,
        creditCardId: creditCard.id,
        accountId: creditCard.accountId,
        cycleStart: '2026-05-10',
        cycleEnd,
        paymentDate: '2026-06-15',
        description: 'Invoice payment'
      });
    });

    it('should throw InvalidArgumentError if invoice cycle is not closed yet', async () => {
      repository.findByIdAndUserId.mockResolvedValue(creditCard);
      accountsService.accountExistsForUser.mockResolvedValue(true);

      await expect(
        service.payInvoice(
          creditCard.id,
          creditCard.userId,
          { cycleEnd },
          new Date(Date.UTC(2026, 5, 5))
        )
      ).rejects.toThrow(InvalidArgumentError);

      expect(repository.payInvoice).not.toHaveBeenCalled();
    });

    it('should throw InvalidArgumentError if no account can be resolved', async () => {
      repository.findByIdAndUserId.mockResolvedValue({ ...creditCard, accountId: null });

      await expect(
        service.payInvoice(creditCard.id, creditCard.userId, { cycleEnd }, now)
      ).rejects.toThrow(InvalidArgumentError);

      expect(repository.payInvoice).not.toHaveBeenCalled();
    });

    it('should throw InvalidArgumentError if invoice has no unpaid purchases', async () => {
      repository.findByIdAndUserId.mockResolvedValue(creditCard);
      accountsService.accountExistsForUser.mockResolvedValue(true);
      repository.payInvoice.mockResolvedValue(null);

      await expect(
        service.payInvoice(creditCard.id, creditCard.userId, { cycleEnd }, now)
      ).rejects.toThrow(InvalidArgumentError);
    });

    it('should throw InvalidArgumentError on double pay when invoice is already empty', async () => {
      repository.findByIdAndUserId.mockResolvedValue(creditCard);
      accountsService.accountExistsForUser.mockResolvedValue(true);
      repository.payInvoice.mockResolvedValueOnce(payResult).mockResolvedValueOnce(null);

      await service.payInvoice(creditCard.id, creditCard.userId, { cycleEnd }, now);

      await expect(
        service.payInvoice(creditCard.id, creditCard.userId, { cycleEnd }, now)
      ).rejects.toThrow(InvalidArgumentError);
    });
  });
});
