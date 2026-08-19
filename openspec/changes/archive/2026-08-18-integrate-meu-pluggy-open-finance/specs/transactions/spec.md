## ADDED Requirements

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
