FROM node:20-slim

# Install system dependencies for Chromium
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

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/agents/scout/package.json ./packages/agents/scout/package.json

# Skip Chromium download during install
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN pnpm install --frozen-lockfile --filter @ukfreecomps/scout

COPY packages/agents/scout/src ./packages/agents/scout/src

ENV NODE_ENV=production
RUN addgroup --system scout && adduser --system --ingroup scout scout
USER scout

EXPOSE 8080
WORKDIR /app/packages/agents/scout
CMD ["pnpm", "start"]
