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
`GET /credit-cards` and `GET /credit-cards/:id` `openInvoice` SHALL be the persisted invoice for that card whose cycle contains today's UTC date (`startsOn` inclusive, `endsOn` exclusive), when one exists, otherwise null. `openInvoice.id` MUST be the `invoices.id`. When several OPEN invoices exist (current cycle plus future installment cycles), `openInvoice` MUST be that current-cycle row, not a future cycle. Listing or getting a card MUST NOT create invoices as a read side effect and MUST NOT read `open_finance_bills` to fabricate `openInvoice`.

#### Scenario: Home uses the OPEN invoice id
- **GIVEN** an imported card with persisted OPEN invoice `inv-1` of 88262 cents whose cycle contains today
- **WHEN** the owner fetches that card
- **THEN** `openInvoice.id` is `inv-1` and `openInvoice.amount` is 88262

#### Scenario: Future cycle is not openInvoice
- **GIVEN** an imported card with OPEN invoice `inv-current` whose cycle contains today amounting to 150463 cents and OPEN invoice `inv-future` due the following month amounting to 11133 cents
- **WHEN** the owner fetches that card
- **THEN** `openInvoice.id` is `inv-current` and `openInvoice.amount` is 150463

#### Scenario: Read does not invent an invoice
- **GIVEN** an imported card with no `invoices` row
- **WHEN** the owner fetches that card
- **THEN** `openInvoice` is null and no invoice is inserted

### Requirement: Imported OPEN invoices track the unbilled cycle
When Open Finance synchronizes an imported credit card, the system SHALL upsert one unbilled invoice (`openFinanceBillId` null, status OPEN) **per billing cycle** that has assigned projection purchases or refunds. `invoices.amount` MUST equal the sum in cents of assigned projection transactions on **that invoice** that are card purchases or refunds (`EXPENSE` adds, `INCOME` subtracts). Card-bill payments MUST NOT change `invoices.amount`. Later syncs MUST update the unbilled row for the same cycle (`creditCardId` + `endsOn`) rather than merge distinct cycles into one catch-all OPEN invoice.

#### Scenario: Running total after a purchase
- **GIVEN** an imported card with an OPEN invoice of 0 cents for the current cycle
- **WHEN** synchronization projects a posted 5000-cent card purchase onto that card with no provider bill id whose date falls in that cycle
- **THEN** the same invoice remains OPEN and `amount` is 5000

#### Scenario: Payment does not reduce invoice amount
- **GIVEN** an OPEN invoice of 88262 cents
- **WHEN** a card-bill payment of 88262 cents is synchronized
- **THEN** `invoices.amount` remains 88262 and an `invoice_payments` row of 88262 cents exists on the invoice that payment settles

#### Scenario: One unbilled invoice per cycle
- **GIVEN** an imported card that already has unbilled OPEN invoice `inv-1` for cycle ending `2026-09-04`
- **WHEN** synchronization runs again before any provider bill is linked and projects another purchase in that same cycle
- **THEN** no second unbilled invoice is created for that cycle and `inv-1` is updated

#### Scenario: Future installment creates another cycle invoice
- **GIVEN** an imported card whose current unbilled cycle invoice `inv-aug` already has 150463 cents of purchases
- **WHEN** synchronization projects an 11133-cent pending installment whose date falls in the next cycle
- **THEN** a distinct unbilled invoice exists for that next cycle with `amount` 11133 and `inv-aug.amount` remains 150463

### Requirement: Provider bills merge by account and bill identity
When a provider bill is synchronized, the system SHALL resolve the credit card with `credit_cards.open_finance_account_id` equal to the bill's `account_id`. It MUST attach the bill to an existing invoice in this order: (1) invoice already linked to that canonical bill id, (2) invoice already assigned to projection purchases whose canonical `bill_id` is that bill, (3) the card's unbilled invoice for the billing cycle that contains the bill's closing date (due date when closing is null). If none exists, it SHALL create one invoice on that card for that cycle. Matching MUST NOT use `dueOn` equality. The invoice MUST store a unique link to the canonical bill. `invoices.amount` MUST become the bill `totalAmount` in cents when the bill is attached. The system MUST NOT create a second invoice for the same canonical bill. Canonical bill payments MUST be recorded on the invoice those payments settle (see invoice payment ledger), not blindly on the bill's own invoice when they pay a prior cycle.

#### Scenario: Open cycle becomes the closed bill
- **GIVEN** unbilled OPEN invoice `inv-1` on the card linked to provider account `acc-1`, with running amount 88262, whose cycle contains the new bill's closing date
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

#### Scenario: Bill does not absorb a different cycle's unbilled invoice
- **GIVEN** unbilled OPEN invoice `inv-next` whose cycle starts on the bill's closing date and billed-cycle invoice `inv-current` for the previous cycle
- **WHEN** that provider bill is synchronized
- **THEN** the bill is attached to `inv-current` (or a new row for that cycle), not to `inv-next`

### Requirement: Invoice payments are a persisted ledger
Each invoice MAY have zero or more `invoice_payments` in integer cents. Invoice JSON SHALL include `payments` as an array of `{ id, amount, paymentDate, transactionId }` (`transactionId` nullable for provider-only payments). `paidAmount` MUST equal the sum of those payments on **that** invoice. `paymentTransactionId` MUST equal the `transactionId` of the latest payment that has one, or null. An invoice is `PAID` when `paidAmount` is greater than or equal to `amount` and `amount` is greater than 0; a later bill attach MUST NOT revert `PAID` to `CLOSED` when that covering condition still holds. Canonical bill payment rows and imported `CARD_PAYMENT` movements MUST be recorded on the invoice they settle (typically the prior billed cycle), not on the cycle where the provider attached the event, when amount matching identifies a different unpaid invoice. A payment MUST NOT be inserted onto an invoice when doing so would make `paidAmount` exceed `amount`, unless the payment is an overpay applied to that same invoice. Duplicate provider events for the same settlement (same cents and payment date within one calendar day) MUST update the existing ledger row instead of inserting another.

#### Scenario: Partial payment leaves invoice unpaid
- **GIVEN** a CLOSED invoice of 10000 cents
- **WHEN** one payment of 4000 cents is recorded
- **THEN** `paidAmount` is 4000, `status` is not PAID, and `payments` contains that row

#### Scenario: Covering payments mark PAID
- **GIVEN** a CLOSED invoice of 10000 cents with 4000 cents already paid
- **WHEN** a second payment of 6000 cents is recorded
- **THEN** `status` is PAID and `paidAmount` is 10000

#### Scenario: Prior-cycle payment is not added to the next invoice
- **GIVEN** billed invoice `inv-jul` of 127968 cents already fully paid and billed invoice `inv-aug` of 172754 cents with a canonical full payment of 172754 cents
- **WHEN** synchronization also observes a 127968-cent card-bill payment attached by the provider to `inv-aug`'s bill
- **THEN** `inv-aug.paidAmount` is 172754, `inv-jul.paidAmount` remains 127968, and no ledger row of 127968 cents exists on `inv-aug`

#### Scenario: Paid status survives bill reattach
- **GIVEN** invoice `inv-aug` linked to a bill, `amount` 172754, `paidAmount` 172754, status PAID
- **WHEN** the same bill is merged again
- **THEN** `status` remains PAID and `paidAmount` remains 172754

### Requirement: Imported invoice cycle dates follow card closing and due days
Imported invoices SHALL persist `startsOn`, `endsOn`, and `dueOn` as UTC calendar dates derived from the card's `closingDay` / `closingOnLastDay` and `dueDay`. Adjacent invoices on the same card MUST satisfy `endsOn` of cycle N equals `startsOn` of cycle N+1, and that shared date MUST be the cycle closing day. Purchases whose UTC date equals that closing day MUST belong to cycle N+1. For a provider bill, `endsOn` MUST be that bill's closing date (due date when closing is null) and `startsOn` MUST be the previous cycle's closing day; `dueOn` MUST be the bill's due date. For an unbilled cycle, `dueOn` MUST use the card `dueDay` in the due month of that cycle. The system MUST NOT copy the provider account's full `balanceDueDate` onto an unbilled invoice when that date falls in a prior cycle.

#### Scenario: Nubank billed cycle uses day-4 boundaries
- **GIVEN** an imported card with `closingDay` 4, `closingOnLastDay` false, `dueDay` 11, and a provider bill closing 2026-08-04 due 2026-08-11
- **WHEN** that bill is projected into an invoice
- **THEN** the invoice has `startsOn` 2026-07-04, `endsOn` 2026-08-04, and `dueOn` 2026-08-11

#### Scenario: Adjacent cycles share the closing day
- **GIVEN** that billed invoice ending 2026-08-04 and an unbilled current cycle on the same card
- **WHEN** the unbilled invoice is upserted
- **THEN** its `startsOn` is 2026-08-04 and a purchase dated 2026-08-04 is assigned to it, not to the billed invoice

#### Scenario: Unbilled due date uses due day in the cycle's month
- **GIVEN** an imported card with `dueDay` 12, last-day closing, current cycle starting 2026-07-31, and provider account `balanceDueDate` 2026-08-12
- **WHEN** the unbilled current-cycle invoice is upserted on 2026-08-19
- **THEN** that invoice `dueOn` is 2026-09-12, not 2026-08-12

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
