import { CreateCreditCardData } from '../contracts/create-credit-card-data.contract';
import {
  PayInvoiceData,
  PayInvoiceResult
} from '../contracts/pay-invoice-data.contract';
import { UpdateCreditCardData } from '../contracts/update-credit-card-data.contract';
import { CreditCard } from '../entities/credit-card.entity';

export interface CreditCardRepository {
  findAllByUserId(userId: string): Promise<CreditCard[]>;
  findByIdAndUserId(creditCardId: string, userId: string): Promise<CreditCard | null>;
  create(data: CreateCreditCardData): Promise<CreditCard>;
  update(creditCardId: string, data: UpdateCreditCardData): Promise<CreditCard>;
  delete(creditCardId: string): Promise<void>;
  /** Atomic pay: create account EXPENSE, mark card purchases paid (no extra debit). Null if empty. */
  payInvoice(data: PayInvoiceData): Promise<PayInvoiceResult | null>;
}