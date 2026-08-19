## Why

MyBills currently relies on manually created test data and cannot import or preserve the account, card, bill, transaction, and investment data exposed through the free Meu Pluggy Connector 200. The project needs a source-aware synchronization model so Pluggy remains the authoritative upstream while users can apply local, non-destructive overrides for budgeting.

## What Changes

- Add a backend-only Pluggy integration for Connector 200 authentication, Item ownership, product retrieval, connection status, and consent lifecycle.
- Persist canonical upstream records and stable Pluggy identifiers for bank accounts, credit-card accounts, bills and their payments/charges, transactions, investments, and investment movements.
- Add idempotent synchronization initiated by supported Pluggy webhooks, an authenticated mobile “Sync now” action for development/testing, and a scheduled stale-connection fallback when Connector 200 does not deliver webhooks.
- Keep provider facts immutable and store user changes as local field overrides; effective API responses prefer overrides while retaining original values for later reconciliation.
- Prevent imported transactions from mutating Pluggy-authoritative account balances, generating synthetic provider invoices, or double-counting card purchases, card-bill payments, and transfers.
- Surface connection health, last successful synchronization, in-progress state, and localized errors in the mobile app.
- Reset existing non-production financial test rows at cutover after a read-only real-data probe validates connector product coverage and field mappings.
- Extend DTOs and API responses additively with source, synchronization, and override metadata; no existing request field is removed.

## Capabilities

### New Capabilities

- `open-finance`: Meu Pluggy connection lifecycle, canonical product storage, synchronization triggers, reconciliation, manual overrides, and mobile synchronization status.

### Modified Capabilities

- `transactions`: Imported transactions gain provider identity/status and override behavior without invoking manual-ledger balance side effects.
- `cash-flow`: Summaries classify imported account/card movements without double-counting transfers or credit-card bill payments.

## Non-goals

- Commercial multi-user Pluggy onboarding, connectors other than Meu Pluggy Connector 200, or production SLA guarantees.
- Payment initiation, PIX operations, loans, identity/KYC, brokerage notes, or writing user edits back to Pluggy.
- Forcing an immediate bank-to-Meu-Pluggy refresh; “Sync now” only pulls the latest data currently available through Pluggy.
- Replacing JWT authentication, existing manual-entry flows, or local recurring/installment projections.

## Impact

- **api:** New Pluggy module, authenticated connection/sync endpoints, optional public webhook endpoint, synchronization orchestration, and provider-aware domain rules. New ownership checks MUST derive the current user from JWT rather than accept an arbitrary owner ID.
- **mobile:** New Open Finance settings/status surface and “Sync now” action; imported rows expose source and override state.
- **packages/dtos:** Additive schemas for connections, sync runs, source metadata, provider status, investments, and overrides.
- **packages/api-client:** Typed clients for connection status, manual sync, and investments.
- **packages/theme:** No token changes expected.
- **prisma:** New connection, canonical provider data, investment, synchronization, idempotency, and override persistence plus source links on user-facing projections.
- **dependencies/systems:** Pluggy Node SDK, Pluggy API, Connector 200, PostgreSQL, and an HTTPS-reachable webhook only in deployed environments.
