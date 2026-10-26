FROM node:24-alpine AS base

RUN corepack enable

FROM base AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile

FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN pnpm run build

# Applies the SQL migrations (run by docker compose before the app starts)
FROM deps AS migrator

WORKDIR /app

COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/lib/db/schema.ts ./src/lib/db/schema.ts
COPY src/lib/db/auth-schema.ts ./src/lib/db/auth-schema.ts
COPY scripts ./scripts

CMD ["pnpm", "exec", "drizzle-kit", "migrate"]

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]