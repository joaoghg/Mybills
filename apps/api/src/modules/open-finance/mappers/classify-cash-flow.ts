import { CashFlowRole, ProviderAccountType, TransactionType } from 'src/generated/prisma/client';

export type CashFlowClassification = {
  role: CashFlowRole;
  evidence: string[];
};

const CARD_PAYMENT_PATTERN =
  /(pagamento\s+d[ae]\s+fatura|pagamento\s+fatura|pagto\.?\s+fatura|pagto\.?\s+por\s+deb|gastos\s+cart[aã]o(?:\s+de\s+cr[eé]dito)?|credit\s+card\s+payment|invoice\s+payment|pagamento\s+cart[aã]o)/i;
const INVESTMENT_PATTERN = /(investimento|tesouro|cdb|lci|lca|fund|aplicacao|resgate|investment)/i;
const TRANSFER_METHOD_PATTERN = /\b(?:pix|ted|tef|doc|transfers?)\b/i;

export function classifyImportedTransaction(input: {
  description: string | null | undefined;
  categoryName: string | null | undefined;
  operationType: string | null | undefined;
  paymentMethod: string | null | undefined;
  hasBill: boolean;
  type: TransactionType;
}): CashFlowClassification {
  const evidence: string[] = [];
  const haystack = `${input.description ?? ''} ${input.categoryName ?? ''} ${input.operationType ?? ''}`;

  if (input.hasBill && CARD_PAYMENT_PATTERN.test(haystack)) {
    evidence.push('provider_bill', 'description_card_payment');
    return { role: 'CARD_PAYMENT', evidence };
  }

  if (CARD_PAYMENT_PATTERN.test(haystack)) {
    evidence.push('description_card_payment');
    return { role: 'CARD_PAYMENT', evidence };
  }

  if (INVESTMENT_PATTERN.test(haystack) && /resgate|aplicacao|investimento/i.test(haystack)) {
    evidence.push('description_investment');
    return { role: 'INVESTMENT', evidence };
  }

  if (TRANSFER_METHOD_PATTERN.test(input.paymentMethod ?? '') || TRANSFER_METHOD_PATTERN.test(haystack)) {
    evidence.push('payment_method_or_description_transfer');
    return { role: 'NORMAL', evidence };
  }

  return { role: 'NORMAL', evidence };
}

export type CounterpartCandidate = {
  id: string;
  accountId: string;
  amountCents: number;
  currencyCode: string;
  date: Date;
  type: TransactionType;
  paymentReference: string | null;
};

export function matchTransferCounterpart(
  current: CounterpartCandidate,
  others: CounterpartCandidate[]
): CounterpartCandidate | null {
  const windowMs = 3 * 24 * 60 * 60 * 1000;
  const matches = others.filter((candidate) => {
    if (candidate.id === current.id) {
      return false;
    }

    if (candidate.accountId === current.accountId) {
      return false;
    }

    if (candidate.currencyCode !== current.currencyCode) {
      return false;
    }

    if (candidate.amountCents !== current.amountCents) {
      return false;
    }

    if (candidate.type === current.type) {
      return false;
    }

    const delta = Math.abs(candidate.date.getTime() - current.date.getTime());
    if (delta > windowMs) {
      return false;
    }

    if (current.paymentReference && candidate.paymentReference) {
      return current.paymentReference === candidate.paymentReference;
    }

    return Boolean(current.paymentReference) || Boolean(candidate.paymentReference);
  });

  if (matches.length !== 1) {
    return null;
  }

  return matches[0] ?? null;
}

export type CardPaymentMatchCandidate = {
  id: string;
  accountType: ProviderAccountType;
  amountCents: number;
  date: Date;
  type: TransactionType;
  cashFlowRole: CashFlowRole;
};

const CARD_PAYMENT_MATCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function matchCardPaymentCounterpart(
  current: CardPaymentMatchCandidate,
  others: CardPaymentMatchCandidate[]
): CardPaymentMatchCandidate | null {
  if (
    current.accountType !== ProviderAccountType.BANK ||
    current.type !== 'EXPENSE' ||
    current.cashFlowRole !== 'NORMAL'
  ) {
    return null;
  }

  const matches = others.filter((candidate) => {
    if (candidate.id === current.id) {
      return false;
    }

    if (candidate.accountType !== ProviderAccountType.CREDIT) {
      return false;
    }

    if (candidate.cashFlowRole !== 'CARD_PAYMENT') {
      return false;
    }

    if (candidate.type !== 'INCOME') {
      return false;
    }

    if (candidate.amountCents !== current.amountCents) {
      return false;
    }

    const delta = Math.abs(candidate.date.getTime() - current.date.getTime());
    return delta <= CARD_PAYMENT_MATCH_WINDOW_MS;
  });

  if (matches.length !== 1) {
    return null;
  }

  return matches[0] ?? null;
}
