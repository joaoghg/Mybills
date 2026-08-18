## Context

See `proposal.md` for motivation and scope. The current Prisma models are manual-budgeting projections: account balances are edited and mutated by paid transactions, cards synthesize invoices from local closing rules, and invoice payment creates a new account expense. Pluggy instead supplies authoritative balance snapshots, provider bills, signed transaction movements, and investment positions. Applying imported data through existing create/update services would therefore change balances and create duplicate financial events.

Meu Pluggy Connector 200 is a personal-data proxy. It refreshes its upstream connections automatically, but webhook delivery is not guaranteed. “Sync now” can only pull data currently available through Pluggy; it cannot promise a fresh bank read.

## Goals / Non-Goals

**Goals:**

- Preserve complete provider facts and stable identifiers while keeping existing manual-entry behavior.
- Make every trigger—manual, webhook, or stale fallback—enter one durable, idempotent synchronization pipeline.
- Reuse current controllers/services/repositories where their semantics still fit, but isolate provider ingestion from balance and invoice side effects.
- Keep all Pluggy credentials and raw sensitive payloads on the backend.
- Support safe cutover from disposable test data after a real Connector 200 probe.

**Non-Goals:**

- Embedded onboarding for direct bank connectors or a commercial multi-tenant Pluggy product.
- A Redis/BullMQ dependency for the first single-VPS implementation.
- Writing local overrides back to Pluggy or forcing Pluggy Item updates on a schedule.
- Treating investment movements as ordinary cash-flow transactions.

## Decisions

### 1. Register existing Connector 200 Items instead of building bank onboarding

The first version will accept an existing Pluggy `itemId` created after the user links each Meu Pluggy institution. The API retrieves the Item and accepts it only when `connector.id === 200`.

Endpoints and contracts:

- `POST /open-finance/connections` with `CreateOpenFinanceConnectionInput { itemId: string }`
- `GET /open-finance/connections` returning user-scoped `OpenFinanceConnectionOutput[]`
- `DELETE /open-finance/connections/:connectionId` for idempotent proxy-Item deletion and local disconnection
- `POST /open-finance/connections/:connectionId/sync` returning HTTP 202 and `SyncRunOutput`
- `GET /open-finance/connections/:connectionId/sync-runs/:syncRunId`
- `POST /open-finance/webhooks/pluggy`, public but protected by a configured secret header

Connection and sync routes derive ownership from the authenticated JWT. They do not accept a `userId`.

**Alternative considered:** embed Pluggy Connect in Expo. Rejected for this change because Connector 200 setup still depends on Meu Pluggy, React Native requires a WebView flow, and onboarding is not needed to validate personal data ingestion.

### 2. Add an isolated Open Finance module and domain-facing projection ports

`apps/api/src/modules/open-finance/` owns:

- Pluggy authentication/client access;
- connection and Item lifecycle;
- webhook ingestion;
- durable sync-run orchestration;
- canonical provider repositories and mappers;
- projection ports consumed by accounts, credit cards, transactions, and cash flow.

Controllers remain thin. Services own orchestration and mapping rules. Prisma access stays under `repositories/prisma/`.

Existing domain services continue to own manual commands. Imported records are never created through public manual create flows because those flows mutate balances, create invoice assignments, and generate series.

`apps/mobile/src/features/open-finance/` owns connection status, synchronization history, and the “Sync now” action. Existing account/card/transaction screens receive additive source and override metadata through shared DTOs.

### 3. Store canonical provider records separately from user-facing projections

Add canonical Prisma models:

- `OpenFinanceConnection`
- `OpenFinanceSyncRun`
- `OpenFinanceProductSyncState`
- `OpenFinanceWebhookEvent`
- `OpenFinanceAccount`
- `OpenFinanceBill`
- `OpenFinanceBillPayment`
- `OpenFinanceBillFinanceCharge`
- `OpenFinanceTransaction`
- `Investment`
- `InvestmentTransaction`

Canonical records include connection-scoped external IDs, normalized fields, provider timestamps, `rawPayload Json`, `lastSeenAt`, and `unavailableAt`. Composite unique constraints use `(connectionId, externalId)` or the corresponding parent/external-ID scope. `eventId` is globally unique.

Where current semantics fit, existing `Account`, `CreditCard`, and `Transaction` rows become user-facing projections through nullable unique provider links plus:

- `source = MANUAL | PLUGGY`;
- `overriddenFields String[]`;
- `hiddenAt`;
- typed effective values already used by existing DTOs.

Synchronization always updates canonical rows. It updates a projection field only when that field is not listed in `overriddenFields`. User edits update the typed projection and mark changed fields. Clearing an override copies the latest canonical value back and removes the marker.

Provider bills remain in dedicated bill tables because the current `Invoice` model cannot represent nullable closing dates, multiple/partial payments, or finance charges. Manual cards continue using `Invoice`; imported cards use a provider-bill adapter and DTO extension. Investments are new first-class read models and do not project into accounts.

**Alternative considered:** add Pluggy columns directly to every existing model. Rejected because it would discard provider-only data and mix immutable upstream state with mutable budgeting state.

**Alternative considered:** query only canonical tables and remove current projections. Rejected because it would require replacing most account/card/transaction APIs and mobile flows at once.

### 4. Use PostgreSQL-backed durable sync runs

No Redis is required initially. A manual request, webhook, or stale check inserts or reuses one active `OpenFinanceSyncRun` per connection and returns immediately. A scheduled worker claims pending runs with a lease, retries transient failures with bounded backoff, and resumes abandoned leases after process restart. A partial unique index prevents simultaneous `PENDING`/`RUNNING` runs for one connection.

Trigger flow:

```text
manual request ─┐
webhook event ──┼─> create/coalesce SyncRun ─> HTTP response
stale check ────┘                                │
                                                 v
                                      PostgreSQL-backed worker
                                                 │
                              GET Item, products, canonical upserts
                                                 │
                                      projection reconciliation
                                                 │
                                   SUCCESS / PARTIAL / FAILED
```

Webhook requests use a configured custom authorization header, persist `eventId` before acknowledging, and return 2XX within five seconds. Transaction-created links and transaction ID lists are stored with the event so the worker can perform targeted changes. Item events first retrieve the latest Item.

The stale fallback selects active connections whose successful data sync is older than the configured interval, defaulting to 24 hours. It performs product GETs only; it does not poll Item execution or call `PATCH /items/:id`.

### 5. Synchronize products with product-level checkpoints

Full initial or manual reconciliation:

1. Retrieve Item and update connection status, products, connector snapshot, consent/error fields, and sync timestamps.
2. Retrieve all accounts for the Item.
3. For each account, follow every `/v2/transactions` cursor; for credit accounts also retrieve bills.
4. Retrieve every investment page and every investment's transaction pages.
5. Upsert canonical rows, then reconcile projections.
6. Mark missing rows unavailable only for products whose full retrieval succeeded.
7. Commit product status and complete the sync run as success, partial success, or failure.

Webhook optimization:

- `item/created` and `item/updated` refresh accounts, bills, investments, and Item metadata.
- `transactions/created` consumes the webhook-provided V2 link/cursor.
- `transactions/updated` retrieves the listed IDs, at most 500 per request.
- `transactions/deleted` marks the listed canonical transactions unavailable.

Manual and stale runs perform full transaction reconciliation because Connector 200 webhook delivery cannot be assumed. This favors correctness over request minimization for the intended personal scale. Pagination is mandatory, and one product failure cannot erase another product's data.

### 6. Normalize money without losing the provider payload

Pluggy monetary numbers are currency-unit decimals. Mappers parse them through a decimal type and convert existing DTO/projection values to checked integer cents. Canonical money uses `Decimal(19,4)` with `currencyCode`; investment quantities, quota values, and rates use explicit decimal precision. The original response remains in `rawPayload` for forward compatibility.

Pluggy `CREDIT` maps to `INCOME`; `DEBIT` maps to `EXPENSE`; absolute cents are exposed through current transaction contracts. Provider `POSTED | PENDING` remains separate from local `isPaid`.

### 7. Branch side effects by source

Manual account, transaction, transfer, recurring/installment, and invoice-payment behavior remains unchanged.

For `source = PLUGGY`:

- transaction edits and paid toggles create overrides but never mutate account balance;
- deletion creates `hiddenAt` rather than deleting provider/canonical rows;
- imported transfer legs never create synthetic transfer pairs;
- imported card installments never create `TransactionSeries`;
- reading an imported card never calls local invoice generation;
- provider bill payments never call the local invoice-payment command.

Existing service/repository methods receive explicit source-aware branches instead of relying on optional IDs.

### 8. Add conservative cash-flow roles

Imported movements receive a derived `cashFlowRole` such as `NORMAL`, `TRANSFER`, `CARD_PAYMENT`, `INVESTMENT`, or `IGNORED`, plus the evidence used to derive it. Provider payment references, participants, bill IDs, amounts, currencies, and dates may establish a match. Ambiguous movements stay `NORMAL` until user override or stronger provider data exists.

Cash-flow reads use effective projection values:

- posted bank credits/debits contribute to realized totals;
- pending bank movements do not;
- card purchases use provider bill due month or forecast month;
- matched transfer legs and card-bill payments are excluded;
- hidden rows are excluded;
- manual transactions keep existing competence and invoice-month behavior.

This avoids treating description similarity alone as proof of a transfer.

### 9. Secure credentials, webhooks, and sensitive financial data

Add validated backend environment fields:

- `PLUGGY_CLIENT_ID`
- `PLUGGY_CLIENT_SECRET`
- `PLUGGY_WEBHOOK_SECRET`
- `PLUGGY_SYNC_STALE_HOURS` with a safe default

The SDK handles API-key refresh server-side. Neither API keys nor client secrets enter DTOs, mobile configuration, logs, or persisted raw payloads. Logs use entity IDs and sanitized error codes, not account numbers, tax numbers, payment participants, or full provider payloads. The webhook secret is compared in constant time; Pluggy's published IP may be allowlisted as defense in depth, not as sole authentication.

Deleting a connection deletes the Connector 200 proxy Item and marks local data unavailable. It does not claim to revoke the underlying Meu Pluggy bank consent.

## Risks / Trade-offs

- **[Connector 200 webhook behavior differs from commercial Pluggy]** → Keep manual and stale full pulls as first-class triggers; live-probe webhook delivery before enabling it.
- **[Full transaction reconciliation consumes more requests]** → Coalesce runs, enforce a cooldown, paginate correctly, and optimize with transaction webhooks when confirmed.
- **[Provider schemas and institution coverage vary]** → Persist raw payloads, gate deletion by product success, and run a read-only probe for each connected institution.
- **[Projection and canonical rows can diverge]** → Update both inside one database transaction per batch and record explicit override fields.
- **[In-process worker can stop during deployment]** → Persist leases and retries in PostgreSQL so another worker pass resumes work.
- **[Cash-flow matching may misclassify transfers or bill payments]** → Require strong evidence, retain classification provenance, and prefer visible unmatched rows over silent exclusion.
- **[Existing integer-cent columns can overflow for unusually large balances]** → Validate conversion bounds and keep full canonical decimals; migrate projection money to a wider representation later if the probe demonstrates need.
- **[Raw payloads contain financial personal data]** → Minimize retained fields where possible, restrict access, avoid logs, and rely on encrypted VPS volumes/backups and database transport.

## Migration Plan

1. Add Pluggy environment validation and a read-only probe that authenticates, verifies Connector 200 Items, enumerates products, and reports counts/ranges without logging sensitive values.
2. Run the probe against sandbox and one real Meu Pluggy institution; confirm accounts, bills, transaction history, investments, pagination, and webhook behavior.
3. Apply additive canonical/sync tables and nullable projection source links. Existing rows default to `MANUAL`.
4. Implement sync pipeline and provider-aware read paths behind an Open Finance feature flag.
5. Add DTO/client/mobile status and manual-sync surfaces, then run sandbox, unit, and e2e coverage.
6. Back up the development database. Use an explicitly guarded cutover command to delete only disposable financial-domain rows, preserving users and required system categories unless a full reset is explicitly selected.
7. Register real Connector 200 Item IDs, run full synchronization, and reconcile entity counts, balances, transaction date ranges, bill totals, and investment totals before enabling imported views.
8. Enable VPS stale checks and webhook endpoint after HTTPS and webhook secret configuration.

Rollback disables the feature flag and worker, restores the pre-cutover database backup if needed, and leaves Meu Pluggy consents untouched. Rollback MUST NOT delete remote Items automatically.

## Open Questions

- Does the current Connector 200 application deliver Item and transaction webhooks despite the pricing-page limitation? The live probe decides whether webhook optimization is enabled.
- Which products and history ranges do the user's actual institutions expose through Meu Pluggy? Missing products remain visible as connection capabilities/errors rather than blocking supported products.
- Does the current Pluggy Node SDK expose Transactions V2 and investment-transaction pagination completely? Use a typed backend REST adapter for unsupported SDK operations.
