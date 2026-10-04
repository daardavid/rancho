# Repository structure

Future shape of the repository. This document does not create directories or change package manifests.

The workspace already uses npm workspaces for `apps/*` and `packages/*`. `apps/domain-map` (`@rancho/domain-map`) is the discovery application. It stays. The production UI and the API are later apps.

## Intended tree

```text
apps/
  domain-map/          # AS-IS and TO-BE maps. Not a ranch module
  web/                 # production SPA. Not created
  api/                 # modular monolith. Not created
    src/
      http/            # Fastify routes, thin
      application/     # orchestrators
      modules/
        herd/
        growth/
        feeding/
        inventory/
        finance/
      read-models/
      shared-kernel/
      identity/        # session library integration
      ports/
      adapters/
packages/
  api-contracts/       # Zod contracts, created with apps/web
```

Each domain module, when it exists:

```text
modules/herd/
  domain/              # invariants, no framework imports
  application/         # commands and queries
  persistence/         # Drizzle tables and repositories
  index.ts             # only supported import path
```

Orchestrators live in `application/`, not in a module and not in the shared kernel. Names already used conceptually: `RecordCattleSale`, `RecordFeedPurchase`, `PrepareFeedBatch`, `RecordCattlePurchase` ([context-map.md](context-map.md)).

## Why modules are directories

A two-person team can enforce a boundary with a public index and a test ([ADR-012](adr/ADR-012-repository-module-enforcement.md)). A workspace package per module adds a build graph inside one deployable. The transaction type would become a package of its own. That ceremony does not make Herd's rules clearer.

`packages/shared-kernel` waits until a second runtime must import branded ids. Until then, `apps/api/src/shared-kernel` holds `AnimalId`, `PaddockId`, the evidence id, source quality, recorded-time primitives, the optimistic version, `RecordedBy`, and `ReportedBy`. It does not hold aggregates, orchestrators, or DTOs.

`packages/api-contracts` waits until `apps/web` exists. The UI imports contracts. It does not import `modules/*/domain`.

## Import rules

| From | May import | Must not import |
| --- | --- | --- |
| `http/` | Orchestrators, module public indexes, identity, read-model functions, contracts | `modules/*/persistence`, `modules/*/domain` |
| `application/` orchestrators | Module public indexes, the transaction type | Another module's persistence |
| `modules/X/domain` | Shared kernel | Fastify, Drizzle, another module, adapters |
| `modules/X/application` | Own domain, own persistence, shared kernel, transaction type | Another module's `domain/` or `persistence/` |
| `modules/X/persistence` | Own domain, shared kernel, Drizzle | Another module |
| `read-models/` | Table definitions for `SELECT`, shared kernel | Write repositories, domain commands |
| `adapters/` | Ports | Domain entities beyond the normalized command the port already names |
| `apps/domain-map` | Its own map data | `apps/api` |

Growth may call a Herd public query when a session must know which animals are active. That call goes through Herd's `index.ts`. The orchestrator passes ids whenever it already has them. A module does not call another module's write function. The orchestrator does.

Fastify plugins register HTTP behavior. They are not the five folders above.

## Enforcement

The import test described in [ADR-012](adr/ADR-012-repository-module-enforcement.md) is the check. It is written when `apps/api` exists, not before. A lint rule in the API's single linter may repeat it. The discovery app uses oxlint. The API should not introduce a second linter only to draw the boundary.

## What stays out of the tree for now

`apps/web`, `apps/api`, `packages/api-contracts`, module folders, ESLint configs, dependency-cruiser, and Docker files are not created by the physical design.

## Status

- Version: 0.1
- Status: Proposed layout. No directories created
- Last updated: 2026-10-04
- Source: [ADR-012](adr/ADR-012-repository-module-enforcement.md)
- Validation: Package manifests and `apps/domain-map` are unchanged
