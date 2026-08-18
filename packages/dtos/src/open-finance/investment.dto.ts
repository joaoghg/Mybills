import z from 'zod';
import {
  financialSourceSchema,
  investmentStatusSchema,
  investmentTransactionTypeSchema,
  investmentTypeSchema
} from './enums';
import { currencyCodeSchema, decimalStringSchema } from './primitives';

export const investmentExpensesOutputSchema = z.object({
  serviceTax: decimalStringSchema.nullable(),
  brokerageFee: decimalStringSchema.nullable(),
  incomeTax: decimalStringSchema.nullable(),
  other: decimalStringSchema.nullable(),
  tradingAssetsNoticeFee: decimalStringSchema.nullable(),
  maintenanceFee: decimalStringSchema.nullable(),
  settlementFee: decimalStringSchema.nullable(),
  clearingFee: decimalStringSchema.nullable(),
  stockExchangeFee: decimalStringSchema.nullable(),
  custodyFee: decimalStringSchema.nullable(),
  operatingFee: decimalStringSchema.nullable()
});

export type InvestmentExpensesOutput = z.infer<typeof investmentExpensesOutputSchema>;

/**
 * Investment movement amounts/quantities/rates stay decimal strings.
 * They are not converted to integer cents.
 */
export const investmentTransactionOutputSchema = z.object({
  id: z.uuid(),
  investmentId: z.uuid(),
  externalId: z.string().min(1),
  type: investmentTransactionTypeSchema,
  description: z.string().nullable(),
  quantity: decimalStringSchema,
  value: decimalStringSchema,
  amount: decimalStringSchema,
  netAmount: decimalStringSchema.nullable(),
  agreedRate: decimalStringSchema.nullable(),
  date: z.string(),
  tradeDate: z.string(),
  brokerageNumber: z.string().nullable(),
  expenses: investmentExpensesOutputSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type InvestmentTransactionOutput = z.infer<typeof investmentTransactionOutputSchema>;

/**
 * Position money fields use integer cents plus currencyCode.
 * Quantity, quota value, and rates remain decimal strings.
 */
export const investmentOutputSchema = z.object({
  id: z.uuid(),
  connectionId: z.uuid(),
  externalId: z.string().min(1),
  source: financialSourceSchema,
  name: z.string(),
  code: z.string().nullable(),
  isin: z.string().nullable(),
  number: z.string().nullable(),
  type: investmentTypeSchema,
  subtype: z.string().nullable(),
  status: investmentStatusSchema.nullable(),
  currencyCode: currencyCodeSchema.nullable(),
  balance: z.int(),
  amount: z.int(),
  amountOriginal: z.int().nullable(),
  amountProfit: z.int().nullable(),
  amountWithdrawal: z.int().nullable(),
  taxes: z.int().nullable(),
  taxes2: z.int().nullable(),
  quantity: decimalStringSchema.nullable(),
  value: decimalStringSchema.nullable(),
  lastMonthRate: decimalStringSchema.nullable(),
  lastTwelveMonthsRate: decimalStringSchema.nullable(),
  annualRate: decimalStringSchema.nullable(),
  rate: decimalStringSchema.nullable(),
  rateType: z.string().nullable(),
  fixedAnnualRate: decimalStringSchema.nullable(),
  issuer: z.string().nullable(),
  issueDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  gracePeriodDate: z.string().nullable(),
  date: z.string().nullable(),
  institutionName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type InvestmentOutput = z.infer<typeof investmentOutputSchema>;

export const listInvestmentsOutputSchema = z.array(investmentOutputSchema);

export type ListInvestmentsOutput = z.infer<typeof listInvestmentsOutputSchema>;

export const listInvestmentTransactionsOutputSchema = z.array(investmentTransactionOutputSchema);

export type ListInvestmentTransactionsOutput = z.infer<typeof listInvestmentTransactionsOutputSchema>;

export const investmentIdParamsSchema = z.object({
  investmentId: z.uuid()
});

export type InvestmentIdParams = z.infer<typeof investmentIdParamsSchema>;
