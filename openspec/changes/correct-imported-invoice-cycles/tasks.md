## 1. Imported card closing and due days

- [x] 1.1 Stop defaulting missing `balanceCloseDate` to day 31 / `closingOnLastDay` in `upsertCardProjection` (`prisma-open-finance-canonical.repository.ts`). Set `dueDay` from `balanceDueDate`; set closing from `balanceCloseDate` only when present (last-day flag only if that date is the last calendar day of its month); on create with null close date use temporary `closingDay = dueDay` and `closingOnLastDay: false`. Honor `overriddenFields`.
- [x] 1.2 Add `refreshImportedCardCycleDays` (same repository or `project-imported-invoices.ts`) that, after `upsertBills` for an account, derives `closingDay` / `closingOnLastDay` / `dueDay` from account dates or bill closing/due history per design.md, then writes the credit card when those fields are not overridden.
- [x] 1.3 Unit-test derivation in `apps/api/src/modules/open-finance/test/`: null close + bills all day 4 → `closingDay` 4 and not last-day; null close + month-end bill closings → last-day; `balanceDueDate` day 12 → `dueDay` 12.

## 2. Imported invoice cycle dates

- [x] 2.1 Add half-open imported cycle helpers (inclusive `getCycleContainingDate` → stored `startsOn` = start, `endsOn` = next closing day) used only for `source = PLUGGY`. For a bill, anchor on the day before `closingOn` and persist `endsOn = closingOn`, `dueOn = bill.dueOn`.
- [x] 2.2 Change `cycleDatesFromAccount` so unbilled `dueOn` is `getInvoiceDueYmd(closingDay, dueDay, dateInCycle)`, never the account’s full `balanceDueDate`.
- [x] 2.3 Unit-test Nubank billed bounds 2026-07-04 / 2026-08-04 / 2026-08-11 and Bradesco unbilled due 2026-09-12 given `dueDay` 12 and last-day closing on 2026-08-19.

## 3. One unbilled invoice per cycle

- [x] 3.1 Replace `findUnbilledOpenInvoice` / `ensureUnbilledOpenInvoice` with ensure-by-`(creditCardId, endsOn)` in `project-imported-invoices.ts`. Recalc `amount` only on unbilled rows. Handle `endsOn` unique collisions per design.md.
- [x] 3.2 Point bill merge step (3) at the unbilled invoice whose cycle contains the bill closing date, not any OPEN row. Keep merge order (1) `openFinanceBillId` (2) purchases with that `bill_id`.
- [x] 3.3 Assign purchases/refunds: canonical bill invoice, else unbilled invoice whose `dueOn` year-month equals `billForecastMonth`, else cycle containing `transaction.date` (create if missing). Skip `CARD_PAYMENT` for purchase assignment. Pass forecast month from `upsertTransactions`.
- [x] 3.4 Select `openInvoice` in `prisma-credit-card.repository.ts` as the imported invoice with `startsOn <= todayUtc < endsOn` (not `findFirst` OPEN). Leave manual ensure-on-read unchanged.

## 4. Payment ledger settlement

- [x] 4.1 Rewrite `upsertInvoicePaymentsFromBill` and `maybeRecordCardPaymentLedger` to match cents to the unpaid invoice they settle (exact remaining, prefer latest `dueOn` on or before payment date; prefer the bill’s own invoice when payment equals that bill total). Deduplicate same cents within ±1 day. Skip inserts that would make `paidAmount` exceed `amount`.
- [x] 4.2 Stop `attachBillToInvoice` from forcing `CLOSED` when `paidAmount >= amount`. Keep `PAID` after a covering ledger and after bill reattach.

## 5. Tests

- [x] 5.1 Extend `apps/api/src/modules/open-finance/test/project-imported-invoices.spec.ts` for: per-cycle unbilled invoices (current + future installment); bill not absorbing the next cycle; Nubank-style prior `CARD_PAYMENT` not added to the next invoice; Bradesco-style two bill payments allocated to two invoices; `PAID` survives reattach.
- [x] 5.2 Update credit-card repository/service tests so imported `openInvoice` is the cycle containing today when multiple OPEN rows exist.
- [x] 5.3 Run `pnpm --filter api test -- --testPathPatterns=project-imported-invoices` and `credit-cards`. Add or adjust e2e under `apps/api/test/` only if GET invoices / `openInvoice` assertions would otherwise fail.
