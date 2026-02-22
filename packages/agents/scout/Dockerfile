# =============================================================================
# Builder stage
# Build context must be the monorepo root:
#   docker build -f packages/agents/scout/Dockerfile -t scout .
# =============================================================================
FROM node:20-slim AS builder

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY pnpm-lock.yaml          ./pnpm-lock.yaml
COPY pnpm-workspace.yaml     ./pnpm-workspace.yaml
COPY package.json            ./package.json

# Copy only the manifests of packages that scout depends on
COPY packages/agents/scout/package.json ./packages/agents/scout/package.json

# Puppeteer tries to download Chromium during npm/pnpm install — skip it here;
# we supply the system Chromium in the runtime stage instead.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install only scout's dependency tree (production deps only)
RUN pnpm install --frozen-lockfile --filter @ukfreecomps/scout

# Copy scout source
COPY packages/agents/scout/src ./packages/agents/scout/src

# =============================================================================
# Runtime stage
# =============================================================================
FROM node:20-slim AS runner

# Install Chromium and all shared libraries Puppeteer needs on Debian slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium and not to download its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

ENV NODE_ENV=production

WORKDIR /app

# Copy the installed node_modules and built source from builder
COPY --from=builder /app/packages/agents/scout/node_modules ./node_modules
COPY --from=builder /app/packages/agents/scout/src           ./src
COPY --from=builder /app/packages/agents/scout/package.json  ./package.json

# Run as non-root for security; Puppeteer requires --no-sandbox when non-root
RUN addgroup --system scout && adduser --system --ingroup scout scout
USER scout

EXPOSE 8080

CMD ["node", "src/index.js"]
