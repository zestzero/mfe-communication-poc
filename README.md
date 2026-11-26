# mfe-communication-poc

A Modern.js streaming host on port 3000 composes three independently deployable Modern.js microfrontends. They share `@platform/mfe-communication` 1.0.0 (Mitt plus a Zustand vanilla store) and `@platform/contracts` 1.0.0 (Zod). The debug panel lives in `@platform/debug-panel` and the host renders it.

| App | Package | Default port | Exposes |
| --- | --- | --- | --- |
| Host | `@platform/host` | 3000 | consumes remotes |
| Product | `@platform/product-mfe` | 3001 | `product/Catalog` |
| Cart | `@platform/cart-mfe` | 3002 | `cart/CartView`, `cart/CartController` |
| Profile | `@platform/profile-mfe` | 3003 | `profile/ProfileView` |

Mock login users are `mara` and `somchai`. The password `atelier` stays in the host server and is never written to the event bus. Languages are English and Thai.

## Local development

```bash
pnpm install
pnpm build
pnpm dev
```

Open [http://127.0.0.1:3000/products](http://127.0.0.1:3000/products).

Remote manifests are environment variables, not source constants. The committed `.env` files are local defaults:

```bash
PRODUCT_REMOTE_URL=http://127.0.0.1:3001/static/mf-manifest.json
CART_REMOTE_URL=http://127.0.0.1:3002/static/mf-manifest.json
PROFILE_REMOTE_URL=http://127.0.0.1:3003/static/mf-manifest.json
```

Copy `.env.example` if you move an app. `pnpm --filter @platform/product-mfe dev` starts that MFE alone. Its `/` route is a standalone adapter with a mock anonymous runtime and does not replace the host runtime when the component is federated.

## Checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm test:e2e
pnpm prove:split
```

`pnpm test` runs Vitest, including request-isolation and the boundary check that forbids `workspace:*` and cross-app imports. `pnpm prove:split` packs the shared packages, installs each app from those tarballs in `/tmp/mfe-separate-repos`, runs `modern build` and `modern serve` on ports 3100–3103, checks that the product name is in the server HTML, and runs the Playwright suite against that host.

## Docs

- [Architecture](docs/architecture.md)
- [Communication flow](docs/communication-flow.md)
- [Findings](docs/poc-findings.md)

## Separate repositories and versions

Apps declare `"@platform/contracts": "^1.0.0"` and the same for `@platform/mfe-communication` and `@platform/debug-panel`. Inside this workspace, pnpm links those versions because `.npmrc` sets `link-workspace-packages=true`. Outside it, publish or `pnpm pack` the packages and install the tarballs. Module Federation `requiredVersion` uses those same ranges (`^1.0.0`, and `^19.3.1` for React).

A contract mismatch is a failed Zod parse. Version `2` envelopes are rejected and shown in the debug panel. Ship breaking payload changes as `@platform/contracts` 2.0.0 so the federation range does not mix them into a 1.x page.

## Production notes

Run `pnpm build` and `pnpm start` (`modern serve`) per app. Set `PUBLIC_ORIGIN` to that app's public origin before the producer build so the manifest's `publicPath` and `ssrPublicPath` are absolute. Point the host's remote env vars at each deploy's `/static/mf-manifest.json`. `modern serve` publishes `dist/static` and `dist/bundles`; it does not publish `mf-manifest.json` from the dist root, which is why the producers write the manifest under `static/`. Each app's `server/tsconfig.json` turns emit back on for that folder, because the app tsconfig sets `noEmit` and otherwise `modern build` writes an empty `dist/server`. Producers add `Access-Control-Allow-Origin: *` so a host on another origin can fetch the manifest in the browser. Replace the host's `server/modern.server.ts` with an OIDC session that still sets an HttpOnly cookie and still returns only `{ id, displayName, roles }`.
