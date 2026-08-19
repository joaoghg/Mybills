## Purpose

Defines how MyBills links personal Meu Pluggy data, synchronizes supported financial products, preserves upstream facts, and exposes safe local overrides and synchronization controls.

## ADDED Requirements

### Requirement: User can register personal Meu Pluggy connections
The system SHALL let an authenticated user register one or more existing Meu Pluggy Connector 200 Items using an input containing `itemId` as a UUID. Before persisting the connection, the system MUST retrieve the Item, verify that it belongs to Connector 200, and ensure the Item is not assigned to another MyBills user. Pluggy credentials MUST remain backend-only.

#### Scenario: Register a valid Connector 200 Item
- **GIVEN** an authenticated user and an unassigned Connector 200 Item
- **WHEN** the user registers the Item ID
- **THEN** the API returns the user-scoped connection with Item status, institution metadata, supported products, and synchronization timestamps

#### Scenario: Reject a non-Meu-Pluggy Item
- **GIVEN** an authenticated user and an Item from a connector other than Connector 200
- **WHEN** the user attempts to register that Item ID
- **THEN** the API returns 400 with a stable localized invalid-argument error and stores no connection

#### Scenario: Reject an Item owned by another user
- **GIVEN** a Pluggy Item already assigned to another MyBills user
- **WHEN** the authenticated user attempts to register it
- **THEN** the API rejects the request without revealing the other user's identity

### Requirement: User can disconnect a Meu Pluggy connection
The system SHALL let an authenticated owner disconnect a connection. Disconnecting MUST delete the proxy Item from Pluggy when it still exists, stop future synchronization, and make imported data unavailable in normal MyBills views without affecting the user's underlying Meu Pluggy bank consent or unrelated connections.

#### Scenario: Disconnect an active connection
- **GIVEN** an authenticated owner and an active Connector 200 connection
- **WHEN** the owner confirms disconnection
- **THEN** the proxy Item is deleted, the connection is marked disconnected, and its imported data is hidden from normal views

#### Scenario: Proxy Item was already deleted
- **GIVEN** an authenticated owner whose stored proxy Item no longer exists in Pluggy
- **WHEN** the owner disconnects it
- **THEN** MyBills completes the local disconnection idempotently

### Requirement: User can request synchronization without a webhook
The system SHALL expose an authenticated manual synchronization action for a connection. A successful request MUST return an accepted synchronization result containing a `syncRunId` and current state. The action SHALL pull the latest data already available through Pluggy and MUST NOT promise or imply an immediate refresh from the financial institution.

#### Scenario: Start synchronization from the mobile action
- **GIVEN** an authenticated owner and an idle active connection
- **WHEN** the user selects the localized “Sync now” action
- **THEN** the API accepts the request and the mobile UI shows an in-progress state

#### Scenario: Coalesce concurrent requests
- **GIVEN** a connection with a synchronization already in progress
- **WHEN** the owner requests another synchronization
- **THEN** the API returns the active run instead of starting a duplicate pull

#### Scenario: Reject synchronization for another user
- **GIVEN** an authenticated user who does not own the connection
- **WHEN** they request synchronization
- **THEN** the API returns a not-found response and no Pluggy request is made

### Requirement: Automatic triggers use the same idempotent synchronization behavior
The system SHALL process supported Pluggy Item and transaction webhooks when they are available. Because Connector 200 does not guarantee webhook delivery, a deployed instance MUST also attempt a data pull for an active connection whose last successful synchronization is stale. Automatic pulls MUST NOT poll Item execution state or trigger scheduled Item updates at Pluggy.

#### Scenario: Process a valid webhook once
- **GIVEN** a valid authenticated webhook with a previously unseen `eventId`
- **WHEN** the API receives the event
- **THEN** it acknowledges the event promptly and schedules the relevant user-scoped synchronization once

#### Scenario: Ignore duplicate webhook delivery
- **GIVEN** a webhook `eventId` already accepted
- **WHEN** Pluggy retries the same event
- **THEN** the API acknowledges it without applying the event twice

#### Scenario: Synchronize a stale connection without webhook support
- **GIVEN** an active Connector 200 connection older than the configured stale interval
- **WHEN** the deployed stale-connection check runs
- **THEN** the system starts the same data-pull workflow used by manual synchronization

### Requirement: Synchronization preserves canonical provider data
The system MUST persist stable provider identifiers and canonical upstream data for accounts, credit-card accounts, bills, bill payments, bill charges, transactions, investments, and investment movements returned by the connection's supported products. Monetary amounts exposed through existing MyBills contracts SHALL use integer cents and retain their ISO currency code; investment quantities, prices, and rates MUST retain decimal precision.

#### Scenario: Import every page of supported products
- **GIVEN** a connection whose Pluggy products span multiple result pages or transaction cursors
- **WHEN** a full synchronization succeeds
- **THEN** every returned entity is stored once using its provider identifier and connection scope

#### Scenario: Update an existing provider entity
- **GIVEN** a stored provider entity with a stable Pluggy identifier
- **WHEN** a later synchronization returns changed upstream fields
- **THEN** the canonical provider values are updated without creating a duplicate

#### Scenario: Preserve data after a partial product failure
- **GIVEN** a synchronization in which at least one product fails or reports partial success
- **WHEN** reconciliation completes for the successful products
- **THEN** previously stored entities from the failed product remain available and the connection exposes the product error

#### Scenario: Reconcile an upstream deletion
- **GIVEN** a fully successful product snapshot or a provider deletion event
- **WHEN** a previously stored provider entity is confirmed deleted upstream
- **THEN** the entity is marked unavailable without deleting user overrides or unrelated local records

### Requirement: User edits are non-destructive overrides
The system SHALL retain provider facts separately from user overrides. Existing editable fields MAY receive user-specific overrides, and effective API responses MUST prefer an override when present while exposing that the value was edited. A later synchronization MUST update canonical provider data without erasing the override. Removing an override MUST reveal the latest provider value.

#### Scenario: Override an imported transaction category
- **GIVEN** an imported transaction with a provider category
- **WHEN** the owner assigns a local category
- **THEN** subsequent responses use the local category and preserve the provider category for reconciliation

#### Scenario: Provider update does not erase an override
- **GIVEN** an imported entity with a local description override
- **WHEN** synchronization changes the provider description
- **THEN** the effective description remains local while the new provider description is retained

#### Scenario: Hide an imported entity
- **GIVEN** an imported entity visible to its owner
- **WHEN** the owner deletes or hides it locally
- **THEN** it is excluded from normal MyBills views without deleting the provider record or causing it to reappear on the next synchronization

### Requirement: Imported cards and bills preserve provider semantics
The system SHALL represent Pluggy `CREDIT` accounts as imported credit cards while preserving available limit, total limit, status, brand, closing/due dates, and currency when supplied. Provider bills MUST preserve nullable closing dates, minimum payment, installment permission, multiple payments, and finance charges. Reading an imported card MUST NOT synthesize a local provider bill.

#### Scenario: Import a partially paid bill
- **GIVEN** Pluggy returns a bill with more than one payment whose sum is less than the total
- **WHEN** the bill is synchronized
- **THEN** MyBills retains each payment and presents the bill as not fully paid

#### Scenario: Read an imported card without a provider bill
- **GIVEN** an imported card for which Pluggy returned no current bill
- **WHEN** the user views the card
- **THEN** no synthetic imported bill is created as a side effect

### Requirement: Connection and synchronization status are observable
The system SHALL expose connection status, supported products, last successful synchronization time, active run state, and latest sanitized product errors. Mobile status and error messages MUST be localized in pt-BR and en-US.

#### Scenario: Display successful synchronization
- **GIVEN** a connection whose synchronization completed successfully
- **WHEN** the owner opens Open Finance settings
- **THEN** the UI shows the localized success state and completion time

#### Scenario: Display a recoverable Pluggy error
- **GIVEN** Pluggy reports an authentication, consent, connector, or partial-product error
- **WHEN** the owner views the connection
- **THEN** the UI shows a localized actionable error without exposing credentials or raw sensitive payloads
