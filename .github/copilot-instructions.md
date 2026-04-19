# MyBills Project Guidelines

## Scope

These instructions apply to the entire monorepo.

## Architecture

- Monorepo with pnpm workspaces and Turbo.
- Main apps:
  - `apps/api`: NestJS 11 backend with Prisma and PostgreSQL.
  - `apps/mobile`: Expo React Native app.
- Shared package:
  - `packages/dtos`: Zod schemas and inferred types used by API and clients.
  - `packages/theme`: Shared design tokens and theming utilities for frontend apps.

## Code Quality Rules

- Prefer strict typing and avoid `any` in handwritten code.
- Keep controllers thin; move business logic to services.
- Keep functions focused and side effects explicit.
- Preserve existing naming and module boundaries unless a task explicitly requires refactoring.

## Utilities

- Use `@mybills/utils` for shared helper functions and types.
