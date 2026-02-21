# Monorepo

A Turborepo-powered monorepo managed with **pnpm**. This scaffold provides a Next.js 14 web application, a shared UI component library, and three stub agent packages ready for future development.

---

## Structure

```
monorepo/
├── apps/
│   └── web/                  # Next.js 14 app (App Router, Tailwind, ISR-ready)
├── packages/
│   ├── ui/                   # Shared React component library (@repo/ui)
│   ├── agents/
│   │   ├── scout/            # Scout agent stub (@repo/agents-scout)
│   │   ├── converter/        # Converter agent stub (@repo/agents-converter)
│   │   └── validator/        # Validator agent stub (@repo/agents-validator)
│   ├── eslint-config/        # Shared ESLint configuration (@repo/eslint-config)
│   └── typescript-config/    # Shared TypeScript tsconfig bases (@repo/typescript-config)
```

---

## Apps

### `apps/web`

The primary customer-facing application. Built with:

- **Next.js 14** with the [App Router](https://nextjs.org/docs/app)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **ISR (Incremental Static Regeneration)** — pages opt-in via `export const revalidate = 60` in route segments

Start the dev server:

```bash
pnpm dev --filter=web
```

---

## Packages

### `packages/ui`

Shared React components consumed by `apps/web` (and any future apps). Exported under the `@repo/ui` namespace.

### `packages/agents/scout`

Future Node.js/TypeScript agent responsible for scouting/discovering data sources.

### `packages/agents/converter`

Future Node.js/TypeScript agent responsible for converting/transforming data.

### `packages/agents/validator`

Future Node.js/TypeScript agent responsible for validating data integrity.

### `packages/eslint-config`

Shared ESLint rule sets used across all apps and packages.

### `packages/typescript-config`

Shared `tsconfig.json` bases (`base.json`, `nextjs.json`, `react-library.json`) extended by each package.

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Run all dev servers
pnpm dev

# Build everything
pnpm build

# Type-check everywhere
pnpm check-types
```

---

## Adding a New App or Package

1. Create the directory under `apps/` or `packages/`
2. Add a `package.json` with a scoped name (`@repo/...`)
3. Run `pnpm install` from the root — the workspace will resolve it automatically

---

*Initial scaffold created: feat: scaffold monorepo*
