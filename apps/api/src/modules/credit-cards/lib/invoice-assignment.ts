import {
  canPayBillingCycle,
  getCycleContainingDate,
  getInvoiceDueYmd,
  resolveClosingDay,
  utcTodayYmd
} from '@mybills/utils';
import { InvoiceStatus, Prisma, TransactionType } from 'src/generated/prisma/client';

export type InvoiceCardRef = {
  id: string;
  userId: string;
  closingDay: number;
  closingOnLastDay: boolean;
  dueDay: number;
};

export type EnsuredInvoice = {
  id: string;
  startsOn: string;
  endsOn: string;
  dueOn: string;
  status: InvoiceStatus;
};

type TxClient = Prisma.TransactionClient;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function ymdFromUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function utcDateFromYmd(ymd: string): Date {
  const parts = ymd.slice(0, 10).split('-').map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function statusForCycle(endsOn: string, todayYmd: string): InvoiceStatus {
  return canPayBillingCycle(endsOn, todayYmd) ? InvoiceStatus.CLOSED : InvoiceStatus.OPEN;
}

export async function ensureInvoiceForCardDate(
  tx: TxClient,
  card: InvoiceCardRef,
  dateYmd: string,
  todayYmd: string = utcTodayYmd()
): Promise<EnsuredInvoice> {
  const closingDay = resolveClosingDay(card);
  const cycle = getCycleContainingDate(closingDay, dateYmd);
  const dueOn = getInvoiceDueYmd(closingDay, card.dueDay, dateYmd);
  const endsOnDate = utcDateFromYmd(cycle.end);

  const existing = await tx.invoice.findUnique({
    where: {
      creditCardId_endsOn: {
        creditCardId: card.id,
        endsOn: endsOnDate
      }
    }
  });

  if (existing) {
    if (
      existing.status !== InvoiceStatus.PAID &&
      existing.status === InvoiceStatus.OPEN &&
      statusForCycle(cycle.end, todayYmd) === InvoiceStatus.CLOSED
    ) {
      const updated = await tx.invoice.update({
        where: { id: existing.id },
        data: { status: InvoiceStatus.CLOSED }
      });
      return {
        id: updated.id,
        startsOn: ymdFromUtcDate(updated.startsOn),
        endsOn: ymdFromUtcDate(updated.endsOn),
        dueOn: ymdFromUtcDate(updated.dueOn),
        status: updated.status
      };
    }

    return {
      id: existing.id,
      startsOn: ymdFromUtcDate(existing.startsOn),
      endsOn: ymdFromUtcDate(existing.endsOn),
      dueOn: ymdFromUtcDate(existing.dueOn),
      status: existing.status
    };
  }

  const created = await tx.invoice.create({
    data: {
      userId: card.userId,
      creditCardId: card.id,
      startsOn: utcDateFromYmd(cycle.start),
      endsOn: endsOnDate,
      dueOn: utcDateFromYmd(dueOn),
      status: statusForCycle(cycle.end, todayYmd),
      amount: 0
    }
  });

  return {
    id: created.id,
    startsOn: ymdFromUtcDate(created.startsOn),
    endsOn: ymdFromUtcDate(created.endsOn),
    dueOn: ymdFromUtcDate(created.dueOn),
    status: created.status
  };
}

export async function adjustInvoiceAmount(
  tx: TxClient,
  invoiceId: string,
  deltaCents: number
): Promise<void> {
  if (deltaCents === 0) {
    return;
  }

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { amount: { increment: deltaCents } }
  });
}

export async function ensureInvoicesForDates(
  tx: TxClient,
  card: InvoiceCardRef,
  dateYmds: string[],
  todayYmd: string = utcTodayYmd()
): Promise<Map<string, string>> {
  const unique = [...new Set(dateYmds.map((d) => d.slice(0, 10)))];
  const dateToInvoiceId = new Map<string, string>();

  for (const dateYmd of unique) {
    const invoice = await ensureInvoiceForCardDate(tx, card, dateYmd, todayYmd);
    dateToInvoiceId.set(dateYmd, invoice.id);
  }

  return dateToInvoiceId;
}

/**
 * Assign card expense to invoice and adjust amounts.
 * Returns invoiceId (or null when not a card expense).
 */
export async function assignCardExpenseToInvoice(
  tx: TxClient,
  params: {
    card: InvoiceCardRef | null;
    type: TransactionType;
    dateYmd: string;
    amount: number;
    previousInvoiceId?: string | null;
    previousAmount?: number;
    todayYmd?: string;
  }
): Promise<string | null> {
  const {
    card,
    type,
    dateYmd,
    amount,
    previousInvoiceId = null,
    previousAmount = 0,
    todayYmd = utcTodayYmd()
  } = params;

  if (!card || type !== TransactionType.EXPENSE) {
    if (previousInvoiceId) {
      await adjustInvoiceAmount(tx, previousInvoiceId, -previousAmount);
    }
    return null;
  }

  const invoice = await ensureInvoiceForCardDate(tx, card, dateYmd, todayYmd);

  if (previousInvoiceId && previousInvoiceId === invoice.id) {
    const delta = amount - previousAmount;
    await adjustInvoiceAmount(tx, invoice.id, delta);
    return invoice.id;
  }

  if (previousInvoiceId) {
    await adjustInvoiceAmount(tx, previousInvoiceId, -previousAmount);
  }

  await adjustInvoiceAmount(tx, invoice.id, amount);
  return invoice.id;
}

export async function detachTransactionFromInvoice(
  tx: TxClient,
  invoiceId: string | null | undefined,
  amount: number
): Promise<void> {
  if (!invoiceId) {
    return;
  }
  await adjustInvoiceAmount(tx, invoiceId, -amount);
}
