## MODIFIED Requirements

### Requirement: Imported card movements persist invoice assignment
When Open Finance projects a credit-card purchase or refund onto `transactions`, the system SHALL set `invoiceId` using stable ids: the card via `transactions.card_id` / `credit_cards.open_finance_account_id`, then the invoice already linked to the canonical `bill_id` when present, otherwise the unbilled invoice for the billing cycle that contains the movement’s UTC date (creating that cycle’s invoice if missing). When the provider supplies a bill forecast month and no canonical `bill_id`, the system MUST assign the movement to the unbilled invoice whose `dueOn` year-month equals that forecast month, creating it if missing. `GET /transactions?invoiceId=` MUST return those rows for the owning user without joining canonical Open Finance tables at read time. Card-bill payments (`cashFlowRole` CARD_PAYMENT) MUST NOT receive that invoice as a purchase assignment.

#### Scenario: Purchase is listed by invoiceId
- **GIVEN** an imported 5000-cent card purchase synchronized into OPEN invoice `inv-1`
- **WHEN** the owner lists transactions with `invoiceId` `inv-1`
- **THEN** the purchase is included and `invoiceId` is `inv-1`

#### Scenario: Card-bill payment is not a purchase on the invoice
- **GIVEN** a synchronized card-bill payment for the same cycle as `inv-1`
- **WHEN** the owner lists transactions with `invoiceId` `inv-1` and type EXPENSE
- **THEN** the payment is not included as an invoice purchase

#### Scenario: Pending installment lands on a later cycle invoice
- **GIVEN** an imported pending 11133-cent installment dated 2026-09-19 with bill forecast month 2026-10 and no canonical bill id
- **WHEN** the transaction is synchronized
- **THEN** its `invoiceId` is the unbilled invoice whose `dueOn` falls in October 2026, not the current-cycle invoice
