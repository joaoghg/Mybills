# credit-cards Specification

## Purpose

Defines how the current user lists, views, and pays credit-card invoices, including persisted OPEN cycles for imported cards and a payment ledger in cents.

## Requirements

### Requirement: Invoices are user-scoped projection rows
`GET /credit-cards/:id/invoices` and `GET /credit-cards/:id/invoices/:invoiceId` SHALL return invoices persisted for that credit card when the card belongs to the authenticated user. Amounts MUST be integer cents. The list MUST include OPEN, CLOSED, and PAID invoices, newest `dueOn` first. A card owned by another user MUST yield 404 with the existing credit-card not-found domain error (`code` plus i18n key, mirrored in pt-BR and en).

#### Scenario: Owner lists imported invoices
- **GIVEN** an authenticated user with an imported credit card that has one OPEN invoice of 88262 cents due in the current cycle
- **WHEN** they list invoices for that card
- **THEN** the response includes that invoice `id`, `status` OPEN, `amount` 88262, and `source` PLUGGY

#### Scenario: Foreign card is not listed
- **GIVEN** an authenticated user
- **WHEN** they list invoices for a credit card they do not own
- **THEN** the API returns 404 with a not-found domain error

### Requirement: Credit-card reads use persisted open invoices
`GET /credit-cards` and `GET /credit-cards/:id` `openInvoice` SHALL be the persisted OPEN invoice for that card when one exists, otherwise null. `openInvoice.id` MUST be the `invoices.id`. Listing or getting a card MUST NOT create invoices as a read side effect and MUST NOT read `open_finance_bills` to fabricate `openInvoice`.

#### Scenario: Home uses the OPEN invoice id
- **GIVEN** an imported card with persisted OPEN invoice `inv-1` of 88262 cents
- **WHEN** the owner fetches that card
- **THEN** `openInvoice.id` is `inv-1` and `openInvoice.amount` is 88262

#### Scenario: Read does not invent an invoice
- **GIVEN** an imported card with no `invoices` row
- **WHEN** the owner fetches that card
- **THEN** `openInvoice` is null and no invoice is inserted

### Requirement: Imported OPEN invoices track the unbilled cycle
When Open Finance synchronizes an imported credit card, the system SHALL upsert exactly one OPEN invoice with no canonical bill link for that card (`credit_cards.open_finance_account_id`). `invoices.amount` MUST equal the sum in cents of assigned projection transactions that are card purchases or refunds (`EXPENSE` adds, `INCOME` subtracts). Card-bill payments MUST NOT change `invoices.amount`. Later syncs MUST update that same OPEN row rather than insert another unbilled OPEN invoice for the card.

#### Scenario: Running total after a purchase
- **GIVEN** an imported card with an OPEN invoice of 0 cents
- **WHEN** synchronization projects a posted 5000-cent card purchase onto that card with no provider bill id
- **THEN** the same invoice remains OPEN and `amount` is 5000

#### Scenario: Payment does not reduce invoice amount
- **GIVEN** an OPEN invoice of 88262 cents
- **WHEN** a card-bill payment of 88262 cents is synchronized
- **THEN** `invoices.amount` remains 88262 and an `invoice_payments` row of 88262 cents exists

#### Scenario: One unbilled OPEN invoice per imported card
- **GIVEN** an imported card that already has unbilled OPEN invoice `inv-1`
- **WHEN** synchronization runs again before any provider bill is linked
- **THEN** no second unbilled OPEN invoice is created for that card

### Requirement: Provider bills merge by account and bill identity
When a provider bill is synchronized, the system SHALL resolve the credit card with `credit_cards.open_finance_account_id` equal to the bill's `account_id`. It MUST attach the bill to an existing invoice in this order: (1) invoice already linked to that canonical bill id, (2) invoice already assigned to projection purchases whose canonical `bill_id` is that bill, (3) the card's unbilled OPEN invoice. If none exists, it SHALL create one invoice on that card. Matching MUST NOT use `dueOn` equality. The invoice MUST store a unique link to the canonical bill. `invoices.amount` MUST become the bill `totalAmount` in cents when the bill is attached. Canonical bill payments MUST upsert matching `invoice_payments` rows. The system MUST NOT create a second invoice for the same canonical bill.

#### Scenario: Open cycle becomes the closed bill
- **GIVEN** unbilled OPEN invoice `inv-1` on the card linked to provider account `acc-1`, with running amount 88262
- **WHEN** a provider bill for `acc-1` totaling 89010 cents is synchronized
- **THEN** `inv-1` is linked to that bill, `amount` is 89010, and no second invoice is created for that bill

#### Scenario: Bill without a prior OPEN row
- **GIVEN** an imported card linked to provider account `acc-1` with no invoices
- **WHEN** a provider bill for `acc-1` totaling 10000 cents is synchronized
- **THEN** one invoice exists on that card, linked to that bill, with `amount` 10000 cents

#### Scenario: Purchases already pointing at the bill win
- **GIVEN** invoice `inv-closed` on the card whose assigned purchases have canonical `bill_id` `bill-9`
- **WHEN** provider bill `bill-9` is synchronized for that account
- **THEN** `inv-closed` is linked to `bill-9` and the card's other invoices are left unlinked to `bill-9`

### Requirement: Invoice payments are a persisted ledger
Each invoice MAY have zero or more `invoice_payments` in integer cents. Invoice JSON SHALL include `payments` as an array of `{ id, amount, paymentDate, transactionId }` (`transactionId` nullable for provider-only payments). `paidAmount` MUST equal the sum of those payments. `paymentTransactionId` MUST equal the `transactionId` of the latest payment that has one, or null. An invoice is `PAID` when `paidAmount` is greater than or equal to `amount` and `amount` is greater than 0.

#### Scenario: Partial payment leaves invoice unpaid
- **GIVEN** a CLOSED invoice of 10000 cents
- **WHEN** one payment of 4000 cents is recorded
- **THEN** `paidAmount` is 4000, `status` is not PAID, and `payments` contains that row

#### Scenario: Covering payments mark PAID
- **GIVEN** a CLOSED invoice of 10000 cents with 4000 cents already paid
- **WHEN** a second payment of 6000 cents is recorded
- **THEN** `status` is PAID and `paidAmount` is 10000

### Requirement: Manual pay-invoice writes a payment row
`POST /credit-cards/:id/pay-invoice` for a `MANUAL` card SHALL keep creating one paid bank `EXPENSE` transaction in cents, decrementing that manual account, and marking the invoice purchases paid. It MUST also insert an `invoice_payments` row for the same amount and date, linked to that transaction. The command MUST still reject imported cards with invalid-argument `open_finance.imported_invoice_payment_not_allowed` (i18n mirrored). Empty invoices MUST still yield `credit_cards.invoice_empty`.

#### Scenario: Manual pay records invoice_payments
- **GIVEN** a manual CLOSED invoice of 2500 cents with unpaid card expenses totaling 2500 cents
- **WHEN** the owner pays it from a manual account they own
- **THEN** the API returns 201 Created, the invoice is PAID, `payments` has one 2500-cent row whose `transactionId` is the new account expense, and the account balance decreased by 2500

#### Scenario: Imported pay remains forbidden
- **GIVEN** an imported credit card
- **WHEN** the owner calls pay-invoice
- **THEN** the API returns 400 with `open_finance.imported_invoice_payment_not_allowed`

### Requirement: Invoice sheet lists persisted invoices and assigned purchases
When the mobile invoice sheet is open for a card, it MUST load invoices from `GET /credit-cards/:id/invoices` and purchases from `GET /transactions?invoiceId=`. Copy MUST stay localized (pt-BR and en-US). The current-invoice amount shown on home and wallet MUST use `openInvoice.amount` from the card payload when present.

#### Scenario: Sheet shows imported OPEN purchases
- **GIVEN** an imported OPEN invoice with two assigned card expenses
- **WHEN** the user opens the invoice sheet for that card
- **THEN** those two expenses are listed and the header amount matches the invoice `amount` in the user locale
