# PoC findings

Measured with Modern.js 3.12, `@module-federation/modern-js-v3` 2.9.4, React 19.3.1, and contract package 1.0.0. `GET /products` contains `Cedar Pour-Over` before any client JavaScript. Two concurrent requests, one for Mara in English and one for สมชาย in Thai, do not contain each other's name or product title.

## Why Mitt was chosen

The host and the MFEs need a tiny in-process bus for commands and facts that have already happened. Mitt is a few hundred bytes, has no store of its own, and makes subscription cleanup explicit. That matches transient UI events. It does not pretend to be a durable log.

## Why Zustand was chosen instead of Jotai or Redux

The shared context is one snapshot with three slices: auth, language, and navigation. Zustand's vanilla store gives `getState`, `setState`, and `subscribe` without a React binding, so the same store can be created per SSR request and then read with `useSyncExternalStore`. Jotai's atom graph is a poor fit for a single host-owned snapshot. Redux adds action boilerplate and a single global store, which is the opposite of per-request isolation. Cart lines are deliberately not in this store. The cart MFE keeps them on the runtime object.

## How the SDK guarantees runtime instance consistency

`PlatformProvider` creates the runtime. On the server it uses the `runtimeId` from the route loader. On the browser, `ensureBrowserRuntime` creates that id once and returns the same object afterward. Module Federation shares `@platform/mfe-communication` as a singleton at `^1.0.0`, so host and remotes call `useRuntime()` on that object. Playwright reads the same id from the debug panel and from `data-runtime-id` on the product.

## How SSR request isolation is achieved

`contextFromRequest` is a pure function of the `Cookie` header and the URL. The layout loader returns that snapshot plus a fresh `runtimeId`. `PlatformProvider` builds a new Zustand store from it for that render. Nothing user-specific is stored in a process-wide singleton. `runWithRequest` also puts a runtime in `AsyncLocalStorage` for non-React server work, and a unit test interleaves two of those scopes. The HTTP proof is the concurrent Playwright request test.

## How state ownership is enforced

Host-owned writes go through `applyAuth`, `applyLanguage`, and `applyNavigation`, which the host registers as command handlers. MFEs only import the public package and call `request*` or `publish`. `isSafeDestination` rejects protocol-relative and external URLs. Protected paths are refused while the snapshot is anonymous. Cart mutations happen in `CartController`. Product selection is `useState` inside the product component.

## How independently deployed MFEs handle contract version mismatches

Every envelope has `version: 1`, and `PlatformMessageSchema` rejects anything else. The rejected payload is stored as a validation error and is not emitted. `@platform/contracts` is semver `1.0.0`. Consumers depend on `^1.0.0`. A minor release may add optional fields. Zod strips unknown keys by default, so an older consumer ignores them. A new required field or a new event meaning is a major bump. The shared Module Federation range `^1.0.0` refuses a 2.x singleton, so a mismatched deploy fails visibly instead of mixing two contract copies in one page.

## What happens when an event consumer is unavailable

Mitt does not buffer. If `CartController` is not mounted, `cart.item.add.requested` is still recorded in the debug history and then dropped. No other MFE throws. If a remote server is down, `createLazyComponent`'s fallback renders an alert for that slot. Playwright aborts port 3003 and `/products` still shows the catalog and the header.

## Whether this approach scales to 20 or more MFEs

The host can mount more component remotes, and the bus does not get more expensive with idle subscribers. The costs that do grow are the shared singleton graph, the SSR fan-out to every producer on the critical path, and the contract review load. Twenty always-mounted SSR remotes would make the host's TTFB the sum of the slowest producers. Keep rarely used MFEs on a route that is not in the root layout, and keep only a headless controller mounted when a subscription must survive navigation. The cart controller is that pattern.

## When RxJS would be justified

RxJS is worth it when a stream needs debounce, retry, backpressure, or cancellation across time, for example typeahead against a flaky API. These UI commands are discrete and already completed or rejected. RxJS would hide the simple subscribe/unsubscribe lifecycle this PoC needs to test.

## Whether additional infrastructure is required for production

Yes, beyond this process.

- Replace the mock password table with an identity provider. Keep the HttpOnly session cookie and the safe user projection.
- Publish `@platform/contracts`, `@platform/mfe-communication`, and `@platform/debug-panel` to a registry. Do not rely on the monorepo link.
- Serve each MFE from its own origin and set the host's remote URL env vars to those manifests.
- Put a timeout and a circuit breaker around SSR remote loads so one slow producer cannot hold the stream.
- The cart lines are in memory for the document. A reload starts empty unless a real cart service is added behind `CartController`.
- `react-helmet@6`, pulled in by Modern.js, still declares a React 16–18 peer. The page runs on React 19.3.1, which Modern.js 3.12 requires.

## Mode A and Mode B

Mode A is a CSR remote: the server renders the shell and a loading or error string. Mode B is this repo. The producers are Modern.js apps with streaming SSR, component-level `exposes`, and `ssrRemoteEntry`. The host response for `/products` includes the product title. The host calls `registerShared` for React and the SDK because the server compilation consumes those singletons without publishing them into the share scope; otherwise each remote runs a second React and SSR throws on `useContext`. Hydration then uses the same runtime id. Client navigation uses Modern.js `Link`, `useNavigate`, and `<Outlet />`. React Router 7 wraps those location updates in `startTransition`. This app reads the shared store with `useSyncExternalStore`, and that hook forces a synchronous render, which discards the transition before the new route commits. The address bar moved and the next page module was fetched, while `useLocation` and the outlet stayed on the previous match. `src/modern.runtime.ts` sets `router.useTransitions` to `false`, which is the Modern.js switch for committing router state synchronously. The layout loader does not revalidate on client navigation, so the browser runtime created from its `runtimeId` survives. A direct URL load still stream-renders the requested route.
