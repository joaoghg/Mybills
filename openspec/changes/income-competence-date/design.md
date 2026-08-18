## Context

See proposal.md for motivation. Transactions store one occurrence `date`. Listings filter on that date. Monthly summary already special-cases card expenses via computed `invoicePaymentMonth`. Non-card rows use `date.slice(0, 7)`. Need a stored override for income only.

Paths: `apps/api/prisma/schema.prisma`, `apps/api/src/modules/transactions/*`, `packages/dtos/src/transactions/*`, `packages/api-client/src/transactions/*`, `apps/mobile/src/features/transactions/screens/*`, `apps/mobile/src/features/history/hooks/*`, i18n in `apps/mobile/src/core/i18n/locales` and `apps/api/src/i18n`.

## Goals / Non-Goals

**Goals:**

- Persist nullable `competenceDate`; service validates income-only.
- Summary buckets income by competence month; expand fetch window ±2 months on `date`.
- Mobile month picker + subtitle extras; no new list-item chrome.

**Non-Goals:**

- Invoice FK, history month remapping, competence on series create.

## Decisions

### Store a date, UI is a month

- **Choice:** Prisma `@db.Date` nullable. Mobile month picker writes `YYYY-MM-01`. Same month as `date` → persist null.
- **Why:** Matches existing date columns; summary only needs year-month.
- **Alternative:** `competenceMonth` string `YYYY-MM` — less consistent with `date`.

### Normalize in the service, not only Zod

- **Choice:** Zod allows optional nullable ISO date. Service throws `InvalidArgumentError` if type is not INCOME, if schedule is not NONE on create, and clears the field when type becomes non-income.
- **Why:** Update payloads can change type independently of the field; domain errors already carry `code` + `i18nKey`.
- **Alternative:** Zod superRefine only — misses type-change clears on update.

### Expand summary date window instead of OR-query competence

- **Choice:** `buildSummaryWindow` lookback 2 months (existing) plus lookahead 2 months; then filter income by `(competenceDate ?? date)`.
- **Why:** `findAllByUserId` already filters `date`; smallest change.
- **Alternative:** Prisma `OR` on `competenceDate` in range — more precise, more repository surface.
- **Risk:** Competence more than 2 months away from `date` is missed. Accept for v1 (invoice gap is already ~2 months).

### Subtitle extras, not a badge component

- History: competence month ≠ date month → `transactions.competenceMonthLabel`.
- Summary: date month ≠ summary month → `transactions.receivedInMonthLabel`.
- Reuse `TransactionListItem` subtitle like invoice hints.

## Risks / Trade-offs

- [Competence >2 months from date omitted from summary] → Document; same class of limit as card lookback.
- [User expects History to follow summary] → Explicit copy “Contabilizado em”; listing stays on `date`.
- [Output schema gains a required-nullable field] → Clients using generated types must rebuild; runtime JSON still valid if they ignore unknown/new keys after regenerate.

## Migration Plan

1. Prisma migrate add nullable column (no backfill).
2. Deploy API then mobile.
3. Rollback: drop column after reverting API/DTOs; null-only data, no transform.
