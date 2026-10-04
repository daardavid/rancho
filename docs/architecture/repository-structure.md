# Repository structure

Future shape of the repository. This document does not create directories or change package manifests.

The workspace already uses npm workspaces for `apps/*` and `packages/*`. `apps/domain-map` (`@rancho/domain-map`) is the discovery application. It stays. The production UI and the API are later apps.

## Intended tree

```text
apps/
  domain-map/          # AS-IS and TO-BE maps. Not a ranch module
  api/                 # modular monolith. Not created
    src/
      shared-kernel/
      modules/
        herd/
        growth/
        feeding/
        inventory/
        finance/
      application/     # orchestrators
      read-models/
      infrastructure/  # Drizzle factories, identity, evidence, other adapters
      http/            # Fastify routes, thin
  web/                 # production SPA. Not created
packages/
  api-contracts/       # Zod contracts, created with apps/api and apps/web
```

Each domain module, when it exists:

```text
modules/herd/
  domain/              # invariants. No Fastify, Drizzle, auth library, or frontend imports
  application/         # commands and queries. Repository interfaces. No Drizzle transaction
  persistence/         # Drizzle tables, repository implementations, factories
  index.ts             # only supported import path
```

Orchestrators live in `application/`, not in a module and not in the shared kernel. Names already used conceptually: `RecordCattleSale`, `RecordFeedPurchase`, `PrepareFeedBatch`, `RecordCattlePurchase` ([context-map.md](context-map.md)).

Identity integration and the evidence adapter live under `infrastructure/`. They are not domain modules.

## Why modules are directories

A two-person team can enforce a boundary with a public index and a mandatory Vitest import test ([ADR-012](adr/ADR-012-repository-module-enforcement.md)). A workspace package per module adds a build graph inside one deployable. That ceremony does not make Herd's rules clearer.

The shared kernel stays a directory inside `apps/api`. `packages/shared-kernel` is not part of the scaffold. `apps/api/src/shared-kernel` holds `RanchId`, `AnimalId`, `PaddockId`, the evidence id, source quality, recorded-time primitives, the optimistic version, `RecordedBy`, and `ReportedBy`. `RanchId` is application scope ([ADR-013](adr/ADR-013-ranch-scope.md)). The kernel does not hold a Ranch aggregate, other aggregates, orchestrators, or DTOs.

`packages/api-contracts` waits until `apps/api` and `apps/web` exist. It holds request schemas, response schemas, and stable API enums that belong to the HTTP contract. It does not hold domain entities, repositories, Drizzle rows, or module internals. The UI imports contracts. It does not import `modules/*/domain`.

## Import rules

| From | May import | Must not import |
| --- | --- | --- |
| `http/` | Orchestrators, module public indexes, identity at the edge, read-model functions, contracts | `modules/*/persistence`, `modules/*/domain`, another module's internal application |
| `application/` orchestrators | Module public indexes | Drizzle, another module's persistence, a raw transaction object |
| `modules/X/domain` | Shared kernel | Fastify, Drizzle, the auth library, frontend code, another module |
| `modules/X/application` | Own domain, own repository interfaces, shared kernel, an explicitly allowed other-module public index | Drizzle, another module's `domain/`, `persistence/`, or internal application |
| `modules/X/persistence` | Own domain, own repository interfaces, shared kernel, Drizzle | Another module, Fastify, the auth library |
| `read-models/` | Table definitions for `SELECT`, shared kernel | Write repositories, domain commands |
| `infrastructure/` | Ports, Drizzle factories, the auth library at the identity edge | Domain rules that belong in a module |
| `apps/domain-map` | Its own map data | `apps/api` |

Growth may call a Herd public query when a session must know which animals are active. That call goes through Herd's `index.ts`. The orchestrator passes ids whenever it already has them. A module does not call another module's write function. The orchestrator does.

The orchestrator asks persistence to open one transaction and to build each module's repositories on it, then calls those modules' application services ([ADR-008](adr/ADR-008-data-access.md)). The application service receives the repository interfaces. It does not receive the Drizzle transaction.

Fastify plugins register HTTP behavior. They are not the five folders above.

## Enforcement

The import test described in [ADR-012](adr/ADR-012-repository-module-enforcement.md) is mandatory once `apps/api` exists. It is written with the API, not before. The API uses one linter. A second lint toolchain and dependency-cruiser are not added to draw this boundary. TypeScript project references per module are not the mechanism.

## What stays out of the tree for now

`apps/web`, `apps/api`, `packages/api-contracts`, module folders, ESLint configs, dependency-cruiser, and Docker files are not created by the physical design.

## Status

- Version: 0.2
- Status: Accepted conceptual layout for the Physical Architecture v1 baseline. No directories created
- Last updated: 2026-10-04
- Source: [ADR-012](adr/ADR-012-repository-module-enforcement.md), [ADR-013](adr/ADR-013-ranch-scope.md)
- Validation: Package manifests and `apps/domain-map` are unchanged
