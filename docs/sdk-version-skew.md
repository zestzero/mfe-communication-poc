# Cart-only `@platform/mfe-communication` version skew

This PoC keeps one workspace copy of the communication SDK. To show what happens when the platform publishes a new version and **only cart-mfe** adopts it, run an isolated install proof that packs concrete tarballs:

```bash
pnpm prove:cart-skew
```

The script restores the workspace SDK to `1.0.0` before it finishes.

## Scenario A — compatible minor (`1.1.0` on cart only)

- Host, product, and profile install `@platform/mfe-communication@1.0.0`.
- Cart installs `@platform/mfe-communication@1.1.0`.
- Module Federation shared config stays `singleton: true` with `requiredVersion: ^1.0.0`.
- The host still registers the SDK eagerly into the share scope.

**Expected load:** one runtime id and one `sdkPackageVersion` shared by the host debug panel and the cart view. Cart’s remote still carries a `1.1.0` shared fallback in its assets. With `requiredVersion: ^1.0.0`, Module Federation keeps a **single** singleton; this stack has been observed to select cart’s compatible `1.1.0` as the page-wide provider, so the shell reports `1.1.0` even when the host package install stayed on `1.0.0`. There are not two live communication runtimes. Run `pnpm prove:cart-skew` and trust the printed winner.

## Scenario B — breaking major (`2.0.0` on cart only)

- Host stack stays on `1.0.0` with `requiredVersion: ^1.0.0`.
- Cart installs `2.0.0` and its federation config requires `^2.0.0`.

**Expected load:** Module Federation logs that `2.0.0` from cart does not satisfy the host’s `^1.0.0` requirement. On this stack the hard signal is that share-scope warning (often repeated for host/product consumers). Markup may still appear, but the versions are not a compatible singleton contract. Gradual remote-only adoption of a **major** while the host still shares `^1.0.0` is unsafe.

## UI markers

- Host debug panel: `data-testid="sdk-package-version"`
- Cart view: `data-testid="cart-sdk-package-version"`
