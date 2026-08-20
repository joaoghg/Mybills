# transactions Specification

## Purpose

Defines how users create, update, and view transactions, including optional income competence dates used for cash-flow attribution without changing the occurrence date.

## Requirements

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

### Requirement: Imported transactions retain provider identity and settlement state
The system SHALL persist each imported transaction using a stable connection-scoped provider identifier and expose `source`, provider settlement status, provider category, currency code, and whether local overrides exist. Pluggy `CREDIT` movements SHALL map to `INCOME`, `DEBIT` movements SHALL map to `EXPENSE`, and the amount exposed through existing transaction contracts MUST be a positive integer number of cents.

#### Scenario: Import a posted debit
- **GIVEN** Pluggy returns a posted debit of `12.34` BRL for a bank account
- **WHEN** the transaction is synchronized
- **THEN** MyBills exposes one imported `EXPENSE` of `1234` cents with provider status `POSTED` and currency `BRL`

#### Scenario: Synchronize the same transaction again
- **GIVEN** an imported transaction already stored for its connection and provider identifier
- **WHEN** a later synchronization returns the same transaction
- **THEN** the existing transaction is updated idempotently and no duplicate is created

### Requirement: Imported transaction edits do not mutate provider balances
The system SHALL treat imported account balances as provider snapshots. Updating an imported transaction, changing a local paid override, hiding it, or restoring it MUST NOT increment, decrement, reverse, or recompute the imported account's canonical balance. Manual transactions on manual accounts SHALL retain their existing balance behavior.

#### Scenario: Edit imported transaction amount
- **GIVEN** an imported expense linked to a provider-backed account
- **WHEN** the owner applies a local amount override
- **THEN** the effective transaction amount changes while the provider account balance remains unchanged

#### Scenario: Toggle paid state on an imported transaction
- **GIVEN** an imported transaction whose provider settlement status is stored separately
- **WHEN** the owner changes its local paid override
- **THEN** MyBills persists the override without changing provider status or account balance

#### Scenario: Manual transaction behavior remains unchanged
- **GIVEN** a paid manual transaction on a manual account
- **WHEN** the owner updates or deletes it
- **THEN** the existing local-ledger balance reversal and reapplication rules still apply

### Requirement: Provider and local categories remain distinct
The system MUST retain Pluggy category identifiers and names without treating them as MyBills category UUIDs. The owner MAY assign a compatible local category override. Removing that override SHALL restore the provider category for display without creating or deleting a local category.

#### Scenario: Import a non-UUID Pluggy category
- **GIVEN** Pluggy returns category ID `05000000`
- **WHEN** the transaction is synchronized
- **THEN** the transaction is stored successfully without using that value as a local category foreign key

#### Scenario: Assign a local category
- **GIVEN** an imported expense with a provider category
- **WHEN** the owner selects an expense-compatible MyBills category
- **THEN** the effective response uses the local category while retaining the provider category

### Requirement: Imported transfer and card metadata are preserved
The system SHALL retain provider payment participants, payment method, merchant, operation type, same-day order, and credit-card metadata when supplied. Imported bank movements MUST NOT be converted into synthetic transfer pairs, installment series, or recurring projections as a synchronization side effect.

#### Scenario: Import both legs of a bank transfer
- **GIVEN** Pluggy returns matching debit and credit movements from two provider-backed accounts
- **WHEN** both accounts are synchronized
- **THEN** MyBills stores both provider movements without creating additional balance-changing transfer rows

#### Scenario: Import an installment card purchase
- **GIVEN** Pluggy returns a card transaction with installment and bill metadata
- **WHEN** the transaction is synchronized
- **THEN** MyBills retains the provider installment and bill association without creating a local installment series

### Requirement: Imported card movements persist invoice assignment
When Open Finance projects a credit-card purchase or refund onto `transactions`, the system SHALL set `invoiceId` using stable ids: the card via `transactions.card_id` / `credit_cards.open_finance_account_id`, then the invoice already linked to the canonical `bill_id` when present, otherwise the card's unbilled OPEN invoice. `GET /transactions?invoiceId=` MUST return those rows for the owning user without joining canonical Open Finance tables at read time. Card-bill payments (`cashFlowRole` CARD_PAYMENT) MUST NOT receive that invoice as a purchase assignment.

#### Scenario: Purchase is listed by invoiceId
- **GIVEN** an imported 5000-cent card purchase synchronized into OPEN invoice `inv-1`
- **WHEN** the owner lists transactions with `invoiceId` `inv-1`
- **THEN** the purchase is included and `invoiceId` is `inv-1`

#### Scenario: Card-bill payment is not a purchase on the invoice
- **GIVEN** a synchronized card-bill payment for the same cycle as `inv-1`
- **WHEN** the owner lists transactions with `invoiceId` `inv-1` and type EXPENSE
- **THEN** the payment is not included as an invoice purchase

### Requirement: Summary attribution does not require canonical transaction joins
`GET /transactions/summary` MUST attribute imported card purchases using the assigned invoice's `dueOn` month (via `invoiceId`). It MUST NOT require `open_finance_transactions.bill_forecast_month` at read time.

#### Scenario: Forecast purchase lands in due month via invoice
- **GIVEN** an imported pending purchase assigned to an invoice due October 2026
- **WHEN** the owner requests the October 2026 summary
- **THEN** the purchase appears under that invoice's `cardInvoices` entry
