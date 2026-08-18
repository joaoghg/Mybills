import type { CreditCardBills } from 'pluggy-sdk';
import {
  BillFinanceChargeType,
  BillPaymentValueType,
  Prisma
} from 'src/generated/prisma/client';
import { optionalProviderAmountToCents, providerAmountToCents, toDateOnly, yearMonthFromDate } from './money';
import { redactRawPayload } from './redact-raw-payload';

const PAYMENT_TYPES = new Set<BillPaymentValueType>([
  'INSTALLMENT_PAYMENT',
  'FULL_PAYMENT',
  'OTHER_PAYMENT'
]);

const CHARGE_TYPES = new Set<BillFinanceChargeType>([
  'LATE_PAYMENT_REMUNERATIVE_INTEREST',
  'LATE_PAYMENT_FEE',
  'LATE_PAYMENT_INTEREST',
  'IOF',
  'OTHER'
]);

export type MappedBillPayment = {
  externalId: string;
  valueType: BillPaymentValueType;
  paymentDate: Date;
  paymentMode: string | null;
  amount: Prisma.Decimal;
  currencyCode: string;
  rawPayload: Prisma.InputJsonValue;
};

export type MappedBillFinanceCharge = {
  externalId: string;
  type: BillFinanceChargeType;
  amount: Prisma.Decimal;
  currencyCode: string;
  additionalInfo: string | null;
  rawPayload: Prisma.InputJsonValue;
};

export type MappedProviderBill = {
  externalId: string;
  dueOn: Date;
  closingOn: Date | null;
  totalAmount: Prisma.Decimal;
  minimumPaymentAmount: Prisma.Decimal | null;
  currencyCode: string;
  allowsInstallments: boolean | null;
  providerCreatedAt: Date | null;
  providerUpdatedAt: Date | null;
  rawPayload: Prisma.InputJsonValue;
  totalAmountCents: number;
  minimumPaymentAmountCents: number | null;
  dueMonth: string | null;
  payments: MappedBillPayment[];
  financeCharges: MappedBillFinanceCharge[];
};

function asPaymentType(value: string | null | undefined): BillPaymentValueType {
  if (value && PAYMENT_TYPES.has(value as BillPaymentValueType)) {
    return value as BillPaymentValueType;
  }

  return 'OTHER_PAYMENT';
}

function asChargeType(value: string | null | undefined): BillFinanceChargeType {
  if (value && CHARGE_TYPES.has(value as BillFinanceChargeType)) {
    return value as BillFinanceChargeType;
  }

  return 'OTHER';
}

export function mapPluggyBill(bill: CreditCardBills): MappedProviderBill {
  const dueOn = toDateOnly(bill.dueDate) ?? new Date();
  const currencyCode = bill.totalAmountCurrencyCode ?? 'BRL';
  const payments = (bill.payments ?? []).map((payment, index) => {
    const amount = payment.amount ?? 0;
    return {
      externalId: payment.id ?? `${bill.id}:payment:${index}`,
      valueType: asPaymentType(payment.valueType),
      paymentDate: toDateOnly(payment.paymentDate) ?? dueOn,
      paymentMode: payment.paymentMode ?? null,
      amount: new Prisma.Decimal(amount),
      currencyCode: payment.currencyCode ?? currencyCode,
      rawPayload: redactRawPayload(payment) as Prisma.InputJsonValue
    };
  });
  const financeCharges = (bill.financeCharges ?? []).map((charge, index) => {
    const amount = charge.amount ?? 0;
    return {
      externalId: charge.id ?? `${bill.id}:charge:${index}`,
      type: asChargeType(charge.type),
      amount: new Prisma.Decimal(amount),
      currencyCode: charge.currencyCode ?? currencyCode,
      additionalInfo: charge.additionalInfo ?? null,
      rawPayload: redactRawPayload(charge) as Prisma.InputJsonValue
    };
  });

  return {
    externalId: bill.id,
    dueOn,
    closingOn: toDateOnly(bill.billClosingDate),
    totalAmount: new Prisma.Decimal(bill.totalAmount),
    minimumPaymentAmount:
      bill.minimumPaymentAmount != null ? new Prisma.Decimal(bill.minimumPaymentAmount) : null,
    currencyCode,
    allowsInstallments: bill.allowsInstallments ?? null,
    providerCreatedAt: bill.createdAt ? new Date(bill.createdAt) : null,
    providerUpdatedAt: bill.updatedAt ? new Date(bill.updatedAt) : null,
    rawPayload: redactRawPayload(bill) as Prisma.InputJsonValue,
    totalAmountCents: providerAmountToCents(bill.totalAmount),
    minimumPaymentAmountCents: optionalProviderAmountToCents(bill.minimumPaymentAmount),
    dueMonth: yearMonthFromDate(dueOn),
    payments,
    financeCharges
  };
}
