# RANCHO

RANCHO is a ranch operations and decision-support project.

## Current phase

Domain discovery and process modeling.

The production ranch application has not been designed yet. This repository currently holds an internal tool for exploring processes and, later, architecture. It does not include a backend, authentication, or a database.

## Domain discovery

The working ranch context is in [docs/domain/README.md](docs/domain/README.md). It separates known facts, current practice, business rules, pain points, future goals, hypotheses, and open questions. It will feed the later AS-IS and TO-BE maps. It is not an approved scope, and it does not replace those maps. Update it when a new interview changes what is understood.

## Repository areas

- `apps/domain-map` — interactive map for AS-IS processes, future TO-BE alternatives, and software architecture.
- `docs/domain` — ranch context from discovery interviews. See [docs/domain/README.md](docs/domain/README.md).
- `docs/maps` — supporting map notes for as-is, to-be, and architecture views.
- `docs/architecture` — architecture decisions. Maps are kept as code; see `docs/architecture/adr/ADR-001-domain-maps-as-code.md`.

`apps/domain-map` is not a production system. The five AS-IS nodes (Compra, Entrada, Alimentación, Pesaje, Venta) are temporary scaffolding.

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
