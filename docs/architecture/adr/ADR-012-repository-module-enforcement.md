# ADR-012: Modules live inside the API, enforced by a public index and an import test

## Status

Accepted

Accepted with the Physical Architecture v1 baseline. It does not create `apps/api`, a package, or a lint configuration.

## Context

The monolith will not keep its boundaries by goodwill ([ADR-002](ADR-002-modular-monolith.md)). Orchestrators must call public application functions and must not reach into another module's tables ([ADR-003](ADR-003-application-orchestration.md)). The team is two people. A mechanism that needs a package graph, a second compiler project per module, or an extra architecture product is more ceremony than the boundary is worth until a lighter check has failed.

The repository is already npm workspaces (`apps/*`, `packages/*`). `apps/domain-map` is the discovery application. The production API does not exist yet.

## Decision

Keep the five domain modules as directories inside the future `apps/api` process.

Intended layout, not created by this ADR:

```text
apps/
  domain-map/                 # discovery maps; unchanged
  api/
    src/
      shared-kernel/
      modules/
        herd/
          domain/
          application/
          persistence/
          index.ts            # the only supported import path
        growth/
        feeding/
        inventory/
        finance/
      application/            # orchestrators
      read-models/
      infrastructure/         # Drizzle factories, HTTP adapters, identity, evidence
      http/
  web/                        # production SPA; not created
packages/
  api-contracts/              # created when apps/api and apps/web exist
```

`shared-kernel` stays a directory inside `apps/api`. It is not a workspace package. There is not one workspace package per domain module.

Rules:

- A module's `index.ts` exports application commands and queries. It does not export persistence or domain types that would let a caller skip the command.
- A module may import its own internals, the shared kernel, and an explicitly allowed public interface of another module.
- A module does not import another module's `domain/`, `persistence/`, or internal application implementation. Orchestrators and HTTP handlers import the public index.
- Domain code does not import Fastify, Drizzle, the authentication library, or web frontend code.
- Application services do not import Drizzle and do not accept a raw Drizzle transaction ([ADR-008](ADR-008-data-access.md)).
- Read models may import persistence table definitions for `SELECT`. They do not import write repositories. Cross-schema reads stay in this layer ([ADR-007](ADR-007-postgresql.md)).
- The shared kernel holds the allowed primitives from [cross-cutting-concerns.md](../cross-cutting-concerns.md), including `RanchId`. It holds nothing else.
- `packages/api-contracts` is created when `apps/api` and `apps/web` exist, not before. It holds Zod request and response schemas, and stable API enums that are part of the HTTP contract ([ADR-009](ADR-009-api-style.md)). It does not hold domain entities, repositories, Drizzle rows, or module internals.

Enforcement:

1. The public index is the design.
2. A Vitest architecture test is mandatory once `apps/api` exists. It fails when a file breaks the import rules above. It runs with the rest of the API tests ([testing-strategy.md](../testing-strategy.md)). It is not installed in this version.
3. Editor feedback may come from the API's one linter if that linter can express the same rule. The repository already uses oxlint for `apps/domain-map`. Do not adopt a second lint toolchain for boundaries. Do not add dependency-cruiser.

TypeScript project references per module, and workspace packages per module, are not the enforcement mechanism. Revisit those only if the import test proves insufficient.

Schema privileges per module are a later escalation if the import test and review still let cross-module writes through ([ADR-007](ADR-007-postgresql.md)).

## Why not a package per module

A package boundary is real, and it is also a build graph. Orchestrators in the same transaction would depend on five packages, a shared transaction type package, and a release order inside one deployable. Two people do not need that to keep `feeding` from importing `finance/persistence`. Directories plus a test are reversible: a later extraction can still lift a directory into a package because the public index was the only door.

## Consequences

- `apps/domain-map` is outside the enforcement graph. It is not a module and it does not import `apps/api`.
- Fastify plugins are not how modules are separated ([ADR-005](ADR-005-backend-runtime.md)).
- The import test does not encode the whole context map. It stops the dangerous import: another module's tables, entities, and internal application code. Review still checks that a module does not call another module's write function. Orchestrators are the writers that span modules.
- Creating `apps/api` or `apps/web` is a later implementation task. The workspace globs already match `apps/*` and `packages/*`.

## When to revisit

- The import test is bypassed in practice and review is not catching writes across modules. Escalate to schema privileges or to packages.
- A module must be deployed apart from the others. That is an ADR-002 revisit, and the package split would follow the process split.
- `apps/web` needs shared kernel types on the client. Prefer contracts. Move the kernel into a package only if the client must share a branded id type and a contract string is not enough.

## Status of this document

- Version: 0.2
- Status: Accepted with the Physical Architecture v1 baseline
- Last updated: 2026-10-04
- Source: ADR-002, ADR-003, AQ-P1-007, physical architecture QA
- Validation: Decision only. No application directory is created
