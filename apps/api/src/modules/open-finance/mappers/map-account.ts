import type { Account as PluggyAccount } from 'pluggy-sdk';
import { Prisma, ProviderAccountType } from 'src/generated/prisma/client';
import { optionalProviderAmountToCents, providerAmountToCents, toIsoString } from './money';
import { redactRawPayload } from './redact-raw-payload';

export type MappedProviderAccount = {
  externalId: string;
  type: ProviderAccountType;
  subtype: string | null;
  name: string;
  currencyCode: string | null;
  balance: Prisma.Decimal;
  availableBalance: Prisma.Decimal | null;
  creditLimit: Prisma.Decimal | null;
  availableCreditLimit: Prisma.Decimal | null;
  brand: string | null;
  providerStatus: string | null;
  closingDate: Date | null;
  dueDate: Date | null;
  providerCreatedAt: Date | null;
  providerUpdatedAt: Date | null;
  rawPayload: Prisma.InputJsonValue;
  projectionBalanceCents: number;
  projectionLimitCents: number;
  projectionAvailableLimitCents: number | null;
};

export function mapPluggyAccount(account: PluggyAccount): MappedProviderAccount {
  const credit = account.creditData;
  const type: ProviderAccountType = account.type === 'CREDIT' ? 'CREDIT' : 'BANK';
  const balance = new Prisma.Decimal(account.balance);

  return {
    externalId: account.id,
    type,
    subtype: account.subtype ?? null,
    name: account.name,
    currencyCode: account.currencyCode ?? null,
    balance,
    availableBalance: account.bankData?.closingBalance != null
      ? new Prisma.Decimal(account.bankData.closingBalance)
      : null,
    creditLimit: credit?.creditLimit != null ? new Prisma.Decimal(credit.creditLimit) : null,
    availableCreditLimit:
      credit?.availableCreditLimit != null ? new Prisma.Decimal(credit.availableCreditLimit) : null,
    brand: credit?.brand ?? null,
    providerStatus: credit?.status ?? null,
    closingDate: credit?.balanceCloseDate ? new Date(credit.balanceCloseDate) : null,
    dueDate: credit?.balanceDueDate ? new Date(credit.balanceDueDate) : null,
    providerCreatedAt: toIsoString(
      (account as PluggyAccount & { createdAt?: Date }).createdAt
    )
      ? new Date((account as PluggyAccount & { createdAt?: Date }).createdAt as Date)
      : null,
    providerUpdatedAt: toIsoString(
      (account as PluggyAccount & { updatedAt?: Date }).updatedAt
    )
      ? new Date((account as PluggyAccount & { updatedAt?: Date }).updatedAt as Date)
      : null,
    rawPayload: redactRawPayload(account) as Prisma.InputJsonValue,
    projectionBalanceCents: providerAmountToCents(account.balance),
    projectionLimitCents: credit?.creditLimit != null ? providerAmountToCents(credit.creditLimit) : 0,
    projectionAvailableLimitCents: optionalProviderAmountToCents(credit?.availableCreditLimit ?? null)
  };
}

export { toIsoString };
