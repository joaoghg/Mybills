FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat \
  && corepack enable \
  && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app

# Prune monorepo down to api + its workspace deps
FROM base AS prepare
RUN npm install -g turbo@^2
COPY . .
RUN turbo prune api --docker

# Install, generate Prisma client, build
FROM base AS builder
RUN apk add --no-cache python3 make g++
COPY --from=prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN pnpm --filter=api exec prisma generate
RUN pnpm turbo build
# Drop install tree and keep production deps only
RUN rm -rf node_modules apps/*/node_modules packages/*/node_modules \
  && pnpm install --frozen-lockfile --prod

# Minimal runtime image
FROM base AS runner
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs
USER nestjs
COPY --from=builder --chown=nestjs:nodejs /app .
WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
