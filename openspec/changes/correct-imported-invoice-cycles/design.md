## Context

See proposal.md for why. Imported invoices already persist from `project-credit-card-invoices`. Projection lives in `apps/api/src/modules/open-finance/lib/project-imported-invoices.ts` and `PrismaOpenFinanceCanonicalRepository` (`upsertCardProjection`, `upsertBills`, `upsertTransactions`). Card reads pick `openInvoice` in `prisma-credit-card.repository.ts` via `findFirst({ status: OPEN })`. Cycle math is in `packages/utils/src/billing-cycle.ts` (inclusive `[closingDay, nextClosingDay - 1]`).

Pluggy account `creditData` has optional `balanceCloseDate` / `balanceDueDate` only — no `closingDay`. Bills carry `billClosingDate` / `dueDate`. `bill.payments` on cycle N+1 often settle cycle N ([Credit Card Bills](https://docs.pluggy.ai/docs/credit-card-bills)). Pending installments include `creditCardMetadata.billForecastDate` (due month) and a future `date`.

Constraints: no DTO/API shape change; do not edit `project-credit-card-invoices`; do not change manual invoice assignment; `overriddenFields` on `credit_cards` still wins for user-edited `closingDay` / `dueDay`.

## Goals / Non-Goals

**Goals:**

- Correct imported card cycle days, invoice date bounds, payment ledger allocation, and per-cycle unbilled invoices in the existing projection write path.
- Keep `openInvoice` a single current-cycle summary on card DTOs.
- Make imported stored ranges half-open without changing manual-card inclusive persistence.

**Non-Goals:**

- Prisma migration, new endpoints, mobile UI, or converting provider installments into `TransactionSeries`.
- Changing `getCycleContainingDate` semantics for manual cards.

## Decisions

### 1. Derive cycle days after bills exist, not from a missing close date

`upsertCardProjection` today does `closingDate?.getUTCDate() ?? 31` and `closingOnLastDay: closingDay >= 28`. Accounts are upserted **before** bills, so bills are not available on first insert.

**Do this:**

1. On account upsert: set `dueDay` from `balanceDueDate` (UTC day). If `balanceCloseDate` is present, set `closingDay` / `closingOnLastDay` from that date (`closingOnLastDay` only when that date is the last calendar day of its month). If close date is null, **do not** force last-day; on create use a temporary `closingDay` equal to `dueDay` and `closingOnLastDay: false`.
2. After `upsertBills` for that Open Finance account, `refreshImportedCardCycleDays` unless `overriddenFields` contains `closingDay` / `dueDay`:
   - `dueDay`: account due day if present, else mode of bill `dueOn` days.
   - `closingDay` / `closingOnLastDay`: account close day if present; else if a majority of bill `closingOn` dates are the last calendar day of their month (or the day before when the last day is a weekend — treat “last 3 calendar days” as last-day **only when they vary by month** and are not a single fixed day like 4), set last-day; else mode of closing days (Nubank → 4).

**Alternative:** wait to create the card until bills arrive. Rejected — bank projection and FKs already need the card during the same sync.

**Alternative:** keep last-day as the null close-date default. Rejected — that is the production bug.

### 2. Persist imported invoices as half-open cycles; leave manual inclusive

Imported `startsOn` = cycle start (closing day). Imported `endsOn` = next closing day. Purchases with `date >= endsOn` belong to the next invoice. Unique `(creditCardId, endsOn)` still identifies a cycle.

Implement with helpers next to `project-imported-invoices.ts` (or a thin wrapper in `packages/utils`) that convert `getCycleContainingDate`’s inclusive `{ start, end }` to `{ startsOn: start, endsOn: addOneCalendarDay(end) }` **only for PLUGGY invoices**. Do not change manual `ensureInvoiceForCardDate`.

For a billed cycle, anchor on the day **before** `bill.closingOn` so `getCycleContainingDate` returns the closed cycle, then store `endsOn = bill.closingOn`.

Unbilled `dueOn` = `getInvoiceDueYmd(closingDay, dueDay, dateInCycle)` — never `account.dueDate` as a full timestamp.

**Alternative:** change shared inclusive math for all cards. Rejected — out of scope for manual cards.

### 3. One unbilled invoice per `endsOn`, not per card

Replace `findUnbilledOpenInvoice` (single OPEN + null bill) with `ensureUnbilledInvoiceForCycle(card, endsOn)` keyed by `(creditCardId, endsOn)`. Recalc `amount` only for invoices with `openFinanceBillId` null.

Bill merge step (3) is the unbilled row whose cycle contains `bill.closingOn`, not “any” OPEN row. Card `openInvoice` is `startsOn <= todayUtc < endsOn` (imported half-open). If none, null (no read-side create for PLUGGY).

Assignment order for a purchase/refund: canonical `bill_id` invoice → else invoice whose `dueOn` year-month equals `billForecastMonth` → else cycle containing `transaction.date`.

### 4. Settle payments onto the invoice they pay

Pluggy documents that `payments` on bill N+1 often settle bill N. Nubank also puts a `FULL_PAYMENT` equal to **this** bill’s total on the same bill. Matching must handle both.

For each canonical bill payment and each `CARD_PAYMENT` (cents, payment date):

1. If a ledger row already exists on this card with same cents and `paymentDate` within ±1 calendar day, attach `openFinanceBillPaymentId` / `transactionId` and stop.
2. Else pick the unpaid imported invoice on that card whose remaining (`amount - paidAmount`) equals the payment cents, preferring the latest `dueOn` **on or before** the payment date. If the payment equals the bill’s own `totalAmount` and that bill’s invoice is unpaid, prefer that invoice.
3. Else skip (do not insert). Never insert when remaining would go negative.

`refreshInvoicePaidState` runs after ledger writes. `attachBillToInvoice` MUST NOT force `CLOSED` when `paidAmount >= amount`.

**Alternative:** always apply `bill.payments` to the previous invoice. Rejected — Nubank same-bill full payment would overpay July.

**Alternative:** cap `paidAmount` at `amount` while keeping extra rows. Rejected — the extra rows are the bug; they belong elsewhere or nowhere.

### 5. Correct existing rows via projection, then resync

No schema migration. After deploy, a full sync (or financial-data cutover + enqueue sync, user already acceptable) rewrites imported invoice dates, ledger, and `invoiceId`s. Reconcile updates `startsOn`/`endsOn` in place when unique allows; on `(creditCardId, endsOn)` collision, keep the row that has `openFinanceBillId` or more purchases and reassign the other row’s transactions.

## Risks / Trade-offs

- **[Card created before bills on first insert]** → Temporary `closingDay = dueDay`; overwritten in the same sync after bills. Mitigate by running `refreshImportedCardCycleDays` before invoice date writes.
- **[Last-day vs business-day Bradesco closings (26–30)]** → Majority “near month end and not a fixed day” → `closingOnLastDay`. If a bank closes on a fixed 28, mode 28 + `closingOnLastDay` false is correct.
- **[Half-open imported vs inclusive manual]** → `openInvoice` query for PLUGGY uses `< endsOn`; manual keeps `<= endsOn` / existing helpers. Document in repository mapping.
- **[Forecast month vs date disagree]** → Spec prefers `billForecastMonth` when there is no `bill_id`.
- **[Stale invoices until resync]** → Call out in apply tasks: resync MeuPluggy after shipping.

## Migration Plan

1. Ship API projection + unit tests (no DTO/Prisma change).
2. Resync imported connections (cutover of financial tables optional if unique collisions appear).
3. Rollback: revert projection; old catch-all OPEN behavior returns; canonical bills unchanged.

## Open Questions

None that block specs or tasks. Weekend-shifted Bradesco closings are covered by the last-day heuristic above.
