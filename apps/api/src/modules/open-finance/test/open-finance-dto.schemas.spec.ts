import {
  accountOutputSchema,
  createOpenFinanceConnectionInputSchema,
  investmentOutputSchema,
  invoiceOutputSchema,
  monthlySummaryOutputSchema,
  openFinanceConnectionOutputSchema,
  openFinanceSyncRunOutputSchema,
  providerBillOutputSchema,
  sanitizedPluggyErrorSchema,
  transactionOutputSchema
} from '@mybills/dtos';

describe('Open Finance DTO schemas', () => {
  const uuid = '11111111-1111-4111-8111-111111111111';
  const timestamps = {
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z'
  };

  it('should accept a valid create-connection payload', () => {
    const parsed = createOpenFinanceConnectionInputSchema.parse({ itemId: uuid });

    expect(parsed.itemId).toBe(uuid);
  });

  it('should reject a non-uuid item id', () => {
    const result = createOpenFinanceConnectionInputSchema.safeParse({ itemId: 'not-a-uuid' });

    expect(result.success).toBe(false);
  });

  it('should parse a connection output with nullable last sync timestamps', () => {
    const parsed = openFinanceConnectionOutputSchema.parse({
      id: uuid,
      userId: uuid,
      itemId: uuid,
      connectorId: 200,
      status: 'ACTIVE',
      itemStatus: 'UPDATED',
      institutionName: 'Meu Pluggy',
      institutionLogoUrl: null,
      products: [
        {
          product: 'ACCOUNTS',
          status: 'SUCCESS',
          lastSuccessfulSyncAt: '2026-08-17T12:00:00.000Z',
          error: null
        }
      ],
      lastSuccessfulSyncAt: null,
      lastSyncAttemptAt: null,
      error: null,
      ...timestamps
    });

    expect(parsed.lastSuccessfulSyncAt).toBeNull();
    expect(parsed.products[0]?.error).toBeNull();
  });

  it('should reject an unsanitized error missing i18nKey', () => {
    const result = sanitizedPluggyErrorSchema.safeParse({
      code: 'ITEM_LOGIN_ERROR',
      product: 'ACCOUNTS'
    });

    expect(result.success).toBe(false);
  });

  it('should parse a pending manual sync run', () => {
    const parsed = openFinanceSyncRunOutputSchema.parse({
      id: uuid,
      connectionId: uuid,
      trigger: 'MANUAL',
      status: 'PENDING',
      products: [],
      error: null,
      startedAt: null,
      finishedAt: null,
      ...timestamps
    });

    expect(parsed.status).toBe('PENDING');
  });

  it('should parse a provider bill with nullable closing date and cents amounts', () => {
    const parsed = providerBillOutputSchema.parse({
      id: uuid,
      creditCardId: uuid,
      externalId: 'bill-1',
      source: 'PLUGGY',
      dueOn: '2026-09-15',
      closingOn: null,
      totalAmount: 1000076,
      minimumPaymentAmount: 300000,
      currencyCode: 'BRL',
      allowsInstallments: true,
      isFullyPaid: false,
      isForecast: false,
      forecastMonth: null,
      payments: [
        {
          id: uuid,
          externalId: 'pay-1',
          valueType: 'FULL_PAYMENT',
          paymentDate: '2026-09-10T00:00:00.000Z',
          paymentMode: 'PIX',
          amount: 500000,
          currencyCode: 'BRL'
        }
      ],
      financeCharges: [
        {
          id: uuid,
          externalId: 'chg-1',
          type: 'IOF',
          amount: 701,
          currencyCode: 'BRL',
          additionalInfo: null
        }
      ],
      ...timestamps
    });

    expect(parsed.closingOn).toBeNull();
    expect(parsed.totalAmount).toBe(1000076);
  });

  it('should parse investment decimals as strings and money as cents', () => {
    const parsed = investmentOutputSchema.parse({
      id: uuid,
      connectionId: uuid,
      externalId: 'inv-1',
      source: 'PLUGGY',
      name: 'CDB',
      code: null,
      isin: null,
      number: null,
      type: 'FIXED_INCOME',
      subtype: 'CDB',
      status: 'ACTIVE',
      currencyCode: 'BRL',
      balance: 200000,
      amount: 250000,
      amountOriginal: 100000,
      amountProfit: null,
      amountWithdrawal: 200000,
      taxes: null,
      taxes2: null,
      quantity: '1.25',
      value: '2.00',
      lastMonthRate: '0.24',
      lastTwelveMonthsRate: null,
      annualRate: '3.24',
      rate: '100',
      rateType: 'CDI',
      fixedAnnualRate: '10.5',
      issuer: 'Pluggy',
      issueDate: '2020-07-19T18:27:41.802Z',
      dueDate: null,
      gracePeriodDate: null,
      date: '2020-07-19T18:27:41.802Z',
      institutionName: null,
      ...timestamps
    });

    expect(parsed.quantity).toBe('1.25');
    expect(parsed.amountProfit).toBeNull();
    expect(parsed.balance).toBe(200000);
  });

  it('should reject a numeric investment quantity', () => {
    const result = investmentOutputSchema.safeParse({
      id: uuid,
      connectionId: uuid,
      externalId: 'inv-1',
      source: 'PLUGGY',
      name: 'CDB',
      code: null,
      isin: null,
      number: null,
      type: 'FIXED_INCOME',
      subtype: 'CDB',
      status: 'ACTIVE',
      currencyCode: 'BRL',
      balance: 200000,
      amount: 250000,
      amountOriginal: null,
      amountProfit: null,
      amountWithdrawal: null,
      taxes: null,
      taxes2: null,
      quantity: 1.25,
      value: null,
      lastMonthRate: null,
      lastTwelveMonthsRate: null,
      annualRate: null,
      rate: null,
      rateType: null,
      fixedAnnualRate: null,
      issuer: null,
      issueDate: null,
      dueDate: null,
      gracePeriodDate: null,
      date: null,
      institutionName: null,
      ...timestamps
    });

    expect(result.success).toBe(false);
  });

  it('should default additive account source fields for existing payloads', () => {
    const parsed = accountOutputSchema.parse({
      id: uuid,
      name: 'Main',
      balance: 1000,
      userId: uuid,
      ...timestamps
    });

    expect(parsed.source).toBe('MANUAL');
    expect(parsed.overriddenFields).toEqual([]);
    expect(parsed.hiddenAt).toBeNull();
  });

  it('should default additive transaction provider fields without changing amount', () => {
    const parsed = transactionOutputSchema.parse({
      id: uuid,
      userId: uuid,
      accountId: uuid,
      categoryId: null,
      cardId: null,
      invoiceId: null,
      transferGroupId: null,
      seriesId: null,
      occurrenceNumber: null,
      seriesType: null,
      seriesTotalOccurrences: null,
      description: 'Salary',
      type: 'INCOME',
      amount: 1234,
      date: '2026-08-01',
      competenceDate: null,
      isPaid: true,
      isProjected: false,
      invoicePaymentMonth: null,
      ...timestamps
    });

    expect(parsed.amount).toBe(1234);
    expect(parsed.source).toBe('MANUAL');
    expect(parsed.providerStatus).toBeNull();
    expect(parsed.cashFlowRole).toBe('NORMAL');
  });

  it('should default cash-flow forecast metadata without changing totals', () => {
    const parsed = monthlySummaryOutputSchema.parse({
      month: '2026-08',
      incomeTotal: 100,
      expenseTotal: 40,
      netTotal: 60,
      income: [],
      expenses: [],
      cardInvoices: []
    });

    expect(parsed.incomeTotal).toBe(100);
    expect(parsed.cardInvoices).toEqual([]);
  });

  it('should parse an invoice with an empty payments array', () => {
    const parsed = invoiceOutputSchema.parse({
      id: uuid,
      userId: uuid,
      creditCardId: uuid,
      startsOn: '2026-08-01',
      endsOn: '2026-08-31',
      dueOn: '2026-09-10',
      status: 'OPEN',
      amount: 88262,
      paidAt: null,
      paidAmount: 0,
      paymentTransactionId: null,
      paidFromAccountId: null,
      payments: [],
      ...timestamps
    });

    expect(parsed.payments).toEqual([]);
    expect(parsed.providerBillId).toBeNull();
    expect(parsed.source).toBe('MANUAL');
  });

  it('should parse an invoice with a populated payment', () => {
    const parsed = invoiceOutputSchema.parse({
      id: uuid,
      userId: uuid,
      creditCardId: uuid,
      startsOn: '2026-08-01',
      endsOn: '2026-08-31',
      dueOn: '2026-09-10',
      status: 'PAID',
      amount: 2500,
      paidAt: '2026-09-10T12:00:00.000Z',
      paidAmount: 2500,
      paymentTransactionId: uuid,
      paidFromAccountId: uuid,
      source: 'PLUGGY',
      providerBillId: uuid,
      payments: [
        {
          id: uuid,
          amount: 2500,
          paymentDate: '2026-09-10',
          transactionId: uuid
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          amount: 1000,
          paymentDate: '2026-09-11',
          transactionId: null
        }
      ],
      ...timestamps
    });

    expect(parsed.payments).toHaveLength(2);
    expect(parsed.payments[0]).toEqual({
      id: uuid,
      amount: 2500,
      paymentDate: '2026-09-10',
      transactionId: uuid
    });
    expect(parsed.payments[1]?.transactionId).toBeNull();
    expect(parsed.providerBillId).toBe(uuid);
  });

  it('should parse a monthly summary card invoice with invoiceId', () => {
    const parsed = monthlySummaryOutputSchema.parse({
      month: '2026-09',
      incomeTotal: 0,
      expenseTotal: 0,
      netTotal: 0,
      income: [],
      expenses: [],
      cardInvoices: [
        {
          cardId: uuid,
          invoiceId: uuid,
          cardName: 'Nubank',
          paymentMonth: '2026-09',
          total: 89010,
          isFullyPaid: false,
          transactions: []
        }
      ]
    });

    expect(parsed.cardInvoices[0]?.invoiceId).toBe(uuid);
    expect(parsed.cardInvoices[0]?.total).toBe(89010);
  });
});
