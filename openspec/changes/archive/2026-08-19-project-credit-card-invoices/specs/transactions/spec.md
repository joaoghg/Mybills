## ADDED Requirements

### Requirement: Imported card movements persist invoice assignment
When Open Finance projects a credit-card purchase or refund onto `transactions`, the system SHALL set `invoiceId` using stable ids: the card via `transactions.card_id` / `credit_cards.open_finance_account_id`, then the invoice already linked to the canonical `bill_id` when present, otherwise the card’s unbilled OPEN invoice. `GET /transactions?invoiceId=` MUST return those rows for the owning user without joining canonical Open Finance tables at read time. Card-bill payments (`cashFlowRole` CARD_PAYMENT) MUST NOT receive that invoice as a purchase assignment.

#### Scenario: Purchase is listed by invoiceId
- **GIVEN** an imported 5000-cent card purchase synchronized into OPEN invoice `inv-1`
- **WHEN** the owner lists transactions with `invoiceId` `inv-1`
- **THEN** the purchase is included and `invoiceId` is `inv-1`

#### Scenario: Card-bill payment is not a purchase on the invoice
- **GIVEN** a synchronized card-bill payment for the same cycle as `inv-1`
- **WHEN** the owner lists transactions with `invoiceId` `inv-1` and type EXPENSE
- **THEN** the payment is not included as an invoice purchase

### Requirement: Summary attribution does not require canonical transaction joins
`GET /transactions/summary` MUST attribute imported card purchases using the assigned invoice’s `dueOn` month (via `invoiceId`). It MUST NOT require `open_finance_transactions.bill_forecast_month` at read time.

#### Scenario: Forecast purchase lands in due month via invoice
- **GIVEN** an imported pending purchase assigned to an invoice due October 2026
- **WHEN** the owner requests the October 2026 summary
- **THEN** the purchase appears under that invoice’s `cardInvoices` entry
