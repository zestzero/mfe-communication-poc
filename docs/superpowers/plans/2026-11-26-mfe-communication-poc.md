# SSR Microfrontend Communication PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a pnpm monorepo where a Modern.js v3 host stream-renders a page on port 3000 and composes three independently built Rsbuild React microfrontends that communicate through a shared Mitt bus and a Zustand vanilla store, with Zod contracts, Vitest, and Playwright.

**Architecture:** The host is the only composer. It loads `product/ProductPanel`, `cart/CartPanel`, and `profile/ProfilePanel` through the official `@module-federation/modern-js-v3` runtime (`createLazyComponent` from `@module-federation/modern-js-v3/data-fetch`). No app imports another app's source. Cross-MFE messages are Zod-parsed `AppEvent` values. `publish` updates one Zustand vanilla store and emits the same event on one Mitt bus. Both objects live on `globalThis` under `Symbol.for('@mfe/communication-sdk/runtime')` so copies that share a JavaScript realm still see one runtime, and Module Federation `shared.singleton` is configured so the host provides React and `@mfe/communication-sdk`.

**Tech Stack:** pnpm 10.33.4, Node 22, TypeScript 5.9, React 19.3.1 (Modern.js 3.12 peers on `react@^19.3.1`; the MF plugin allows `>=17`), Modern.js 3.12 (`@modern-js/app-tools`, `@modern-js/runtime`), Module Federation 2.9 (`@module-federation/modern-js-v3`, `@module-federation/rsbuild-plugin`), Rsbuild 2.3, Zod 3.25, Mitt 3, Zustand 5, Vitest 3.2, Playwright 1.65.

## Global Constraints

- Repository name / root package: `mfe-communication-poc`.
- Host: Modern.js v3, streaming SSR (`server.ssr.mode: 'stream'`), official Module Federation 2.0 plugin, port 3000.
- Remotes are React apps built with Rsbuild, not by importing each other: product 3001, cart 3002, profile 3003.
- Shared packages: `@mfe/communication-sdk` (Mitt + Zustand vanilla), `@mfe/contracts` (Zod), `@mfe/tsconfig`.
- Component-level exposes only. Do not use `createBridgeComponent` or `createRemoteAppComponent` (those cannot SSR).
- Configure Modern.js and Module Federation only with APIs documented by modernjs.dev and module-federation.io. Pinned versions above are published stable releases; the MF Modern.js plugin declares React `>=17` and TypeScript `^4.9 || ^5 || ^6 || ^7`, and its own test stack is React 18.3.1.
- Each app and package has a `build` script. Vitest covers contracts, the SDK, each app's pure data, and a boundary check. Playwright covers the composed page.
- Docs: `docs/architecture.md`, `docs/communication-flow.md`, `docs/poc-findings.md`.
- Commit `pnpm-lock.yaml`.
- If a remote cannot emit an SSR container, document the official alternatives and keep the smallest viable path: streaming SSR of the host shell plus the documented lazy remote loader.

The uploaded spec file was not present at `/agent/uploads/…3e77.txt` when implementation started. This plan follows the task summary and the official Modern.js / Module Federation guides. `docs/poc-findings.md` answers the questions in the last section of this plan.

---

## File structure

- `pnpm-workspace.yaml`, `package.json`, `.npmrc`, `.nvmrc`, `.gitignore`, `README.md`, `playwright.config.ts`, `vitest.boundaries.config.ts`, `e2e/storefront.spec.ts`
- `packages/tsconfig/base.json`, `packages/tsconfig/react.json`
- `packages/contracts` — Zod schemas, demo users, `formatPrice`
- `packages/communication-sdk` — runtime singleton, `publish`, `onAny`, cart reduce
- `apps/product` — Rsbuild remote, exposes `./ProductPanel`, port 3001
- `apps/cart` — Rsbuild remote, exposes `./CartPanel`, port 3002
- `apps/profile` — Rsbuild remote, exposes `./ProfilePanel`, port 3003
- `apps/host` — Modern.js consumer, port 3000, header + three slots + debug panel
- `docs/architecture.md`, `docs/communication-flow.md`, `docs/poc-findings.md`

Apps may depend on `@mfe/contracts` and `@mfe/communication-sdk` only. The boundary test fails if any app imports `@mfe/host`, `@mfe/product`, `@mfe/cart`, `@mfe/profile`, or another app directory.

## Interfaces

```ts
type Product = { id: string; name: string; description: string; priceCents: number };
type CartItem = { productId: string; name: string; priceCents: number; quantity: number };
type User = { id: string; displayName: string; email: string };
type Source = 'host' | 'product' | 'cart' | 'profile';
type AppEvent =
  | { type: 'catalog.product.selected'; source: Source; product: Product }
  | { type: 'cart.item.added'; source: Source; item: CartItem }
  | { type: 'cart.item.removed'; source: Source; productId: string; name: string }
  | { type: 'profile.user.switched'; source: Source; user: User };

function publish(input: unknown): AppEvent; // throws ZodError, does not emit
function onAny(handler: (event: AppEvent) => void): () => void;
function resetCommunication(): void;
function cartCount(items: readonly CartItem[]): number;
function cartTotalCents(items: readonly CartItem[]): number;
const appStore: StoreApi<AppState>;
```

Host MF config (documented shape):

```ts
createModuleFederationConfig({
  name: 'host',
  remotes: {
    product: 'product@http://127.0.0.1:3001/mf-manifest.json',
    cart: 'cart@http://127.0.0.1:3002/mf-manifest.json',
    profile: 'profile@http://127.0.0.1:3003/mf-manifest.json',
  },
  shared: {
    react: { singleton: true, eager: true },
    'react-dom': { singleton: true, eager: true },
    '@mfe/communication-sdk': { singleton: true, eager: true },
  },
});
```

Remote MF config:

```ts
pluginModuleFederation({
  name: 'product',
  filename: 'remoteEntry.js',
  exposes: { './ProductPanel': './src/ProductPanel.tsx' },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
    '@mfe/communication-sdk': { singleton: true },
  },
});
```

Host consumption (module-federation.io quick start + modernjs.dev SSR page):

```ts
createLazyComponent({
  loader: () => import('product/ProductPanel'),
  instance,
  loading: 'Loading the product atelier…',
  export: 'ProductPanel',
  fallback: ({ error }) => ...,
});
```

`lazyLoadComponentPlugin()` is registered once from `@module-federation/modern-js-v3/data-fetch`.

---

### Task 1: Workspace

- [ ] Add the root toolchain files and `@mfe/tsconfig`.
- [ ] `pnpm install` must create `pnpm-lock.yaml`.

### Task 2: Contracts

- [ ] Schemas and `formatPrice` with Vitest covering a valid event, a rejected event, currency formatting, and the demo users.
- [ ] Run `pnpm --filter @mfe/contracts test` and `pnpm --filter @mfe/contracts build`.

### Task 3: Communication SDK

- [ ] `publish` validates, reduces cart quantity, switches the user without clearing the cart, appends a log row, and emits Mitt.
- [ ] Two `getRuntime()` calls return the same bus and store.
- [ ] Run `pnpm --filter @mfe/communication-sdk test` and `build`.

### Task 4: Product MFE

- [ ] Rsbuild app on 3001. Standalone `src/index.tsx` and exposed `ProductPanel`.
- [ ] Selecting a product publishes `catalog.product.selected`. Add publishes `cart.item.added` with quantity 1.
- [ ] `pnpm --filter @mfe/product build` and `test` pass with the other apps stopped.

### Task 5: Cart MFE

- [ ] Rsbuild app on 3002. Renders store lines, total, and remove.
- [ ] Remove publishes `cart.item.removed`.
- [ ] `pnpm --filter @mfe/cart build` and `test` pass alone.

### Task 6: Profile MFE

- [ ] Rsbuild app on 3003. Shows the store user, the selected product name, and a switch button.
- [ ] Switch publishes `profile.user.switched` with the other demo user.
- [ ] `pnpm --filter @mfe/profile build` and `test` pass alone.

### Task 7: Host

- [ ] `modern.config.ts` uses `appTools()`, `moduleFederationPlugin()`, `server.port: 3000`, and `server.ssr.mode: 'stream'`.
- [ ] Page renders the header (user + cart count), three remote slots, and a debug panel that lists the store log and a Mitt delivery count.
- [ ] `pnpm --filter @mfe/host build` passes without a running remote (no type download). If `dts` must be disabled, use the documented `dts: false` option only after confirming it exists on `createModuleFederationConfig`.

### Task 8: E2E, docs, and the SSR limitation check

- [ ] Playwright starts all four dev servers, asserts the SSR HTML contains the header and the initial user, then in the browser adds a product, sees the cart and the header count update, sees the debug row, selects a product and sees it in profile, switches user, and removes the line.
- [ ] Curl or Playwright `request.get` records whether remote markup is in the SSR HTML.
- [ ] If Rsbuild remotes do not SSR, write the finding: official alternatives are a Modern.js producer with `server.ssr.mode: 'stream'` or an Rslib producer with `pluginModuleFederation(..., { target: 'dual' })`. Rsbuild apps only document `target: 'node'` for a single environment, and `target: 'dual'` is limited to Rslib/Rspress. Smallest viable path is the streaming host plus client remote hydration. Set `noSSR: true` on `createLazyComponent` only if the stream request fails without it.
- [ ] Fill `docs/architecture.md`, `docs/communication-flow.md`, and `docs/poc-findings.md`.
- [ ] `pnpm install`, `pnpm build`, `pnpm test`, and `pnpm test:e2e` all pass.
- [ ] Screenshot the running host showing the header, three MFEs, and the debug panel.

## Findings questions

`docs/poc-findings.md` must answer each of these:

1. Can the Modern.js v3 host stream-SSR a page that composes the three Rsbuild remotes?
2. Does remote component HTML appear in the SSR response, or only the host shell?
3. Which official producer setups support Module Federation SSR, and why was the chosen alternative the smallest viable one?
4. Can the microfrontends exchange events without importing another app's source?
5. Do Mitt and the Zustand store stay singletons across the host and the remotes in the browser?
6. What did Module Federation `shared` change, compared with the `globalThis` runtime?
7. Does the bus run during SSR, and is the store safe across requests?
8. What happens when a remote dev server is down?
9. Were there hydration mismatches?
10. Can each MFE build on its own?
11. How do remote styles arrive, and is there a flash?
12. What remains unsafe for a production multi-tenant deployment?
