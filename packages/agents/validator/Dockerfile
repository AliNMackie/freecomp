FROM node:20-slim

RUN npm install -g pnpm

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @ukfreecomps/validator build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

WORKDIR /app/packages/agents/validator
CMD ["node", "dist/index.js"]
