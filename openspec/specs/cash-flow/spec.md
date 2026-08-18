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
