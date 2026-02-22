# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests for dependency caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json            ./packages/shared/
COPY packages/agents/sink/package.json       ./packages/agents/sink/

RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/       ./packages/shared/
COPY packages/agents/sink/  ./packages/agents/sink/

# Build shared package first, then sink
RUN pnpm --filter @ukfreecomps/shared build || true
RUN pnpm --filter @ukfreecomps/sink build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only production deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json            ./packages/shared/
COPY packages/agents/sink/package.json       ./packages/agents/sink/

RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile --prod && \
    addgroup -S appgroup && \
    adduser  -S appuser -G appgroup

# Copy compiled output
COPY --from=builder /app/packages/shared/dist  ./packages/shared/dist
COPY --from=builder /app/packages/agents/sink/dist ./packages/agents/sink/dist

USER appuser

EXPOSE 8080
CMD ["node", "packages/agents/sink/dist/index.js"]
