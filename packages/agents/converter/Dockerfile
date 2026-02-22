# =============================================================================
# Builder stage
# Build context must be the monorepo root:
#   docker build -f packages/agents/converter/Dockerfile -t converter .
# =============================================================================
FROM node:20-slim AS builder

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace manifests for layer-cache-friendly installs
COPY pnpm-lock.yaml          ./pnpm-lock.yaml
COPY pnpm-workspace.yaml     ./pnpm-workspace.yaml
COPY package.json            ./package.json

# Only the manifests of packages in converter's dependency tree
COPY packages/shared/package.json             ./packages/shared/package.json
COPY packages/agents/converter/package.json   ./packages/agents/converter/package.json

# Install only converter's dependency tree (production + devDeps for tsc)
RUN pnpm install --frozen-lockfile --filter @ukfreecomps/converter...

# Copy source
COPY packages/shared/src                      ./packages/shared/src
COPY packages/agents/converter/src            ./packages/agents/converter/src
COPY packages/agents/converter/tsconfig.json  ./packages/agents/converter/tsconfig.json

# Compile TypeScript → dist/
RUN pnpm --filter @ukfreecomps/converter build

# =============================================================================
# Runtime stage — no Chromium, lean image
# =============================================================================
FROM node:20-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

# Copy compiled output and production node_modules from builder
COPY --from=builder /app/packages/agents/converter/dist        ./dist
COPY --from=builder /app/packages/agents/converter/package.json ./package.json

# Install production deps only (devDeps excluded)
RUN npm install --omit=dev

# Non-root user
RUN addgroup --system converter && adduser --system --ingroup converter converter
USER converter

EXPOSE 8080

CMD ["node", "dist/index.js"]
