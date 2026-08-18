import type { Investment, InvestmentTransaction } from 'pluggy-sdk';
import {
  InvestmentStatus,
  InvestmentTransactionType,
  InvestmentType,
  Prisma
} from 'src/generated/prisma/client';
import { decimalToString, optionalProviderAmountToCents, providerAmountToCents, toIsoString } from './money';
import { redactRawPayload } from './redact-raw-payload';

const INVESTMENT_TYPES = new Set<InvestmentType>([
  'FIXED_INCOME',
  'SECURITY',
  'MUTUAL_FUND',
  'EQUITY',
  'ETF',
  'COE',
  'OTHER'
]);

const INVESTMENT_STATUSES = new Set<InvestmentStatus>(['ACTIVE', 'PENDING', 'TOTAL_WITHDRAWAL']);

const INVESTMENT_TX_TYPES = new Set<InvestmentTransactionType>([
  'BUY',
  'SELL',
  'TAX',
  'TRANSFER',
  'INTEREST',
  'AMORTIZATION'
]);

export type MappedInvestment = {
  externalId: string;
  name: string;
  code: string | null;
  isin: string | null;
  number: string | null;
  type: InvestmentType;
  subtype: string | null;
  status: InvestmentStatus | null;
  currencyCode: string | null;
  balance: Prisma.Decimal;
  amount: Prisma.Decimal;
  amountOriginal: Prisma.Decimal | null;
  amountProfit: Prisma.Decimal | null;
  amountWithdrawal: Prisma.Decimal | null;
  taxes: Prisma.Decimal | null;
  taxes2: Prisma.Decimal | null;
  quantity: Prisma.Decimal | null;
  value: Prisma.Decimal | null;
  lastMonthRate: Prisma.Decimal | null;
  lastTwelveMonthsRate: Prisma.Decimal | null;
  annualRate: Prisma.Decimal | null;
  rate: Prisma.Decimal | null;
  rateType: string | null;
  fixedAnnualRate: Prisma.Decimal | null;
  issuer: string | null;
  issueDate: Date | null;
  dueDate: Date | null;
  gracePeriodDate: Date | null;
  date: Date | null;
  institutionName: string | null;
  providerCreatedAt: Date | null;
  providerUpdatedAt: Date | null;
  rawPayload: Prisma.InputJsonValue;
  balanceCents: number;
  amountCents: number;
  amountOriginalCents: number | null;
  amountProfitCents: number | null;
  amountWithdrawalCents: number | null;
  taxesCents: number | null;
  taxes2Cents: number | null;
};

export type MappedInvestmentTransaction = {
  externalId: string;
  type: InvestmentTransactionType;
  description: string | null;
  quantity: Prisma.Decimal | null;
  value: Prisma.Decimal | null;
  amount: Prisma.Decimal | null;
  netAmount: Prisma.Decimal | null;
  agreedRate: Prisma.Decimal | null;
  date: Date;
  tradeDate: Date | null;
  brokerageNumber: string | null;
  expenses: Prisma.InputJsonValue | null;
  providerCreatedAt: Date | null;
  providerUpdatedAt: Date | null;
  rawPayload: Prisma.InputJsonValue;
  quantityString: string | null;
  valueString: string | null;
  amountString: string | null;
};

function asInvestmentType(value: string | null | undefined): InvestmentType {
  if (value && INVESTMENT_TYPES.has(value as InvestmentType)) {
    return value as InvestmentType;
  }

  return 'OTHER';
}

function asInvestmentStatus(value: string | null | undefined): InvestmentStatus | null {
  if (value && INVESTMENT_STATUSES.has(value as InvestmentStatus)) {
    return value as InvestmentStatus;
  }

  return null;
}

function asInvestmentTxType(value: string | null | undefined): InvestmentTransactionType {
  if (value && INVESTMENT_TX_TYPES.has(value as InvestmentTransactionType)) {
    return value as InvestmentTransactionType;
  }

  return 'BUY';
}

function decimalOrNull(value: number | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined) {
    return null;
  }

  return new Prisma.Decimal(value);
}

export function mapPluggyInvestment(
  investment: Investment,
  institutionName: string | null
): MappedInvestment {
  return {
    externalId: investment.id,
    name: investment.name,
    code: investment.code ?? null,
    isin: investment.isin ?? null,
    number: investment.number ?? null,
    type: asInvestmentType(investment.type),
    subtype: investment.subtype ?? null,
    status: asInvestmentStatus(investment.status),
    currencyCode: investment.currencyCode ?? null,
    balance: new Prisma.Decimal(investment.balance),
    amount: new Prisma.Decimal(investment.amount ?? investment.balance),
    amountOriginal: decimalOrNull(investment.amountOriginal),
    amountProfit: decimalOrNull(investment.amountProfit),
    amountWithdrawal: decimalOrNull(investment.amountWithdrawal),
    taxes: decimalOrNull(investment.taxes),
    taxes2: decimalOrNull(investment.taxes2),
    quantity: decimalOrNull(investment.quantity),
    value: decimalOrNull(investment.value),
    lastMonthRate: decimalOrNull(investment.lastMonthRate),
    lastTwelveMonthsRate: decimalOrNull(investment.lastTwelveMonthsRate),
    annualRate: decimalOrNull(investment.annualRate),
    rate: decimalOrNull(investment.rate),
    rateType: investment.rateType ?? null,
    fixedAnnualRate: decimalOrNull(investment.fixedAnnualRate),
    issuer: investment.issuer ?? null,
    issueDate: investment.issueDate ? new Date(investment.issueDate) : null,
    dueDate: investment.dueDate ? new Date(investment.dueDate) : null,
    gracePeriodDate: null,
    date: investment.date ? new Date(investment.date) : null,
    institutionName,
    providerCreatedAt: null,
    providerUpdatedAt: null,
    rawPayload: redactRawPayload(investment) as Prisma.InputJsonValue,
    balanceCents: providerAmountToCents(investment.balance),
    amountCents: providerAmountToCents(investment.amount ?? investment.balance),
    amountOriginalCents: optionalProviderAmountToCents(investment.amountOriginal),
    amountProfitCents: optionalProviderAmountToCents(investment.amountProfit),
    amountWithdrawalCents: optionalProviderAmountToCents(investment.amountWithdrawal),
    taxesCents: optionalProviderAmountToCents(investment.taxes),
    taxes2Cents: optionalProviderAmountToCents(investment.taxes2)
  };
}

export function mapPluggyInvestmentTransaction(
  transaction: InvestmentTransaction
): MappedInvestmentTransaction {
  return {
    externalId: transaction.id,
    type: asInvestmentTxType(transaction.type),
    description: transaction.description ?? null,
    quantity: decimalOrNull(transaction.quantity),
    value: decimalOrNull(transaction.value),
    amount: decimalOrNull(transaction.amount),
    netAmount: decimalOrNull(transaction.netAmount),
    agreedRate: decimalOrNull(transaction.agreedRate),
    date: new Date(transaction.date),
    tradeDate: transaction.tradeDate ? new Date(transaction.tradeDate) : null,
    brokerageNumber: transaction.brokerageNumber ?? null,
    expenses: transaction.expenses
      ? (redactRawPayload(transaction.expenses) as Prisma.InputJsonValue)
      : null,
    providerCreatedAt: null,
    providerUpdatedAt: null,
    rawPayload: redactRawPayload(transaction) as Prisma.InputJsonValue,
    quantityString: decimalToString(transaction.quantity),
    valueString: decimalToString(transaction.value),
    amountString: decimalToString(transaction.amount)
  };
}

export { toIsoString };
