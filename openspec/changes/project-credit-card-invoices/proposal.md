## Why

Imported credit-card invoices are not first-class app data: the monthly summary sums `transactions`, card reads fabricate an `openInvoice` from `open_finance_bills`, and Open Finance does not emit a bill while the cycle is open. The app should own invoices on the same projection tables it already uses for accounts and purchases, so totals, the invoice sheet, and pay-invoice all read one persisted invoice — including an OPEN row that updates throughout the month.

## What Changes

- Persist credit-card invoices in `invoices` for both manual and imported cards. Canonical `open_finance_bills` remain the provider copy; HTTP and mobile MUST NOT read them for totals or lists.
- Create an OPEN invoice for an imported card during account/transaction sync (Pluggy has no bill yet) and keep `invoices.amount` as the running total of that cycle’s card purchases/refunds on the projection `transactions` table.
- When a provider bill arrives, resolve the card via `open_finance_bills.account_id` = `credit_cards.open_finance_account_id` and merge into the invoice already linked by `openFinanceBillId` or by purchases that carry that bill’s id. The official bill total MAY replace the running amount (IOF, interest, residual). Do not match invoices by due date.
- Add `invoice_payments` as the payment ledger (same role as `open_finance_bill_payments`). Purchases/refunds compose `invoices.amount`; payments never do.
- **BREAKING:** `GET /transactions/summary` `cardInvoices[].total` SHALL come from `invoices.amount` for the invoice due in that month, not from summing the nested transactions at read time. Nested transactions remain the purchase list.
- **BREAKING:** imported `openInvoice.id` becomes the persisted `invoices.id`, not the Open Finance bill id. `GET /credit-cards/:id/invoices` returns those rows for imported cards.
- Manual pay-invoice still creates a bank `EXPENSE` transaction and decrements a manual account. It SHALL also insert `invoice_payments` instead of relying solely on `Invoice.paymentTransactionId`. Imported cards still MUST NOT be paid through this command (the provider payment arrives on sync).
- Link imported card purchases to `transactions.invoiceId` at sync time so invoice-detail queries keep working.

## Capabilities

### New Capabilities

- `credit-cards`: Invoice persistence for manual and imported cards, OPEN-cycle projection, provider-bill merge, `invoice_payments`, and pay-invoice payment rows. User-scoped by JWT; invoices belong to the current user’s cards.

### Modified Capabilities

- `cash-flow`: Monthly `cardInvoices` totals use persisted invoice amounts and due month; purchases listed are those assigned to the invoice.
- `transactions`: Imported card movements receive `invoiceId` (and stop depending on a read-time join to `open_finance_transactions` for summary attribution).

## Non-goals

- Investments, investment transactions, or projecting them into accounts.
- Reading `open_finance_*` tables from mobile or from account/card/summary HTTP handlers (sync and reset-overrides may still use canonical rows).
- Using `open_finance_accounts.balance` as `invoices.amount` (that snapshot can mix unpaid prior cycles).
- Finance-charge line items (`invoice_finance_charges`) or exposing IOF as its own UI rows.
- Allowing pay-invoice on imported (`PLUGGY`) cards, payment initiation, or writing payments back to Pluggy.
- Changing Connector 200 registration, webhooks, or investment screens.
- Folding this work into `integrate-meu-pluggy-open-finance` (that change explicitly avoided creating `Invoice` rows).

## Impact

- **api:** Credit-card and Open Finance projection/sync paths, monthly summary, pay-invoice persistence. Invoice list/get remain user-scoped via the card’s `userId` from JWT. Remove `findLatestProviderBillAsInvoice` as a read-side adapter.
- **mobile:** History summary, home/wallet current invoice, and invoice sheet consume persisted invoices and `invoiceId`-filtered purchases. Pay-invoice UI stays manual-only. Localized copy if remaining vs total is shown.
- **packages/dtos:** Invoice output gains a payments list (cents). `paymentTransactionId` MAY remain as the primary payment’s transaction id for compatibility, derived from `invoice_payments`. Document if clients must stop treating `openInvoice.id` as a provider bill id.
- **packages/api-client:** Parse extended invoice/summary shapes; no new feature module required unless a dedicated payments endpoint is added.
- **packages/theme:** No token changes expected.
- **prisma:** `invoices` columns for source/link to canonical bill; new `invoice_payments`; optional unique on imported bill link; `transactions.invoiceId` populated for imported card rows.
- **dependencies/systems:** None beyond existing PostgreSQL and Pluggy sync.
