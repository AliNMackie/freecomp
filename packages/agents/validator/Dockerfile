# =============================================================================
# Builder stage
# Build context: monorepo root
#   docker build -f packages/agents/validator/Dockerfile -t validator .
# =============================================================================
FROM node:20-slim AS builder

RUN npm install -g pnpm

WORKDIR /app

# Workspace manifests — layer-cache-friendly
COPY pnpm-lock.yaml          ./pnpm-lock.yaml
COPY pnpm-workspace.yaml     ./pnpm-workspace.yaml
COPY package.json            ./package.json

COPY packages/shared/package.json             ./packages/shared/package.json
COPY packages/agents/validator/package.json   ./packages/agents/validator/package.json

# Install only validator's dependency tree (includes devDeps for tsc)
RUN pnpm install --frozen-lockfile --filter @ukfreecomps/validator...

# Copy source and compile
COPY packages/shared/src                       ./packages/shared/src
COPY packages/agents/validator/src             ./packages/agents/validator/src
COPY packages/agents/validator/tsconfig.json   ./packages/agents/validator/tsconfig.json

RUN pnpm --filter @ukfreecomps/validator build

# =============================================================================
# Runtime stage — lean Node 20, no Chromium
# =============================================================================
FROM node:20-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/packages/agents/validator/dist         ./dist
COPY --from=builder /app/packages/agents/validator/package.json ./package.json

RUN npm install --omit=dev

RUN addgroup --system validator && adduser --system --ingroup validator validator
USER validator

EXPOSE 8080

CMD ["node", "dist/index.js"]
