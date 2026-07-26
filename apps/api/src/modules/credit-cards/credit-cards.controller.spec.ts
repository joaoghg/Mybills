import { Test, TestingModule } from '@nestjs/testing';
import {
  CreateCreditCardInput,
  CreditCardOutput,
  ListCreditCardsOutput,
  PayCreditCardInvoiceInput,
  PayCreditCardInvoiceOutput,
  UpdateCreditCardInput
} from '@mybills/dtos';
import { CreditCardsController } from './credit-cards.controller';
import { CreditCardsService } from './credit-cards.service';

describe('CreditCardsController', () => {
  let controller: CreditCardsController;
  let service: jest.Mocked<CreditCardsService>;

  const linkedAccountId = '0f8a7e38-284d-4a8b-bf59-fb2f2c5d4b10';

  const baseCreditCard: CreditCardOutput = {
    id: '5ea4f605-31d5-4dcf-93bc-45fafad6f319',
    userId: '2cea6915-f57e-4ba4-84ec-08f47e4eb7f9',
    accountId: linkedAccountId,
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
      controllers: [CreditCardsController],
      providers: [
        {
          provide: CreditCardsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            payInvoice: jest.fn()
          }
        }
      ]
    }).compile();

    controller = module.get<CreditCardsController>(CreditCardsController);
    service = module.get(CreditCardsService) as jest.Mocked<CreditCardsService>;
  });

  describe('findAll', () => {
    it('should call creditCardsService.findAll with current user id and return credit cards', async () => {
      const output: ListCreditCardsOutput = [baseCreditCard];
      service.findAll.mockResolvedValue(output);

      const result = await controller.findAll(baseCreditCard.userId);

      expect(result).toEqual(output);
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith(baseCreditCard.userId);
    });
  });

  describe('findOne', () => {
    it('should call creditCardsService.findById with credit card id and user id', async () => {
      service.findById.mockResolvedValue(baseCreditCard);

      const result = await controller.findOne(baseCreditCard.userId, { id: baseCreditCard.id });

      expect(result).toEqual(baseCreditCard);
      expect(service.findById).toHaveBeenCalledTimes(1);
      expect(service.findById).toHaveBeenCalledWith(baseCreditCard.id, baseCreditCard.userId);
    });
  });

  describe('create', () => {
    it('should call creditCardsService.create with payload and user id', async () => {
      const input: CreateCreditCardInput = {
        accountId: linkedAccountId,
        name: 'Wallet Card',
        limit: 120000,
        closingDay: 12,
        dueDay: 20
      };

      service.create.mockResolvedValue(baseCreditCard);

      const result = await controller.create(baseCreditCard.userId, input);

      expect(result).toEqual(baseCreditCard);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith({
        userId: baseCreditCard.userId,
        accountId: input.accountId,
        name: input.name,
        limit: input.limit,
        closingDay: input.closingDay,
        dueDay: input.dueDay
      });
    });
  });

  describe('update', () => {
    it('should call creditCardsService.update with credit card id, user id and payload', async () => {
      const input: UpdateCreditCardInput = {
        name: 'Updated Card'
      };
      const output: CreditCardOutput = {
        ...baseCreditCard,
        name: 'Updated Card'
      };

      service.update.mockResolvedValue(output);

      const result = await controller.update(
        baseCreditCard.userId,
        { id: baseCreditCard.id },
        input
      );

      expect(result).toEqual(output);
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith(baseCreditCard.id, baseCreditCard.userId, input);
    });
  });

  describe('remove', () => {
    it('should call creditCardsService.remove with credit card id and user id', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(baseCreditCard.userId, { id: baseCreditCard.id });

      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(baseCreditCard.id, baseCreditCard.userId);
    });
  });

  describe('payInvoice', () => {
    it('should call creditCardsService.payInvoice with credit card id, user id and payload', async () => {
      const input: PayCreditCardInvoiceInput = {
        cycleEnd: '2026-06-09',
        accountId: linkedAccountId
      };
      const output: PayCreditCardInvoiceOutput = {
        amount: 15000,
        accountId: linkedAccountId,
        paymentTransactionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        paidCount: 2,
        cycleStart: '2026-05-10',
        cycleEnd: '2026-06-09'
      };

      service.payInvoice.mockResolvedValue(output);

      const result = await controller.payInvoice(
        baseCreditCard.userId,
        { id: baseCreditCard.id },
        input
      );

      expect(result).toEqual(output);
      expect(service.payInvoice).toHaveBeenCalledTimes(1);
      expect(service.payInvoice).toHaveBeenCalledWith(
        baseCreditCard.id,
        baseCreditCard.userId,
        input
      );
    });
  });
});
