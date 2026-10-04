# ADR-006: React and Vite SPA, separate from the domain map

## Status

Accepted

Accepted with the Physical Architecture v1 baseline. The decision is unchanged by the v0.2 refinement. It does not create `apps/web`.

## Context

The production UI is an authenticated workspace: dashboards, capture forms, and a weekly reading. Search-engine indexing does not matter. The owner may use a desktop browser or an Android phone browser. A later field client may be a PWA. The team already builds `apps/domain-map` with React, TypeScript, and Vite.

The discovery map and the ranch system have different jobs ([ADR-001](ADR-001-domain-maps-as-code.md)). The map is how the team draws AS-IS and TO-BE. It is not a module of the monolith and it is not the owner's application.

## Decision

Build the production UI as a React + TypeScript + Vite single-page application.

- The future application lives at `apps/web`. This ADR does not create it.
- `apps/domain-map` stays the discovery tool. It does not become the production frontend, and the production frontend does not absorb the map.
- The SPA talks to the HTTP API in [ADR-009](ADR-009-api-style.md). It does not import domain entities from the API.
- Server state uses TanStack Query over a small `fetch` wrapper. UI state stays in the component and the URL. A global client-state framework is not part of the design.
- The first build is a responsive web app. An installable PWA shell may be added later if it stays a manifest and a cache of the application shell. It is not an offline write queue ([offline-readiness.md](../offline-readiness.md), [physical-architecture.md](../physical-architecture.md)).
- When `apps/web` is created, it uses the React, TypeScript, and Vite generation already in the workspace.

## Why a separate SPA

The owner-facing application is mostly forms behind a session. Rendering it on a server does not answer a ranch question. A Vite SPA keeps the UI build separate from the API process while still allowing one origin in production: the API serves the built files ([deployment-strategy.md](../deployment-strategy.md)). Development stays two processes, with the Vite server proxying `/api`.

The domain map remains `apps/domain-map` because its data is the team's maps, not the ranch's animals, weights, or expenses. Shipping those maps inside the owner's app would mix a design tool with operational records.

## Alternatives considered

### Next.js

Next.js adds a server runtime, a routing and data model, and a deployment shape centered on that server. SEO and public content are not requirements. Authenticated dashboards do not need React Server Components. A second Node application beside the API would blur the boundary ADR-005 keeps between HTTP and the domain, or it would duplicate the API. Next.js is not selected.

### Another UI framework

Svelte, Solid, and similar frameworks can host this UI. They would drop the React experience the team already has in `apps/domain-map` without removing a constraint React cannot meet. They are not selected.

### Making the domain map the production app

The map's job is discovery. The ARCHITECTURE tab stays a placeholder. Reusing that shell for herd, finance, and evidence would couple interviews to operational data. It is not selected.

## Consequences

- Two frontend apps can coexist in the npm workspaces: `apps/domain-map` now, `apps/web` later. They do not share a screen tree.
- API contracts, when the web app exists, live in a contract package the UI can import ([ADR-009](ADR-009-api-style.md)). The UI model may match a contract and still is not a domain entity.
- TanStack Query owns cache, retry, and invalidation after a command. It is not a place to store herd rules.
- Redux and other global stores are not introduced because the app might grow. Add a store only for UI state that the URL and the component tree cannot hold.
- PWA install support, if added, caches the shell. Business reads and writes still go to the API while the device is online. Offline command queues remain [AQ-P2-003](../architecture-open-questions.md).

## When to revisit

- The product gains a public, indexable site that must be rendered on a server.
- A field client needs a UI technology the SPA cannot share, and that client is an explicit product decision.
- TanStack Query is no longer maintained and a thinner fetch wrapper would replace it without a new global store.

Do not revisit it because a framework offers server rendering, or because the domain map and the owner app would be convenient to merge.

## Status of this document

- Version: 0.1
- Status: Accepted with the Physical Architecture v1 baseline. Decision unchanged by the v0.2 refinement
- Last updated: 2026-10-04
- Source: Logical Architecture v1 baseline, current `apps/domain-map` stack
- Validation: Decision only. `apps/web` is not created. `apps/domain-map` is unchanged
