# RANCHO

RANCHO is a ranch operations and decision-support project.

## Current phase

Domain discovery and process modeling.

The production ranch application has not been designed yet. This repository currently holds an internal tool for exploring processes and, later, architecture. It does not include a backend, authentication, or a database.

## Domain discovery

The working ranch context is in [docs/domain/README.md](docs/domain/README.md). It separates known facts, current practice, business rules, pain points, future goals, hypotheses, and open questions. The current-state map is documented in [docs/maps/as-is/README.md](docs/maps/as-is/README.md) and shown in the AS-IS view. TO-BE domain design v0.1 is in [docs/maps/to-be/README.md](docs/maps/to-be/README.md). It is not an approved scope and it is not implemented in the app. Architecture is still empty. Update the domain notes when a new interview changes what is understood.

## Repository areas

- `apps/domain-map` — interactive map for AS-IS processes, future TO-BE alternatives, and software architecture.
- `docs/domain` — ranch context from discovery interviews. See [docs/domain/README.md](docs/domain/README.md).
- `docs/maps` — supporting map notes for as-is, to-be, and architecture views.
- `docs/architecture` — architecture decisions. Maps are kept as code; see `docs/architecture/adr/ADR-001-domain-maps-as-code.md`.

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
