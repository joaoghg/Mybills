## Context

See `proposal.md` for motivation. Today:

- Manual cards persist `invoices` via `ensureInvoiceForCardDate` and keep `amount` by adjusting cents when purchases are attached (`apps/api/src/modules/credit-cards/lib/invoice-assignment.ts`).
- Imported cards skip that path. Sync writes `open_finance_bills` but not `invoices` (`openspec/changes/integrate-meu-pluggy-open-finance` decision 6.4 / 7.2).
- `PrismaCreditCardRepository.findLatestProviderBillAsInvoice` maps the latest canonical bill into a fake invoice on **read**.
- `GET /transactions/summary` groups projection `transactions` by `billForecastMonth` (join to `open_finance_transactions`) or local due month.
- Pay-invoice writes `paymentTransactionId` / `paidAmount` on `invoices` and is blocked for `source = PLUGGY`.

Invoice DTOs already carry additive provider fields (`source`, `providerBillId`, `payments` not yet). Prisma `Invoice` still has a single payment pointer and no source/link columns.

## Goals / Non-Goals

**Goals:**

- One write path that upserts `invoices` + `invoice_payments` from sync (imported) and from existing manual assignment/pay.
- One read path: credit-card, invoice list, summary, and mobile sheet use `invoices` / `transactions.invoiceId` only.
- Recalculate imported OPEN `amount` from assigned purchase/refund projection rows; freeze to bill total once a canonical bill is linked.

**Non-Goals:**

- Do not restate proposal non-goals (investments, `account.balance` as amount, finance-charge tables, pay-invoice on PLUGGY).
- Do not delete canonical `open_finance_bills` or `GET /open-finance/credit-cards/:id/bills` (unused by product UI).
- Do not route imported projection through `TransactionsService.create` / `payInvoice` (those mutate manual balances).

## Decisions

### 1. Project bills into `invoices`; keep canonical bills

Sync continues to upsert `open_finance_bills`. After a successful CREDIT_CARDS (and transaction) product pull, projection reconciles invoices for that card.

**Alternative:** read-only adapter forever. Rejected — OPEN cycles never appear as bills, and `openInvoice.id` leaked bill ids.

**Alternative:** drop canonical bills. Rejected — loses payments/charges/raw payload needed for merge and future IOF UI.

### 2. Compose OPEN `amount` from projection card movements, not account balance

After assigning `invoiceId`, set

`amount = sum(EXPENSE) - sum(INCOME)` over assigned, non-hidden, non-`CARD_PAYMENT` projection rows.

Once `openFinanceBillId` is set, `amount` copies `OpenFinanceBill.totalAmount` in cents and is not overwritten by the purchase sum.

**Alternative:** `open_finance_accounts.balance`. Rejected — used limit can include a prior unpaid cycle.

**Alternative:** sum `open_finance_transactions` at request time. Rejected — product reads must stay on mirror tables.

### 3. Link card and invoice by foreign keys, not due dates

```
open_finance_bills.account_id
        → open_finance_accounts.id
        → credit_cards.open_finance_account_id
        → invoices.credit_card_id
        → transactions.card_id

open_finance_transactions.bill_id → open_finance_bills
invoices.open_finance_bill_id     → open_finance_bills (unique when set)
transactions.invoice_id           → invoices
```

Card resolution is always `bills.account_id` = `credit_cards.open_finance_account_id`. Cycle resolution, in order:

1. Invoice with `openFinanceBillId` = this bill.
2. Projection purchases on that card whose canonical `bill_id` is this bill (`invoiceId` they already have).
3. The card’s single OPEN invoice with `openFinanceBillId` null (unbilled running cycle).
4. Create an invoice on that card and set `openFinanceBillId`.

Copy `dueOn` / `endsOn` from the account or bill as **display/cycle fields** (and for summary month). Do not use date equality to find the row.

Imported uniqueness is `invoices.open_finance_bill_id`. Keep `(creditCardId, endsOn)` for manual cards; imported OPEN unbilled rows use `endsOn` from the account close/due date only so that unique still holds.

**Alternative considered:** match `invoices.dueOn` to `bill.dueDate`. Rejected — dates can disagree with the account snapshot and are unnecessary given the FK graph.

### 4. `invoice_payments` is the ledger; `paymentTransactionId` is derived

Prisma model `InvoicePayment`: `invoiceId`, `amount` (cents), `paymentDate`, `transactionId?`, `openFinanceBillPaymentId?` (unique when set), `source`.

Manual `payInvoice` in `apps/api/src/modules/credit-cards/repositories/prisma/prisma-credit-card.repository.ts` inserts a row linked to the bank expense. Mapping fills `paidAmount`, `payments[]`, and `paymentTransactionId` (latest non-null `transactionId`) so existing clients keep working.

Imported bill payments upsert by `openFinanceBillPaymentId`. Bank `CARD_PAYMENT` transactions stay classified out of cash-flow; they are not also inserted as a second payment unless there is no bill-payment row (avoid double count). Prefer canonical bill payments when both exist.

### 5. Assign `invoiceId` in canonical→projection upsert

Extend `PrismaOpenFinanceCanonicalRepository.upsertTransactions` (`apps/api/src/modules/open-finance/repositories/prisma/prisma-open-finance-canonical.repository.ts`):

1. Resolve the credit card from the OF account id (`openFinanceAccountId`).
2. If the movement has `billExternalId`, ensure/merge the invoice linked to that bill (steps in decision 3) and assign `invoiceId`.
3. Else assign the card’s unbilled OPEN invoice (create if missing). Copy due/close dates from the provider account onto that invoice as fields, not as a lookup key.
4. Skip `CARD_PAYMENT` for purchase assignment.
5. Recalc OPEN unbilled `amount` for touched invoices.

Remove the summary join on `openFinanceTransaction.billForecastMonth` in `apps/api/src/modules/transactions/transactions.service.ts` `getMonthlySummary`: load invoices due in the month, set `total` from `amount`, nest `findAllByUserId({ invoiceId })` purchases.

### 6. Stop synthesizing invoices on card read

`ensureOpenInvoiceForCard` for `PLUGGY` loads `invoices` where `status = OPEN` (at most one). Delete `findLatestProviderBillAsInvoice`. Manual cards keep creating OPEN invoices on write (`create` card / attach purchase), not on `findAll` if we can avoid it — **keep current manual read-side ensure** to avoid a behavior change for MANUAL; only imported reads become side-effect free (already required by OF spec).

### 7. DTO / i18n

`packages/dtos` `invoiceOutputSchema`: required `payments` array (`id` uuid, `amount` int, `paymentDate` iso date, `transactionId` uuid nullable). Existing nullable provider fields stay.

API i18n: no new pay-invoice codes. Add keys only if we surface “remaining” vs total on mobile (`wallet` / `history` / `home`), mirrored pt-BR and en-US.

## Risks / Trade-offs

- **[Unbilled purchases for the next cycle while current OPEN has no bill yet]** → All no-`bill_id` card purchases go to the single unbilled OPEN invoice. If Pluggy later stamps a different `bill_id`, reassign those rows to the invoice for that bill on the next upsert.
- **[Amount jumps when the bill attaches (IOF)]** → Spec allows it; summary shows bill total; nested txs may not sum to `total`.
- **[Double payment: bill.payments + bank CARD_PAYMENT]** → Prefer bill payment rows; do not insert a second `invoice_payments` from the bank tx when a bill payment of the same cents/date exists.
- **[Existing fake openInvoice.id in client caches]** → Ids change from bill uuid to invoice uuid; React Query keys already use card id / invoice id from API.
- **[Manual invoice amount vs payments]** → Manual `amount` remains purchase sum; payments mark PAID. Same as today besides the extra ledger rows.

## Migration Plan

1. Prisma migrate: invoice source/link columns, `invoice_payments`, unique `open_finance_bill_id` on invoices (nullable).
2. Deploy API that writes invoices on sync and still accepts old invoice JSON (payments default `[]`).
3. Backfill: for each imported card, run the same projection reconcile as a full sync (or one-off script in the Open Finance scripts folder). Until backfill, `openInvoice` may be null.
4. Rollback: drop new tables/columns; summary would need the old grouping code restored. Canonical bills unchanged.

## Open Questions

None that block specs or tasks. Remaining vs total copy on mobile can reuse the existing amount if the sheet already shows `amount` only.
