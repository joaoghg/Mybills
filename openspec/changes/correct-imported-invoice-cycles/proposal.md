## Why

Imported invoices are already persisted, but cycles, due months, paid amounts, and unbilled totals do not match the bank. Users see Nubank windows pinned to month-end, open invoices due in the already-paid month, `paidAmount` larger than `amount`, and one OPEN total that swallows future installments. This change corrects projection so each invoice is one real billing cycle.

## What Changes

- Derive imported `credit_cards.closingDay`, `closingOnLastDay`, and `dueDay` from Pluggy data (account `balanceDueDate` day; `balanceCloseDate` day when present; otherwise bill `billClosingDate` history). Stop treating a missing close date as “last day of month”.
- Compute invoice `startsOn` / `endsOn` / `dueOn` from that cycle: adjacent invoices share the closing boundary (`endsOn` of N equals `startsOn` of N+1). Purchases on the closing day belong to the next cycle.
- For unbilled cycles, take only the **day** from the account due date and place it in the cycle’s due month. Do not copy the account’s full `balanceDueDate` (that date is the last closed bill).
- Assign canonical bill payments and `CARD_PAYMENT` rows to the invoice they settle. `paidAmount` MUST NOT exceed that invoice `amount` except a genuine overpay of the same invoice. Covering payments mark `PAID` and stay `PAID`.
- Create **one invoice per billing cycle**. Unbilled purchases and future installments go to the cycle of their date (or provider forecast month), not a single catch-all OPEN row. `openInvoice` on card reads is the cycle that contains today.
- After code lands, a full Open Finance resync (or equivalent projection reconcile) rebuilds existing imported invoices.

## Non-goals

- Do not edit or reopen `project-credit-card-invoices`.
- Do not change manual-card invoice assignment, manual pay-invoice, or the ban on paying imported invoices via `POST /credit-cards/:id/pay-invoice`.
- Do not invent a Pluggy `closingDay` field; the API only sends dates.
- Do not use `open_finance_accounts.balance` as invoice `amount`.
- Do not add finance-charge UI, change DTO/API response shapes, or require a Prisma schema migration unless implementation proves the unique `(creditCardId, endsOn)` key is insufficient.
- Do not convert provider installment metadata into local `TransactionSeries`.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `credit-cards`: Unbilled invoices are per cycle, not one OPEN row per card. Card `openInvoice` is the cycle containing today. Cycle dates follow derived closing/due days. Payment ledger settles the correct invoice and never reports `paidAmount` above `amount` unless that invoice was overpaid.
- `open-finance`: Imported card projection persists closing/due **days** from provider dates or bill history; it MUST NOT default missing `balanceCloseDate` to last-day-of-month.
- `transactions`: Purchases without a canonical bill are assigned to the invoice of their billing cycle (including future cycles), not a single unbilled OPEN invoice.

## Impact

- **api**: `upsertCardProjection` and `project-imported-invoices.ts` (cycle dates, bill merge, payment ledger, per-cycle unbilled invoices); `ensureOpenInvoiceForCard` / `openInvoice` selection by cycle containing today.
- **packages/utils**: billing-cycle helpers if the stored range must be half-open (`endsOn` = next `startsOn` = closing day).
- **mobile**: no contract change; invoice list and `openInvoice` keep working. Home/wallet still show `openInvoice.amount` (now the current cycle only).
- **packages/dtos** / **packages/api-client** / **packages/theme** / **prisma**: none expected (not **BREAKING**). Unique `(creditCardId, endsOn)` already allows multiple unbilled invoices.
- **i18n**: none expected unless we add a user-visible error (then mirror pt-BR and en).
- **authz**: unchanged; projection stays scoped to the connection owner.
