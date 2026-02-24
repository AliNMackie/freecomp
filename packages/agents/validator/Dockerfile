FROM node:20-slim

RUN npm install -g pnpm@9

WORKDIR /app

COPY . .

# Skip Chromium download during install (since we don't need it in this agent)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @ukfreecomps/validator build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

WORKDIR /app/packages/agents/validator
CMD ["node", "dist/index.js"]
