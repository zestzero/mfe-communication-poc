# mfe-communication-poc

A pnpm monorepo that shows a Modern.js v3 host streaming a page and composing three React microfrontends. The host does not import the other apps. Product, cart, and profile publish Zod-checked events through `@mfe/communication-sdk`, which keeps one Mitt bus and one Zustand vanilla store for the page.

| App | Package | Port | Role |
| --- | --- | --- | --- |
| Host | `@mfe/host` | 3000 | Modern.js streaming SSR, Module Federation consumer |
| Product | `@mfe/product` | 3001 | Rsbuild remote, exposes `ProductPanel` |
| Cart | `@mfe/cart` | 3002 | Rsbuild remote, exposes `CartPanel` |
| Profile | `@mfe/profile` | 3003 | Rsbuild remote, exposes `ProfilePanel` |

Shared packages: `@mfe/contracts` (Zod), `@mfe/communication-sdk` (Mitt + Zustand vanilla), `@mfe/tsconfig`.

## Prerequisites

- Node.js 20.19.5 or newer (22 is pinned in `.nvmrc`)
- pnpm 10.33.4 (`corepack enable` then `corepack prepare pnpm@10.33.4 --activate`)

## Local development

```bash
pnpm install
pnpm --filter @mfe/contracts build
pnpm --filter @mfe/communication-sdk build
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Start the three remotes before the host if you launch them separately. The host stream-renders the masthead and the debug panel. The three panels load in the browser from their Rsbuild manifests. Each remote also runs on its own:

```bash
pnpm --filter @mfe/product dev
pnpm --filter @mfe/cart dev
pnpm --filter @mfe/profile dev
```

## Checks

```bash
pnpm build
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm test` runs every package and app Vitest suite, then the boundary check that fails if one app imports another app.

## Docs

- [Architecture](docs/architecture.md)
- [Communication flow](docs/communication-flow.md)
- [PoC findings](docs/poc-findings.md)
- [Implementation plan](docs/superpowers/plans/2026-11-26-mfe-communication-poc.md)
