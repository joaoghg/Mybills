import fixtures from './fixtures/redacted-pluggy-payloads.json';
import { ProviderAccountType } from 'src/generated/prisma/client';
import {
  classifyImportedTransaction,
  matchCardPaymentCounterpart,
  matchTransferCounterpart
} from '../mappers/classify-cash-flow';
import { mapPluggyAccount } from '../mappers/map-account';
import { mapPluggyBill } from '../mappers/map-bill';
import { mapPluggyInvestment, mapPluggyInvestmentTransaction } from '../mappers/map-investment';
import { mapPluggyTransaction } from '../mappers/map-transaction';
import { providerAmountToCents } from '../mappers/money';
import type { Account as PluggyAccount, CreditCardBills, Investment, InvestmentTransaction, Transaction } from 'pluggy-sdk';

describe('Open Finance mappers', () => {
  it('converts provider decimals to checked integer cents', () => {
    expect(providerAmountToCents(199)).toBe(19900);
    expect(providerAmountToCents(70.5)).toBe(7050);
    expect(() => providerAmountToCents(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('maps sandbox bank and credit accounts from redacted fixtures', () => {
    const bank = mapPluggyAccount(fixtures.accounts[0] as PluggyAccount);
    expect(bank.type).toBe('BANK');
    expect(bank.projectionBalanceCents).toBe(19900);

    const card = mapPluggyAccount(fixtures.accounts[2] as PluggyAccount);
    expect(card.type).toBe('CREDIT');
    expect(card.brand).toBeTruthy();
  });

  it('maps bills without requiring invoice rows', () => {
    const bill = mapPluggyBill(fixtures.bills[0] as unknown as CreditCardBills);
    expect(bill.externalId).toBe(fixtures.bills[0]?.id);
    expect(bill.financeCharges.length).toBeGreaterThan(0);
    expect(bill.totalAmountCents).toBe(500000);
  });

  it('maps posted credits as income and keeps pending separate', () => {
    const mapped = mapPluggyTransaction(fixtures.transactions[1] as unknown as Transaction);
    expect(mapped.type).toBe('INCOME');
    expect(mapped.status).toBe('POSTED');
    expect(mapped.amountCents).toBe(19900);
  });

  it('maps investments with decimal quantities', () => {
    const investment = mapPluggyInvestment(
      fixtures.investments[0] as unknown as Investment,
      'Pluggy Bank'
    );
    expect(investment.type).toBe('MUTUAL_FUND');
    expect(investment.quantity?.toString()).toBe('150');

    const movement = mapPluggyInvestmentTransaction(
      fixtures.investmentTransactions[0] as unknown as InvestmentTransaction
    );
    expect(movement.type).toBe('SELL');
  });

  it('classifies card payments and requires unique evidence for transfers', () => {
    const cardPayment = classifyImportedTransaction({
      description: 'Pagamento da fatura',
      categoryName: null,
      operationType: null,
      paymentMethod: null,
      hasBill: true,
      type: 'EXPENSE'
    });
    expect(cardPayment.role).toBe('CARD_PAYMENT');

    const match = matchTransferCounterpart(
      {
        id: 'a',
        accountId: 'acc-1',
        amountCents: 1000,
        currencyCode: 'BRL',
        date: new Date('2026-01-01'),
        type: 'EXPENSE',
        paymentReference: 'pix-1'
      },
      [
        {
          id: 'b',
          accountId: 'acc-2',
          amountCents: 1000,
          currencyCode: 'BRL',
          date: new Date('2026-01-01'),
          type: 'INCOME',
          paymentReference: 'pix-1'
        },
        {
          id: 'c',
          accountId: 'acc-3',
          amountCents: 1000,
          currencyCode: 'BRL',
          date: new Date('2026-01-01'),
          type: 'INCOME',
          paymentReference: 'pix-1'
        }
      ]
    );
    expect(match).toBeNull();
  });

  it('should classify bank-side invoice payments even when the wording is de fatura', () => {
    const nubank = classifyImportedTransaction({
      description: 'Pagamento de fatura',
      categoryName: 'Transfers',
      operationType: 'OUTROS',
      paymentMethod: 'OTHER',
      hasBill: false,
      type: 'EXPENSE'
    });
    expect(nubank.role).toBe('CARD_PAYMENT');

    const bradesco = classifyImportedTransaction({
      description: 'GASTOS CARTAO DE CREDITO - DOCTO: 3990224',
      categoryName: 'Credit card fees',
      operationType: 'CARTAO',
      paymentMethod: 'OTHER',
      hasBill: false,
      type: 'EXPENSE'
    });
    expect(bradesco.role).toBe('CARD_PAYMENT');
  });

  it('should pair a unique bank debit with the card payment income of the same amount', () => {
    const bankDebit = {
      id: 'bank',
      accountType: ProviderAccountType.BANK,
      amountCents: 172754,
      date: new Date('2026-08-05'),
      type: 'EXPENSE' as const,
      cashFlowRole: 'NORMAL' as const
    };
    const cardCredit = {
      id: 'card',
      accountType: ProviderAccountType.CREDIT,
      amountCents: 172754,
      date: new Date('2026-08-05'),
      type: 'INCOME' as const,
      cashFlowRole: 'CARD_PAYMENT' as const
    };

    expect(matchCardPaymentCounterpart(bankDebit, [bankDebit, cardCredit])).toEqual(cardCredit);
    expect(
      matchCardPaymentCounterpart(bankDebit, [
        bankDebit,
        cardCredit,
        { ...cardCredit, id: 'card-2' }
      ])
    ).toBeNull();
  });
});
