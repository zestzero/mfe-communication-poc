# Communication flow

Mitt delivery is synchronous and in-process. Command handlers may be asynchronous because login talks to the host's HTTP API. There is no replay, persistence, or exactly-once guarantee. Contract version is `1`. A message whose `version` is not `1` fails Zod validation and is recorded on the runtime instead of being emitted.

```mermaid
sequenceDiagram
  participant Browser
  participant Host
  participant SDK as communication runtime
  participant Product
  participant Cart
  Browser->>Host: GET /products Cookie session and locale
  Host->>SDK: createRuntime(snapshot, runtimeId) for this request
  Host->>Product: SSR Catalog inside that runtime
  Product-->>Browser: HTML includes the localized product name
  Browser->>SDK: ensureBrowserRuntime(snapshot, same runtimeId)
  Product->>SDK: publish cart.item.add.requested
  Cart->>SDK: CartController adds a line on the runtime object
  Cart->>SDK: publish cart.updated
  SDK-->>Host: header badge
```

## SSR and hydration

```mermaid
sequenceDiagram
  participant Edge as HTTP request
  participant Loader as layout loader
  participant Provider as PlatformProvider
  participant Remote as federated component
  Edge->>Loader: cookies and URL
  Loader-->>Provider: snapshot plus runtimeId
  Provider->>Provider: server createRuntime(snapshot, runtimeId)
  Provider->>Remote: React context
  Note over Edge,Remote: Response embeds the same loader data
  Edge->>Provider: hydrate with that snapshot and runtimeId
  Provider->>Provider: browser runtime created once with that id
```

The server render and the first client render use the same `runtimeId` from the loader, so the debug panel does not mismatch. Each request constructs its own runtime. The browser keeps one runtime for the document.

## Authentication

```mermaid
sequenceDiagram
  participant Header
  participant SDK
  participant API as POST /api/session
  Header->>SDK: requestLogin username and password
  Note over SDK: Bus payload keeps username only
  SDK->>API: password stays in the host handler
  API-->>SDK: Set-Cookie platform_session HttpOnly
  SDK->>SDK: applyAuth safe user projection
  SDK-->>Header: auth.changed
```

Mock passwords live only in `apps/host/server/modern.server.ts`. The shared store never receives them. Logout is `DELETE /api/session`, then `auth.changed` to anonymous, and the cart controller clears lines for that runtime. A later production system can replace the cookie with an opaque session id issued by OAuth 2.0 or OpenID Connect. The projection in the store stays `{ id, displayName, roles }`.

## Language

```mermaid
sequenceDiagram
  participant Actor as Host selector or Profile
  participant SDK
  participant MFEs
  Actor->>SDK: language.change.requested
  SDK->>SDK: host sets platform_locale cookie and applyLanguage
  SDK-->>MFEs: language.changed
  Note over MFEs: Each dictionary reads useLanguage
```

Refreshing the document sends the cookie, and the SSR HTML is already in that locale.

## Cross-MFE cart

The product MFE does not import the cart app. It publishes `cart.item.add.requested`. `CartController` stays mounted on every host page, owns the line items on the runtime object (`Symbol.for('@platform/cart-lines')`), and publishes `cart.updated`. The host badge stores only `{ count }`.

Navigation commands are checked with `isSafeDestination`. External URLs and unknown paths are rejected. `/cart` and `/profile` also require an authenticated snapshot. The host then updates the visible route with `history.pushState` and renders the matching remote without a full reload. A direct URL load still goes through Modern.js SSR.
