# cash-flow Specification

## Purpose

Defines how monthly cash-flow totals attribute income, account expenses, and credit-card invoices to a calendar month.

## Requirements

### Requirement: Income cash-flow uses competence month when set
`GET /transactions/summary` SHALL include an income transaction in `income` and `incomeTotal` when the UTC year-month of `(competenceDate ?? date)` equals the requested month. Credit-card expenses MUST still use invoice payment month. Non-card expenses MUST still use `date`. Transfers MUST remain excluded.

#### Scenario: PIX counted in September not August
- **GIVEN** income of 5000 cents with `date` `2026-08-17` and `competenceDate` `2026-09-01` owned by the current user
- **WHEN** they request the summary for August 2026
- **THEN** that income is absent from `income` and `incomeTotal`
- **WHEN** they request the summary for September 2026
- **THEN** that income is present and `incomeTotal` includes 5000

#### Scenario: Income without competence stays on date month
- **GIVEN** income with `date` `2026-08-17` and null `competenceDate`
- **WHEN** they request the August 2026 summary
- **THEN** the income is included

#### Scenario: Card invoice month unchanged
- **GIVEN** a card expense whose invoice payment month is September 2026
- **WHEN** they request the September 2026 summary
- **THEN** the expense appears in `cardInvoices` and not as a non-card expense

### Requirement: Summary fetch covers competence outside the calendar month
The summary query MUST include income whose `date` falls up to two calendar months after the requested month when `competenceDate` falls in the requested month.

#### Scenario: Later receipt counted earlier
- **GIVEN** income with `date` `2026-10-05` and `competenceDate` `2026-09-01`
- **WHEN** they request the September 2026 summary
- **THEN** the income is included

### Requirement: Summary UI highlights occurrence month when it differs
When an income row appears in the monthly summary and the month of `date` differs from the summary month, the mobile app MUST show a localized subtitle that the amount was received in the occurrence month (pt-BR and en-US).

#### Scenario: September summary shows August origin
- **GIVEN** the September summary includes income dated August 2026
- **WHEN** the user views that row
- **THEN** the subtitle indicates it was received in August

### Requirement: Imported bank movements use provider settlement state
Monthly cash-flow SHALL include imported bank-account `CREDIT` movements as income and imported bank-account `DEBIT` movements as non-card expenses when their provider status is `POSTED`. Pending bank movements MUST remain visible in transaction history but MUST NOT contribute to realized monthly totals until Pluggy reports them as posted.

#### Scenario: Posted bank credit contributes to income
- **GIVEN** an imported posted bank credit dated in August 2026
- **WHEN** the owner requests the August 2026 summary
- **THEN** the movement contributes its effective amount to `incomeTotal`

#### Scenario: Pending bank debit is excluded
- **GIVEN** an imported pending bank debit dated in August 2026
- **WHEN** the owner requests the August 2026 summary
- **THEN** the movement does not contribute to the realized expense total

#### Scenario: Posted update starts contributing
- **GIVEN** a pending imported bank movement previously excluded from the summary
- **WHEN** synchronization changes its provider status to `POSTED`
- **THEN** the movement contributes to the summary for its effective attribution month

### Requirement: Imported card purchases use provider bill attribution
Imported credit-card debit purchases SHALL contribute to `cardInvoices` using the provider bill due month when a bill is associated. When only `billForecastDate` is available, the system SHALL use that forecast month and mark the attribution as forecast. A local amount, date, category, or visibility override MUST affect summaries without changing the provider record.

#### Scenario: Purchase linked to a provider bill
- **GIVEN** an imported card purchase associated with a bill due in September 2026
- **WHEN** the owner requests the September 2026 summary
- **THEN** the effective purchase appears once in `cardInvoices`

#### Scenario: Pending purchase has only a forecast month
- **GIVEN** an imported pending card purchase with `billForecastDate` `2026-10`
- **WHEN** the owner requests the October 2026 summary
- **THEN** the effective purchase appears once in `cardInvoices` and is identified as forecast

#### Scenario: Hidden imported purchase is excluded
- **GIVEN** an imported card purchase hidden by its owner
- **WHEN** the owner requests its attribution month
- **THEN** the purchase is excluded from rows and totals

### Requirement: Card bill payments and transfers are not double-counted
The system MUST exclude imported credit-card bill payments and recognized transfer counterparts from income and expense totals. Provider bill payments SHALL update bill payment state but MUST NOT create a synthetic expense or alter a provider-backed bank balance. Unmatched movements SHALL remain independently visible until they can be safely classified.

#### Scenario: Bank debit pays a credit-card bill
- **GIVEN** Pluggy returns card purchases, a provider bill payment, and the corresponding bank-account debit
- **WHEN** the owner requests the relevant monthly summary
- **THEN** purchases contribute once through `cardInvoices` while the bill payment and matching bank debit do not add another expense

#### Scenario: Transfer appears in two accounts
- **GIVEN** Pluggy returns a posted debit and credit recognized as counterparts of one transfer
- **WHEN** the owner requests the summary month
- **THEN** neither movement contributes to income or expense totals

#### Scenario: Transfer match is uncertain
- **GIVEN** an imported movement without sufficient provider data for safe transfer matching
- **WHEN** the owner requests the monthly summary
- **THEN** MyBills retains the movement's current classification and does not silently create a transfer pair
