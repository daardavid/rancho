# RANCHO

RANCHO is a ranch operations and decision-support project.

## Start here

Read [docs/START-HERE.md](docs/START-HERE.md) before product, domain, architecture, or implementation work.

## Current phase

The design phase is closed. The frozen baseline is [docs/checkpoints/design-v1.md](docs/checkpoints/design-v1.md).

The current phase is MVP Framing, proposed in [docs/product/mvp-framing.md](docs/product/mvp-framing.md). The first increment, [INC-001](docs/product/increments/INC-001-ficha-y-pesaje.md), is built by the repository factory in [fabrica/](fabrica/README.md), with agent rules in [AGENTS.md](AGENTS.md).

## Domain discovery

The working ranch context is in [docs/domain/README.md](docs/domain/README.md). It separates known facts, current practice, business rules, pain points, future goals, hypotheses, and open questions. The current-state map is documented in [docs/maps/as-is/README.md](docs/maps/as-is/README.md) and shown in the AS-IS view. TO-BE domain design v0.2 is in [docs/maps/to-be/README.md](docs/maps/to-be/README.md). It is not an approved scope and it is not implemented in the app. The architecture index is [docs/architecture/README.md](docs/architecture/README.md). Update the domain notes when a new interview changes what is understood.

## Repository areas

- `apps/api` — the modular monolith (`@rancho/api`). Fastify at the edge, the shared kernel, and the ranch modules. Today it is a skeleton: no database, no session, no herd rules.
- `apps/web` — the owner-facing application (`@rancho/web`). React, Vite, TanStack Query. Today it only shows whether the API responds.
- `packages/api-contracts` — the Zod contracts shared by the API and the web (`@rancho/api-contracts`).
- `apps/domain-map` — interactive map for AS-IS processes, future TO-BE alternatives, and software architecture. It is not the ranch application.
- `docs/domain` — ranch context from discovery interviews. See [docs/domain/README.md](docs/domain/README.md).
- `docs/maps` — supporting map notes for as-is, to-be, and architecture views.
- `docs/architecture` — logical baseline and the Physical Architecture v1 baseline. Maps are kept as code; see `docs/architecture/adr/ADR-001-domain-maps-as-code.md`.

`apps/domain-map` is not a production system. The current-state map is documented in [docs/maps/as-is/README.md](docs/maps/as-is/README.md) and [docs/maps/as-is/process-catalog.md](docs/maps/as-is/process-catalog.md).

## Requirements

Node.js `^20.19.0` or `>=22.12.0`. This workspace was bootstrapped with Node.js 24.21.0 LTS.

## Install

```bash
npm install
```

One install at the root covers every workspace. There is no per-app install.

## Run the API and the web app

Two terminals, both from the repository root:

```bash
npm run dev:api    # API on http://127.0.0.1:3000
npm run dev:web    # web app on http://localhost:5173
```

Open [http://localhost:5173/](http://localhost:5173/). The web app asks the API for `GET /api/health`; the Vite dev server proxies `/api` to `127.0.0.1:3000`, so there is no URL to configure and no CORS.

If the API is not running, the web app says it could not reach it and offers a retry. That is the expected behavior, not a bug in the page.

The API reads two optional variables: `PORT` (default `3000`) and `HOST` (default `127.0.0.1`). It has no `.env` file yet and no database connection.

Check the API by hand:

```bash
curl http://127.0.0.1:3000/api/health
# {"ok":true}
```

## Run the map

```bash
npm run dev:map
```

Vite serves the app at [http://localhost:5173/](http://localhost:5173/). Run the map and the web app one at a time, or change the web port with `npm run dev:web -- --port 5174`.

## Checks

```bash
npm run lint       # oxlint in every workspace
npm run typecheck  # tsc --noEmit in the API, the web app, and the contracts
npm test           # Vitest in the API, the web app, and the contracts
```

The API suite includes the import-boundary test from [ADR-012](docs/architecture/adr/ADR-012-repository-module-enforcement.md). It scans `apps/api/src` and fails when code outside a module reaches into `modules/*/domain`, `modules/*/persistence`, or another module's internal application, and when a `domain/` file imports Fastify, Drizzle, an auth library, or frontend code.

Map-only commands are kept separate:

```bash
npm run build:map
npm run lint:map
```

## Where things live inside the API

`apps/api/src` follows [docs/architecture/repository-structure.md](docs/architecture/repository-structure.md):

- `shared-kernel/` — ids, source quality, actors, version, and the kilogram text conversion.
- `modules/` — `herd` and `growth`. Empty for now.
- `application/` — orchestrators for captures that write to more than one module.
- `read-models/` — cross-module reads.
- `infrastructure/` — Drizzle factories, identity, and other adapters.
- `http/` — Fastify app, request id, and thin routes.
