FROM node:20-slim

RUN npm install -g pnpm

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @ukfreecomps/converter build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

WORKDIR /app/packages/agents/converter
CMD ["node", "dist/index.js"]
