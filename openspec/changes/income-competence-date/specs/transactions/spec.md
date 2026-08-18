## Purpose

Defines how users create, update, and view transactions, including optional income competence dates used for cash-flow attribution without changing the occurrence date.

## ADDED Requirements

### Requirement: Income may store an optional competence date
The system SHALL persist `competenceDate` (`YYYY-MM-DD` or null) on the authenticated user's income transactions. When `competenceDate` is omitted or null, cash-flow MUST use `date`. Account balance, paid flag, and credit-card invoice assignment MUST ignore `competenceDate`.

#### Scenario: Create income with competence in another month
- **GIVEN** an authenticated user
- **WHEN** they create an `INCOME` transaction with `date` `2026-08-17` and `competenceDate` `2026-09-01`
- **THEN** the response includes both dates and the row is persisted for that user

#### Scenario: Create income without competence
- **GIVEN** an authenticated user
- **WHEN** they create an `INCOME` transaction with only `date`
- **THEN** `competenceDate` in the response is null

### Requirement: Competence date is income-only
The system MUST reject `competenceDate` when `type` is not `INCOME` with a domain invalid-argument error (stable `code` plus i18n key, mirrored in pt-BR and en). Changing a transaction away from `INCOME` MUST clear `competenceDate`. Creating a scheduled series (`INSTALLMENT` or `RECURRING`) MUST reject or ignore `competenceDate`. Updating a single existing income occurrence MAY set `competenceDate`.

#### Scenario: Expense cannot set competence
- **WHEN** the user creates or updates an `EXPENSE` with `competenceDate` set
- **THEN** the API returns 400 with an invalid-argument domain error

#### Scenario: Type change clears competence
- **GIVEN** an income row with `competenceDate` set
- **WHEN** the user updates `type` to `EXPENSE`
- **THEN** stored `competenceDate` is null

### Requirement: History listing stays on occurrence date
`GET /transactions` month/`from`/`to` filters MUST continue to use `date`, not `competenceDate`.

#### Scenario: PIX stays in August history
- **GIVEN** income with `date` in August 2026 and `competenceDate` in September 2026
- **WHEN** the user lists transactions for August 2026
- **THEN** the income is included
- **WHEN** they list September 2026
- **THEN** the income is not included by the date filter

### Requirement: Mobile income form can set competence month
The mobile app SHALL show a localized “Contabilizar em” month control only for one-off `INCOME`. If the selected month equals the month of `date`, the client MUST send null. If months differ, the history row subtitle MUST state the competence month (pt-BR and en-US).

#### Scenario: Same month sends null
- **GIVEN** the user is creating income dated August 2026
- **WHEN** they leave competence on August 2026
- **THEN** the create payload has `competenceDate` null or omitted
