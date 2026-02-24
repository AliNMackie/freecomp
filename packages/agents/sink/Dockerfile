FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9

WORKDIR /app

# Copy the entire monorepo to ensure all workspace dependencies and manifests are present
COPY . .

# Skip Chromium download during install (since we don't need it in this agent)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install all dependencies (frozen lockfile for stability)
RUN pnpm install --frozen-lockfile

# Build the sink agent (and shared if needed)
RUN pnpm --filter @ukfreecomps/sink build

# Runtime config
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run from the package directory
WORKDIR /app/packages/agents/sink
CMD ["node", "dist/index.js"]
