## ADDED Requirements

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
