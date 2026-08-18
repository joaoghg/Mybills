import z from 'zod';

export const financialSourceSchema = z.enum(['MANUAL', 'PLUGGY']);

export const openFinanceConnectionStatusSchema = z.enum(['ACTIVE', 'DISCONNECTED']);

export const openFinanceItemStatusSchema = z.enum([
  'UPDATED',
  'UPDATING',
  'WAITING_USER_INPUT',
  'WAITING_USER_ACTION',
  'MERGING',
  'LOGIN_ERROR',
  'OUTDATED'
]);

export const openFinanceProductTypeSchema = z.enum([
  'ACCOUNTS',
  'CREDIT_CARDS',
  'TRANSACTIONS',
  'INVESTMENTS',
  'INVESTMENTS_TRANSACTIONS'
]);

export const openFinanceProductStatusSchema = z.enum([
  'PENDING',
  'SUCCESS',
  'PARTIAL',
  'FAILED',
  'UNSUPPORTED'
]);

export const openFinanceSyncTriggerSchema = z.enum(['MANUAL', 'WEBHOOK', 'STALE']);

export const openFinanceSyncRunStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'PARTIAL',
  'FAILED'
]);

export const providerTransactionStatusSchema = z.enum(['POSTED', 'PENDING']);

export const cashFlowRoleSchema = z.enum([
  'NORMAL',
  'TRANSFER',
  'CARD_PAYMENT',
  'INVESTMENT',
  'IGNORED'
]);

export const investmentTypeSchema = z.enum([
  'FIXED_INCOME',
  'SECURITY',
  'MUTUAL_FUND',
  'EQUITY',
  'ETF',
  'COE',
  'OTHER'
]);

export const investmentStatusSchema = z.enum(['ACTIVE', 'PENDING', 'TOTAL_WITHDRAWAL']);

export const investmentTransactionTypeSchema = z.enum([
  'BUY',
  'SELL',
  'TAX',
  'TRANSFER',
  'INTEREST',
  'AMORTIZATION'
]);

export const billPaymentValueTypeSchema = z.enum([
  'INSTALLMENT_PAYMENT',
  'FULL_PAYMENT',
  'OTHER_PAYMENT'
]);

export const billFinanceChargeTypeSchema = z.enum([
  'LATE_PAYMENT_REMUNERATIVE_INTEREST',
  'LATE_PAYMENT_FEE',
  'LATE_PAYMENT_INTEREST',
  'IOF',
  'OTHER'
]);

export const sanitizedPluggyErrorSchema = z.object({
  code: z.string().min(1),
  product: openFinanceProductTypeSchema.nullable(),
  i18nKey: z.string().min(1)
});

export type FinancialSource = z.infer<typeof financialSourceSchema>;
export type OpenFinanceConnectionStatus = z.infer<typeof openFinanceConnectionStatusSchema>;
export type OpenFinanceItemStatus = z.infer<typeof openFinanceItemStatusSchema>;
export type OpenFinanceProductType = z.infer<typeof openFinanceProductTypeSchema>;
export type OpenFinanceProductStatus = z.infer<typeof openFinanceProductStatusSchema>;
export type OpenFinanceSyncTrigger = z.infer<typeof openFinanceSyncTriggerSchema>;
export type OpenFinanceSyncRunStatus = z.infer<typeof openFinanceSyncRunStatusSchema>;
export type ProviderTransactionStatus = z.infer<typeof providerTransactionStatusSchema>;
export type CashFlowRole = z.infer<typeof cashFlowRoleSchema>;
export type InvestmentType = z.infer<typeof investmentTypeSchema>;
export type InvestmentStatus = z.infer<typeof investmentStatusSchema>;
export type InvestmentTransactionType = z.infer<typeof investmentTransactionTypeSchema>;
export type BillPaymentValueType = z.infer<typeof billPaymentValueTypeSchema>;
export type BillFinanceChargeType = z.infer<typeof billFinanceChargeTypeSchema>;
export type SanitizedPluggyError = z.infer<typeof sanitizedPluggyErrorSchema>;
