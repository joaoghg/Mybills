## Why

Card purchases in August count in September’s cash-flow summary (invoice due month), but a same-day PIX reimbursement counts in August (`date`). Users cannot match the reimbursement to the invoice month without lying about when the money arrived.

## What Changes

- Persist optional `competenceDate` on income transactions. `null` means cash-flow uses `date`.
- Monthly summary attributes **INCOME** by `(competenceDate ?? date)` month. History listing still filters by `date`.
- Reject `competenceDate` on non-income (expense, transfer, card spend).
- Mobile create/edit: “Contabilizar em” month field for one-off income.
- History/summary subtitles when occurrence month and competence month differ.
- **Non-breaking** for clients: new optional DTO fields. Existing rows stay `null`.

## Capabilities

### New Capabilities

- `transactions`: optional competence date on income create/update/output; validation and persistence rules.
- `cash-flow`: monthly summary counts income by competence month when set; fetch window includes lookahead.

### Modified Capabilities

- (none — `openspec/specs/` has no existing requirement files)

## Impact

- **prisma**: `transactions.competence_date` nullable date.
- **packages/dtos**: `competenceDate` on create, update, and transaction output.
- **api**: transaction entity/repository/service; `GET /transactions/summary` income bucketing; domain error if field used on non-income.
- **packages/api-client**: pass field through create/update payloads and typed responses.
- **mobile**: income form month picker; history/summary i18n subtitles (pt-BR + en-US).
- **packages/theme**: none.

## Non-goals

- Link income to a specific `invoiceId`.
- Move the row to another month in History.
- Competence on expense, transfer, or card purchases.
- Competence on create of installment/recurring series.
- Change account balance by competence (cash vs accrual stay separate).
