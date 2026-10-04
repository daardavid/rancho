# RANCHO

RANCHO is a ranch operations and decision-support project.

## Start here

Read [docs/START-HERE.md](docs/START-HERE.md) before product, domain, architecture, or implementation work.

## Current phase

The design phase is closed. The frozen baseline is [docs/checkpoints/design-v1.md](docs/checkpoints/design-v1.md).

The production ranch application is not implemented. This repository holds the discovery notes, the domain map, and the architecture documents. It does not yet include a backend, authentication, or a database.

## Domain discovery

The working ranch context is in [docs/domain/README.md](docs/domain/README.md). It separates known facts, current practice, business rules, pain points, future goals, hypotheses, and open questions. The current-state map is documented in [docs/maps/as-is/README.md](docs/maps/as-is/README.md) and shown in the AS-IS view. TO-BE domain design v0.2 is in [docs/maps/to-be/README.md](docs/maps/to-be/README.md). It is not an approved scope and it is not implemented in the app. The architecture index is [docs/architecture/README.md](docs/architecture/README.md). Update the domain notes when a new interview changes what is understood.

## Repository areas

- `apps/domain-map` — interactive map for AS-IS processes, future TO-BE alternatives, and software architecture.
- `docs/domain` — ranch context from discovery interviews. See [docs/domain/README.md](docs/domain/README.md).
- `docs/maps` — supporting map notes for as-is, to-be, and architecture views.
- `docs/architecture` — logical baseline and the Physical Architecture v1 baseline. Maps are kept as code; see `docs/architecture/adr/ADR-001-domain-maps-as-code.md`.

`apps/domain-map` is not a production system. The current-state map is documented in [docs/maps/as-is/README.md](docs/maps/as-is/README.md) and [docs/maps/as-is/process-catalog.md](docs/maps/as-is/process-catalog.md).

## Requirements

Node.js `^20.19.0` or `>=22.12.0`. This workspace was bootstrapped with Node.js 24.21.0 LTS.

## Run the map

```bash
npm install
npm run dev:map
```

Vite serves the app at [http://localhost:5173/](http://localhost:5173/).

## Build and lint

```bash
npm run build:map
npm run lint:map
```

The root scripts delegate to the `@rancho/domain-map` workspace.
