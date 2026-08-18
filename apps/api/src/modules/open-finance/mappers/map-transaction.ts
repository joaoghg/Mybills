import type { Transaction as PluggyTransaction } from 'pluggy-sdk';
import {
  CashFlowRole,
  Prisma,
  ProviderTransactionStatus,
  TransactionType
} from 'src/generated/prisma/client';
import { classifyImportedTransaction } from './classify-cash-flow';
import { providerAmountToCents, toIsoString } from './money';
import { redactRawPayload } from './redact-raw-payload';

export type MappedProviderTransaction = {
  externalId: string;
  accountExternalId: string;
  billExternalId: string | null;
  description: string;
  type: TransactionType;
  amount: Prisma.Decimal;
  amountCents: number;
  currencyCode: string;
  date: Date;
  status: ProviderTransactionStatus;
  providerCategoryId: string | null;
  providerCategoryName: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  merchantName: string | null;
  operationType: string | null;
  sameDayOrder: number | null;
  billForecastMonth: string | null;
  creditCardMetadata: Prisma.InputJsonValue | null;
  paymentParticipants: Prisma.InputJsonValue | null;
  cashFlowRole: CashFlowRole;
  classificationEvidence: string[];
  providerCreatedAt: Date | null;
  providerUpdatedAt: Date | null;
  rawPayload: Prisma.InputJsonValue;
};

function asStatus(value: string | null | undefined): ProviderTransactionStatus {
  return value === 'PENDING' ? 'PENDING' : 'POSTED';
}

export function mapPluggyTransaction(transaction: PluggyTransaction): MappedProviderTransaction {
  const amount = Math.abs(transaction.amount);
  const type: TransactionType = transaction.type === 'CREDIT' ? 'INCOME' : 'EXPENSE';
  const paymentData = transaction.paymentData;
  const billExternalId = transaction.creditCardMetadata?.billId ?? null;
  const classification = classifyImportedTransaction({
    description: transaction.description,
    categoryName: transaction.category,
    operationType: transaction.operationType,
    paymentMethod: paymentData?.paymentMethod ?? null,
    hasBill: Boolean(billExternalId),
    type
  });

  return {
    externalId: transaction.id,
    accountExternalId: transaction.accountId,
    billExternalId,
    description: transaction.description,
    type,
    amount: new Prisma.Decimal(amount),
    amountCents: providerAmountToCents(amount),
    currencyCode: transaction.currencyCode ?? 'BRL',
    date: new Date(transaction.date),
    status: asStatus(transaction.status),
    providerCategoryId: transaction.categoryId ?? null,
    providerCategoryName: transaction.category ?? null,
    paymentMethod: paymentData?.paymentMethod ?? null,
    paymentReference: paymentData?.referenceNumber ?? null,
    merchantName: transaction.merchant?.name ?? null,
    operationType: transaction.operationType ?? null,
    sameDayOrder: null,
    billForecastMonth: transaction.creditCardMetadata?.billForecastDate ?? null,
    creditCardMetadata: transaction.creditCardMetadata
      ? (redactRawPayload(transaction.creditCardMetadata) as Prisma.InputJsonValue)
      : null,
    paymentParticipants: paymentData
      ? (redactRawPayload({
          payer: paymentData.payer,
          receiver: paymentData.receiver
        }) as Prisma.InputJsonValue)
      : null,
    cashFlowRole: classification.role,
    classificationEvidence: classification.evidence,
    providerCreatedAt: transaction.createdAt ? new Date(transaction.createdAt) : null,
    providerUpdatedAt: transaction.updatedAt ? new Date(transaction.updatedAt) : null,
    rawPayload: redactRawPayload(transaction) as Prisma.InputJsonValue
  };
}

export { toIsoString };
