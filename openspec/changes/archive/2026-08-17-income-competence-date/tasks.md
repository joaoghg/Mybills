## 1. Contracts

- [x] 1.1 Add optional `competenceDate` to create, update, and transaction output Zod schemas in `packages/dtos/src/transactions`
- [x] 1.2 Add Prisma `competenceDate` on `Transaction` and create the migration

## 2. API

- [x] 2.1 Map `competenceDate` through transaction entity, contracts, and Prisma repository
- [x] 2.2 Validate income-only / clear on type change / reject on series create in `transactions.service.ts`; add API i18n keys pt-BR + en
- [x] 2.3 Attribute INCOME in `getMonthlySummary` by `(competenceDate ?? date)` and expand summary fetch lookahead by 2 months

## 3. Client

- [x] 3.1 Pass `competenceDate` in `packages/api-client` create/update request bodies (responses already use DTOs)

## 4. Mobile

- [x] 4.1 Add income-only “Contabilizar em” month field on create and edit screens; send null when month matches `date`
- [x] 4.2 Add history/summary subtitle keys (pt-BR + en-US) and wire extras in `use-transaction-history.ts` and `use-monthly-summary.ts`

## 5. Tests

- [x] 5.1 Unit tests in `transactions.service.spec.ts` for summary split and validation
- [x] 5.2 E2e: create income with competence, summaries for both months, 400 on expense competence
