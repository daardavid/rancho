# RANCHO

RANCHO is a ranch operations and decision-support project.

## Current phase

Domain discovery and process modeling.

The production ranch application has not been designed yet. This repository currently holds an internal tool for exploring processes and, later, architecture. It does not include a backend, authentication, or a database.

## Repository areas

- `apps/domain-map` — interactive map for AS-IS processes, future TO-BE alternatives, and software architecture.
- `docs/domain` — domain notes. Empty until the ranch model is defined.
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
