## MODIFIED Requirements

### Requirement: Imported cards and bills preserve provider semantics
The system SHALL represent Pluggy `CREDIT` accounts as imported credit cards while preserving available limit, total limit, status, brand, closing/due dates, and currency when supplied. Provider bills MUST preserve nullable closing dates, minimum payment, installment permission, multiple payments, and finance charges. Reading an imported card MUST NOT synthesize a local provider bill. Pluggy does not send a boolean “close on last day of month”. The system MUST persist `credit_cards.dueDay` as the calendar day of the account `balanceDueDate` when present, otherwise the mode of synchronized bill due dates. The system MUST persist `credit_cards.closingDay` and `closingOnLastDay` from the account `balanceCloseDate` day when present; when that date is null, it MUST derive them from synchronized bill closing dates (fixed day when bills share a day of month; last-day-of-month when closings fall on or next to each month’s last calendar day). The system MUST NOT set `closingOnLastDay` true solely because `balanceCloseDate` is missing or because a fallback of 31 was used.

#### Scenario: Import a partially paid bill
- **GIVEN** Pluggy returns a bill with more than one payment whose sum is less than the total
- **WHEN** the bill is synchronized
- **THEN** MyBills retains each payment and presents the bill as not fully paid

#### Scenario: Read an imported card without a provider bill
- **GIVEN** an imported card for which Pluggy returned no current bill
- **WHEN** the user views the card
- **THEN** no synthetic imported bill is created as a side effect

#### Scenario: Missing account close date does not force last-day closing
- **GIVEN** a Pluggy credit account with `balanceCloseDate` null, `balanceDueDate` 2026-08-11, and bills that all close on day 4
- **WHEN** the card is projected
- **THEN** the imported card has `closingDay` 4, `closingOnLastDay` false, and `dueDay` 11

#### Scenario: Last-day closing is derived from bill closings
- **GIVEN** a Pluggy credit account with `balanceCloseDate` null, `balanceDueDate` 2026-08-12, and bills whose closing dates are the last calendar day of their months (or the nearest prior day)
- **WHEN** the card is projected
- **THEN** the imported card has `closingOnLastDay` true and `dueDay` 12
