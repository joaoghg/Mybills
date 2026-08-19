## 1. Shared contracts and DTOs

- [ ] 1.1 Add `invoicePaymentOutputSchema` (`id`, `amount` cents, `paymentDate`, `transactionId` nullable) and a required `payments` array on `invoiceOutputSchema` in `packages/dtos/src/credit-cards/output/invoice-output.dto.ts`.
- [ ] 1.2 Add `invoiceId` on `monthlySummaryCardInvoiceSchema` in `packages/dtos/src/transactions/output/monthly-summary-output.dto.ts`.
- [ ] 1.3 Export the new types from `packages/dtos/src/index.ts` and extend Zod schema tests in `apps/api/src/modules/open-finance/test/open-finance-dto.schemas.spec.ts` (or credit-card DTO specs) for `payments: []` and a populated payment.

## 2. Prisma persistence

- [ ] 2.1 Extend `Invoice` in `apps/api/prisma/schema.prisma` with `source`, nullable unique `openFinanceBillId`, and any fields already on the DTO that are still missing (`currencyCode`, `minimumPaymentAmount`, `allowsInstallments` as needed for mapping).
- [ ] 2.2 Add `InvoicePayment` mapped to `invoice_payments` with `invoiceId`, `amount` Int, `paymentDate`, nullable `transactionId`, nullable unique `openFinanceBillPaymentId`, `source`, timestamps.
- [ ] 2.3 Create the Prisma migration and run `pnpm prisma:generate` from `apps/api` (and `prisma:migrate:test` before e2e).

## 3. Invoice mapping and pay-invoice

- [ ] 3.1 Map `payments`, derived `paidAmount`, `paymentTransactionId`, `source`, and `providerBillId` in `apps/api/src/modules/credit-cards/repositories/prisma/prisma-credit-card.repository.ts` `mapInvoice` / `toOpenSummary`.
- [ ] 3.2 Insert an `invoice_payments` row in `payInvoice` linked to the bank expense; keep `PAID` / `paidAmount` / `paymentTransactionId` in sync.
- [ ] 3.3 Replace `findLatestProviderBillAsInvoice` so imported card reads load persisted `status = OPEN` invoices only (no `open_finance_bills`, no insert on GET).

## 4. Open Finance invoice projection

- [ ] 4.1 In `PrismaOpenFinanceCanonicalRepository`, resolve the card via `open_finance_account_id` and upsert at most one unbilled OPEN invoice for that card (copy due/close dates as fields only).
- [ ] 4.2 Merge canonical bills by `account_id` → card, then `openFinanceBillId` / purchases with that `bill_id` / unbilled OPEN; never match by `dueOn`; freeze `amount` to bill total cents.
- [ ] 4.3 Upsert `invoice_payments` from `OpenFinanceBillPayment` by `openFinanceBillPaymentId`; do not add a second row from a bank `CARD_PAYMENT` when a matching bill payment exists.
- [ ] 4.4 Assign `transactions.invoiceId` from card + canonical `bill_id` or the unbilled OPEN invoice; skip `CARD_PAYMENT`; recalc OPEN `amount` from assigned EXPENSE−INCOME when no bill is linked.

## 5. Monthly summary

- [ ] 5.1 Change `TransactionsService.getMonthlySummary` to load user invoices with `dueOn` in the requested month, set `total` from `invoices.amount`, set `invoiceId`, and nest purchases via `invoiceId` (no `billForecastMonth` join).
- [ ] 5.2 Update `apps/api/src/modules/transactions/transactions.service.spec.ts` so card invoice totals follow persisted amount (including when it differs from the purchase sum).

## 6. API client

- [ ] 6.1 Confirm `packages/api-client` credit-card invoice and summary parsers accept `payments` and `invoiceId` through existing DTO parse (adjust only if a client bypasses the schema).

## 7. Mobile

- [ ] 7.1 Keep `use-invoice-detail.ts` on `listCreditCardInvoices` + `listTransactions({ invoiceId })`; ensure selected id comes from persisted invoices / `openInvoice.id` (no provider bill id).
- [ ] 7.2 Keep history `use-monthly-summary.ts` using `invoice.total` from the API; pass `invoiceId` through if the UI needs it to open the sheet.

## 8. i18n

- [ ] 8.1 No new API error codes. Only add mirrored pt-BR and en-US mobile keys if the invoice sheet gains a payments list or remaining-vs-total label; otherwise leave copy unchanged.

## 9. Tests

- [ ] 9.1 Unit tests in `apps/api/src/modules/credit-cards/` for pay-invoice writing `invoice_payments`, imported GET not calling bills, and 400 `open_finance.imported_invoice_payment_not_allowed`.
- [ ] 9.2 Unit tests in `apps/api/src/modules/open-finance/test/` for unbilled OPEN upsert per card, bill merge via account/bill ids without duplicates, purchase `invoiceId`, and payment ledger vs CARD_PAYMENT.
- [ ] 9.3 E2e under `apps/api/test/` covering `GET /credit-cards/:id/invoices` for the owner, 404 for a foreign card, and pay-invoice response still 201 with `payments` for a manual card.
- [ ] 9.4 After API changes: `pnpm --filter api test -- --testPathPatterns=credit-cards` and `transactions.service`; migrate test DB then focused e2e if those files changed.
