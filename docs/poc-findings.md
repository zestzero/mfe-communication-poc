# PoC findings

These answers were measured on this repo with Modern.js 3.12.0, `@module-federation/modern-js-v3` 2.9.4, `@module-federation/rsbuild-plugin` 2.9.4, Rsbuild 2.3.5, and React 19.3.1. The uploaded spec file was not on disk when the work started, so the questions below are the ones fixed in the implementation plan from the task summary and the official Modern.js and Module Federation guides.

## 1. Can the Modern.js v3 host stream-SSR a page that composes the three Rsbuild remotes?

Yes for the shell, no for the remote component trees.

`GET /` returns `200` with `Transfer-Encoding: chunked`, `x-modernjs-render: server`, `content-type: text/html`, and a `server-timing` entry `bd-modern-js-ssr-render-html`. The inline bootstrap sets `"mode":"stream"`. The HTML includes the masthead (`data-testid="host-header"`), the name Mara Ellison, the basket count 0, and the debug panel. Playwright covers that without executing page JavaScript.

## 2. Does remote component HTML appear in the SSR response, or only the host shell?

Only the host shell, plus the loading strings from `createLazyComponent`.

The raw HTML contains `Loading the product atelier` and does not contain `Cedar Pour-Over`. After hydration the browser requests each `mf-manifest.json` and `remoteEntry.js`, then the exposed panel CSS and JS. The product names appear only after that.

## 3. Which official producer setups support Module Federation SSR, and why was this the smallest viable path?

Official docs checked before configuration:

- Modern.js SSR guide: both producer and consumer set `server.ssr.mode: 'stream'`. Application-level bridge modules cannot SSR. Consumers load component exports with `createLazyComponent`.
- Module Federation Modern.js quick start: `moduleFederationPlugin()`, `createModuleFederationConfig`, remotes pointed at `mf-manifest.json`.
- Rsbuild plugin reference: `pluginModuleFederation(options, { target })`. `target: 'dual'` is only supported as a global plugin in Rslib or Rspress. An Rsbuild app uses `target: 'node'` with `environment` for one environment. The deprecated `ssr: true` flag tells you to use `target: 'dual'`.

What this repo measured: each Rsbuild dev manifest has `remoteEntry.type: "global"` and no `ssrRemoteEntry`. With `noSSR` left off, the host log is:

`Failed to load Node.js entry for remote "product" from "http://127.0.0.1:3001/remoteEntry.js". self is not defined`

The SSR HTML then rendered the error fallback instead of the panel.

Alternatives:

| Option | Fits the spec? | Remote HTML in the stream? |
| --- | --- | --- |
| Make product, cart, and profile Modern.js apps with `server.ssr.mode: 'stream'` | Drops the Rsbuild MFE requirement | Yes, this is the documented producer |
| Rebuild them as Rslib libraries with `target: 'dual'` | They stop being Rsbuild apps with their own dev servers | Yes, this is the documented non-Modern producer |
| Hand-merge a Node build into `ssrRemoteEntry` | Invents a manifest the plugin does not emit for Rsbuild apps | Unverified |
| `createLazyComponent({ noSSR: true })` | Keeps Rsbuild apps, the Modern.js host, and streaming SSR of the shell | No |

`noSSR` is a field on `CreateLazyComponentOptions` in `@module-federation/bridge-react`, re-exported by `@module-federation/modern-js-v3/data-fetch`. That is the smallest path that still uses the official loader and keeps each MFE as an Rsbuild app.

## 4. Can the microfrontends exchange events without importing another app's source?

Yes. Product publishes `cart.item.added`. Cart renders the line. The host basket count becomes 1. Profile renders `Looking at Cedar Pour-Over` after `catalog.product.selected`. Switching the user updates the host masthead and the profile heading together, and the basket line stays. `boundaries.test.ts` scans every app source file and fails if it mentions another app's package name or directory. Playwright `storefront.spec.ts` drives the same path in Chromium.

## 5. Do Mitt and the Zustand store stay singletons across the host and the remotes in the browser?

Yes in the running page. One click updates the product panel, the cart panel, the masthead, and the debug log together. The debug counter (`Mitt deliveries`) increments from `onAny` while the log row comes from the Zustand store, so both objects see the event. Unit tests assert that two `getRuntime()` calls return the same bus and the same store, and that `resetCommunication()` keeps that store identity.

## 6. What did Module Federation `shared` change, compared with the `globalThis` runtime?

`shared` is configured for `react`, `react-dom`, and `@mfe/communication-sdk` (`singleton: true`, eager on the host). That is what keeps a single React copy, which hooks require.

The SDK additionally anchors the bus and the store on `globalThis` with `Symbol.for('@mfe/communication-sdk/runtime')`. Module Federation inferred `requiredVersion: workspace:*` from the workspace protocol and warned that version `0.0.0` did not satisfy it. Setting `requiredVersion: false` on that share turns the version check off. The symbol still unifies the runtime if the bundler evaluates the package twice in the same window.

## 7. Does the bus run during SSR, and is the store safe across requests?

The bus does not run during render. `publish` is only called from button clicks. The server and the first client render both read the initial state, so the masthead shows Mara Ellison and 0 without a hydration mismatch.

The store is not safe across requests. It lives on the process `globalThis`. A click cannot happen during SSR today, but any future server-side `publish` would leak into the next request. There is no per-request store.

## 8. What happens when a remote dev server is down?

The host document still stream-renders. `createLazyComponent`'s `fallback` renders `role="alert"` with the remote name and, when `errorType === ERROR_TYPE.LOAD_REMOTE`, the text "The remote dev server is not reachable." The other slots are independent components, so one failed loader does not replace the masthead or the debug panel. This was observed when `noSSR` was off and Node could not evaluate `remoteEntry.js`: the product slot showed the alert and the shell stayed intact.

## 9. Were there hydration mismatches?

No hydration warning was logged while loading the composed page, adding a line, and selecting a product. The shell's server HTML and first client render both use the untouched initial store. Remote panels are not in the server HTML. Their loading text is the server output, and the panels mount in the browser after `createLazyComponent` resolves.

A separate dev-only page error, `globalThis.rspackHotUpdatehost is not a function`, showed up on some loads while the host and remotes were rebuilding. It did not block the passing Playwright run once the dev servers were idle.

## 10. Can each MFE build on its own?

Yes. With the other dev servers ignored, these succeeded:

- `pnpm --filter @mfe/product build`
- `pnpm --filter @mfe/cart build`
- `pnpm --filter @mfe/profile build`
- `pnpm --filter @mfe/host build`

Each remote build writes its own `dist/mf-manifest.json` and `dist/remoteEntry.js`. The host build does not need the remotes to be running because `dts: false` skips remote type generation. Hand-written module declarations live in `apps/host/src/remote-modules.d.ts`.

## 11. How do remote styles arrive, and is there a flash?

Each expose emits a CSS file. The browser loaded, for example, `http://127.0.0.1:3001/static/css/async/__federation_expose_ProductPanel.css` with status 200. `lazyLoadComponentPlugin` is registered so the client runtime can inject those links with the component.

Because `noSSR` is on, those styles are not in the first HTML chunk. The shell paints immediately, and the panels paint when their CSS and JS arrive. There is a loading-text gap, not a flash of the panel's unstyled markup. The Modern.js guide's CSS-flicker fix (injecting producer CSS during SSR) needs a producer that actually SSR-renders. This setup cannot use that path.

## 12. What remains unsafe for a production multi-tenant deployment?

- The communication runtime is process-global on the server and window-global in the browser. It is not isolated per user or per tab.
- Remote URLs and `assetPrefix` are fixed to `http://127.0.0.1:3001` through `3003`. A deployed host would need real origins in the manifest public path.
- React 19.3.1 is required by Modern.js 3.12 (`@modern-js/utils` peers `react@^19.3.1`). `react-helmet@6` still declares a peer of React 16–18, and the federation runtime warns that the host's React 19.3.1 does not satisfy that range. The page still ran on one React 19 copy.
- Dev HMR can throw `rspackHotUpdatehost is not a function` while a rebuild is in flight.
- There is no authentication, persistence, or contract negotiation beyond the Zod parse in this process.
- Remote component HTML is absent from the stream, so a crawler that does not run JavaScript sees the shell and the loading text only.

## Versions that had to move

The Module Federation Modern.js package is developed against React 18.3.1, and its peer is `react >= 17`. Modern.js 3.12.0's own utils package peers `react@^19.3.1` and `react-server-dom-rspack` peers `react@^19.1.0`. The PoC uses React 19.3.1 so the host's declared peers match. TypeScript is pinned to 5.9.3, inside the plugin's `^5 || ^6 || ^7` range, rather than TypeScript 7.
