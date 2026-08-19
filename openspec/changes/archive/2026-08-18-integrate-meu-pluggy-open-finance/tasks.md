## 1. Shared contracts and DTOs

- [x] 1.1 Add `packages/dtos/src/open-finance/` enums and schemas for connection source/status, product status, sync trigger/run status, and sanitized Pluggy errors.
- [x] 1.2 Add create-connection, connection-output, manual-sync, sync-run, and disconnect contracts under `packages/dtos/src/open-finance/`.
- [x] 1.3 Add provider bill/payment/finance-charge and investment/investment-transaction output contracts with money-in-cents and decimal fields documented.
- [x] 1.4 Extend account, credit-card, invoice, and transaction outputs additively with source, provider status/currency, hidden/override state, and provider-bill metadata.
- [x] 1.5 Extend cash-flow DTOs with imported attribution/forecast metadata without changing existing manual transaction fields.
- [x] 1.6 Export the new contracts from `packages/dtos/src/index.ts` and add Zod schema tests for valid, invalid, and nullable provider data.

## 2. Pluggy client and read-only validation

- [x] 2.1 Add the latest `pluggy-sdk` dependency to `apps/api/package.json` using pnpm and confirm whether Transactions V2 and investment-transaction pagination require a REST fallback.
- [x] 2.2 Add `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_WEBHOOK_SECRET`, feature-flag, and stale-hours validation to `apps/api/src/config/env.validation.ts` and placeholders to `.env.example`/`.env.test`.
- [x] 2.3 Create a typed Pluggy client port and backend adapter under `apps/api/src/modules/open-finance/providers/`, including automatic API-key refresh and typed REST fallbacks.
- [x] 2.4 Add a non-persisting probe command under `apps/api/src/modules/open-finance/scripts/` that verifies Connector 200 Items and reports product counts, pagination, date ranges, and sanitized errors.
- [x] 2.5 Run the probe against Pluggy sandbox, save redacted fixtures for mapper tests, and document which endpoint behaviors were confirmed.
- [x] 2.6 Run the probe against one real Meu Pluggy Item before cutover and record coverage for accounts, cards, bills, transactions, investments, and webhook delivery without storing sensitive output.

## 3. Prisma persistence and migration

- [x] 3.1 Add Open Finance connection, product-sync-state, sync-run, and webhook-event enums/models to `apps/api/prisma/schema.prisma`.
- [x] 3.2 Add canonical account, bill, bill-payment, bill-finance-charge, and transaction models with connection-scoped external-ID uniqueness and provider timestamps.
- [x] 3.3 Add investment and investment-transaction models with explicit decimal precision, currency, provider identity, and lifecycle fields.
- [x] 3.4 Add canonical `rawPayload`, `lastSeenAt`, and `unavailableAt` fields plus indexes needed by reconciliation and user-scoped reads.
- [x] 3.5 Extend `Account`, `CreditCard`, and `Transaction` with `source`, nullable unique provider links, `overriddenFields`, and `hiddenAt`, defaulting existing rows to `MANUAL`.
- [x] 3.6 Create the Prisma migration, including the partial unique index that permits one active sync run per connection, then regenerate `apps/api/src/generated/prisma`.
- [x] 3.7 Add an explicitly environment-guarded financial-data cutover script that preserves `_prisma_migrations`, users, and required system categories unless full reset is explicitly selected.

## 4. Connection lifecycle API

- [x] 4.1 Create `apps/api/src/modules/open-finance/` module structure, repository interfaces, Prisma repositories, services, and thin controllers; register the module in `app.module.ts`.
- [x] 4.2 Implement Connector 200 Item registration with current-user ownership, remote Item verification, duplicate protection, and sanitized connection metadata.
- [x] 4.3 Implement user-scoped connection listing and sync-run status retrieval using the shared output schemas.
- [x] 4.4 Implement idempotent disconnection that deletes the remote proxy Item when present and marks local imported data unavailable.
- [x] 4.5 Add stable domain errors for invalid connector, duplicate/foreign Item, unavailable Item, and disconnection failures.

## 5. Durable synchronization triggers

- [x] 5.1 Implement sync-run creation/coalescing so manual requests return HTTP 202 with the active or newly created `syncRunId`.
- [x] 5.2 Implement the PostgreSQL-backed worker lease, bounded retry/backoff, abandoned-run recovery, and terminal success/partial/failure states.
- [x] 5.3 Implement the stale-connection scheduler using `@nestjs/schedule`, GET-only product pulls, configured stale interval, and no scheduled Item updates.
- [x] 5.4 Implement the public Pluggy webhook endpoint with constant-time secret validation, prompt 2XX acknowledgement, unique `eventId`, and persisted sanitized payload metadata.
- [x] 5.5 Map `item/*` and `transactions/*` webhook events to full or targeted sync runs while preserving transaction links/IDs for worker processing.

## 6. Canonical product synchronization

- [x] 6.1 Implement decimal-to-cents conversion and account/card mappers with checked bounds, currency retention, provider timestamps, and redacted raw-payload handling.
- [x] 6.2 Implement full account synchronization and projection reconciliation for `BANK` accounts without invoking manual account commands.
- [x] 6.3 Implement `CREDIT` account synchronization and credit-card projection mapping for limits, status, brand, due/closing data, and funding-account separation.
- [x] 6.4 Implement provider bill, payment, and finance-charge synchronization without creating manual `Invoice` rows.
- [x] 6.5 Implement Transactions V2 full cursor pagination, canonical idempotent upserts, provider category/payment/merchant/card metadata, and transaction projections.
- [x] 6.6 Implement targeted transaction-created, transaction-updated batches of at most 500 IDs, and transaction-deleted reconciliation.
- [x] 6.7 Implement investment and investment-transaction page traversal with precise quantities, values, rates, expenses, and position lifecycle data.
- [x] 6.8 Implement product-level success checkpoints so only fully successful products can mark unseen entities unavailable.
- [x] 6.9 Implement connection/run result aggregation with supported-product status, last successful sync time, and sanitized partial failures.

## 7. Provider-aware domain behavior

- [x] 7.1 Update account services/repositories so imported balances are snapshots, imported deletes become hides, and manual account behavior remains unchanged.
- [x] 7.2 Update credit-card reads so imported cards use provider bills and never call local invoice generation as a read side effect.
- [x] 7.3 Update transaction create/update/paid/delete paths so imported edits record `overriddenFields` and never mutate provider-backed account balances.
- [x] 7.4 Add an authenticated reset-override action that restores selected projection fields from the latest canonical record.
- [x] 7.5 Preserve provider/local category separation and validate local category overrides against effective income/expense type.
- [x] 7.6 Ensure imported transfer legs, card installments, and recurring-looking movements never create synthetic transfer pairs or `TransactionSeries`.
- [x] 7.7 Exclude hidden/unavailable imported projections from normal account, card, transaction, invoice, and investment queries.

## 8. Cash-flow reconciliation

- [x] 8.1 Add persisted cash-flow role and classification provenance for normal movements, transfers, card payments, investments, and ignored rows.
- [x] 8.2 Implement conservative counterpart matching using provider references, participants, amount, currency, date, account, and bill evidence.
- [x] 8.3 Update monthly summaries so posted bank movements contribute, pending bank movements remain unrealized, and hidden rows are excluded.
- [x] 8.4 Attribute imported card purchases by provider bill due month or forecast month and expose forecast status.
- [x] 8.5 Exclude matched transfer legs and card-bill payments from income/expense totals while preserving current manual competence/invoice behavior.

## 9. Typed API client

- [x] 9.1 Add `packages/api-client/src/open-finance/` methods for register/list/disconnect connections, start sync, and retrieve sync status.
- [x] 9.2 Add typed provider-bill and investment list/detail methods and export them from `packages/api-client`.
- [x] 9.3 Extend existing account/card/transaction client types and serializers for additive source/override metadata.

## 10. Mobile experience

- [x] 10.1 Create `apps/mobile/src/features/open-finance/` services and React Query hooks for connections, sync runs, registration, disconnection, and cache invalidation.
- [x] 10.2 Add an Open Finance settings screen that accepts an existing Connector 200 Item ID and lists institution, products, status, and last successful sync.
- [x] 10.3 Add the “Sync now” action with disabled/coalesced in-progress behavior, completion polling/refetch, pull-to-refresh integration, and actionable errors.
- [x] 10.4 Add disconnection confirmation and remove disconnected provider data from relevant query caches.
- [x] 10.5 Update account, card, bill, and transaction screens to identify imported/edited/forecast data without exposing provider-sensitive fields.
- [x] 10.6 Add investment list and detail screens showing positions, performance fields, and investment movements with precise localized formatting.
- [x] 10.7 Add navigation entries for Open Finance settings and investments while preserving feature import boundaries.

## 11. Localization

- [x] 11.1 Add mirrored API i18n keys under `apps/api/src/i18n/pt-BR` and `apps/api/src/i18n/en` for connection, sync, connector, ownership, consent, and product errors.
- [x] 11.2 Add mirrored mobile translations under pt-BR and en-US for setup, sync states, disconnect confirmation, imported/edited badges, forecasts, and investments.
- [x] 11.3 Verify dates, currency, percentages, and provider status labels use locale-aware formatting and contain no hardcoded user-facing strings.

## 12. Automated verification

- [x] 12.1 Add API unit tests under `apps/api/src/modules/open-finance/test/` for Item verification, ownership, disconnection, sync coalescing, webhook idempotency, leases, and error sanitization.
- [x] 12.2 Add mapper/repository unit tests using redacted fixtures for decimal conversion, pagination, canonical upserts, partial-product retention, deletion, and override reconciliation.
- [x] 12.3 Add transaction service unit tests proving imported edits/paid/delete operations do not change balances while manual behavior remains unchanged.
- [x] 12.4 Add credit-card service/repository tests proving imported reads do not synthesize invoices and partial provider bill payments remain distinct.
- [x] 12.5 Add cash-flow unit tests for posted/pending movements, bill forecast attribution, hidden rows, transfer matching, card-payment exclusion, and ambiguous matches.
- [x] 12.6 Add e2e tests under `apps/api/test/e2e/` for connection registration/list/disconnect, manual sync authorization, sync status, webhook authentication/idempotency, investments, and user isolation.
- [x] 12.7 Add mobile hook/screen tests for sync-button states, localized errors, cache invalidation, disconnection, and imported/override indicators.
- [x] 12.8 Run focused tests, Prisma migration/generation checks, lint, type checks, and monorepo builds; fix all introduced diagnostics.

## 13. Cutover and VPS operation

- [x] 13.1 Back up the development database and run the guarded financial-data cutover only after the real Connector 200 probe passes.
- [x] 13.2 Register the real Item IDs, perform a full manual sync, and reconcile counts, balances, transaction ranges, bill totals, and investment totals against Meu Pluggy.
- [ ] 13.3 Configure VPS Pluggy credentials, HTTPS webhook URL/secret, feature flag, encrypted backups, and stale-sync schedule without logging secrets.
- [ ] 13.4 Verify process-restart recovery, duplicate webhook delivery, Connector 200 webhook availability, and manual “Sync now” behavior in the deployed environment.
- [x] 13.5 Document operational recovery: disable the worker/feature flag, restore the database backup, and leave remote Items/Meu Pluggy consents untouched unless explicitly disconnected.
