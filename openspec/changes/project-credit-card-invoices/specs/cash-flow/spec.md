## ADDED Requirements

### Requirement: Card invoice totals use persisted invoices
`GET /transactions/summary` `cardInvoices` SHALL include one entry per invoice owned by the current user whose UTC year-month of `dueOn` equals the requested month. `total` MUST equal that invoice’s persisted `amount` in cents, not a sum computed at read time from the nested transactions. Nested `transactions` MUST be the card purchases and refunds assigned to that invoice (`invoiceId`). Card-bill payments MUST NOT appear in `cardInvoices[].transactions` or in non-card `expenses`. Manual invoices keep using their persisted `amount` (still maintained from assigned purchases on write).

#### Scenario: Summary total matches invoice amount
- **GIVEN** the current user has an invoice due September 2026 with `amount` 89010 cents and assigned purchases that sum to 88262 cents
- **WHEN** they request the September 2026 summary
- **THEN** `cardInvoices` contains that card with `total` 89010 and the nested transactions are the assigned purchases only

#### Scenario: No invoice means no card invoice row
- **GIVEN** imported card purchases in August 2026 that are not assigned to any invoice due August 2026
- **WHEN** they request the August 2026 summary
- **THEN** those purchases do not create a `cardInvoices` row for that month

#### Scenario: Card-bill payment stays out of expenses
- **GIVEN** a September invoice and a synchronized card-bill payment in September
- **WHEN** they request the September 2026 summary
- **THEN** the payment is absent from `expenses` and from `cardInvoices[].transactions`
