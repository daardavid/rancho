# ADR-012: Modules live inside the API, enforced by a public index and an import test

## Status

Proposed

Proposed with physical architecture v0.1. It does not create `apps/api`, a package, or a lint configuration.

## Context

The monolith will not keep its boundaries by goodwill ([ADR-002](ADR-002-modular-monolith.md)). Orchestrators must call public application functions and must not reach into another module's tables ([ADR-003](ADR-003-application-orchestration.md)). The team is two people. A mechanism that needs a package graph, a second compiler project per module, or an extra architecture product is more ceremony than the boundary is worth until a lighter check has failed.

The repository is already npm workspaces (`apps/*`, `packages/*`). `apps/domain-map` is the discovery application. The production API does not exist yet.

## Decision

Keep the five domain modules as directories inside the future `apps/api` process.

Intended layout, not created by this ADR:

```text
apps/
  domain-map/                 # discovery maps; unchanged
  web/                        # production SPA; not created
  api/
    src/
      http/
      application/            # orchestrators
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
      read-models/
      shared-kernel/
      identity/
      ports/
      adapters/
packages/
  api-contracts/              # created when apps/web exists
```

Rules:

- A module's `index.ts` exports application commands and queries. It does not export persistence or domain types that would let a caller skip the command.
- Other modules do not import a module's `domain/` or `persistence/` tree. Orchestrators and HTTP handlers import the public index.
- Read models may import persistence table definitions for `SELECT`. They do not import write repositories.
- The shared kernel stays inside `apps/api` until a second runtime must share those types. It holds the allowed primitives from [cross-cutting-concerns.md](../cross-cutting-concerns.md) and nothing else.
- `packages/api-contracts` is created with `apps/web`, not before. It holds Zod contracts ([ADR-009](ADR-009-api-style.md)), not domain entities.
- Do not create a workspace package per domain module.

Enforcement, smallest first:

1. The public index is the design.
2. An automated test in the API test suite fails when a file outside a module imports that module's `domain/` or `persistence/`, except the read-model exception above. The test runs with the rest of the tests ([testing-strategy.md](../testing-strategy.md)). It is not installed in this version.
3. A lint restriction may duplicate that rule for faster editor feedback. The repository already uses oxlint for `apps/domain-map`. The API should use one linter. Add the lint rule only if that linter can express it. Do not adopt ESLint solely for boundaries, and do not add dependency-cruiser.

TypeScript project references per module, and workspace packages per module, are not the enforcement mechanism.

Schema privileges per module are a later escalation if the import test and review still let cross-module writes through ([ADR-007](ADR-007-postgresql.md)).

## Why not a package per module

A package boundary is real, and it is also a build graph. Orchestrators in the same transaction would depend on five packages, a shared transaction type package, and a release order inside one deployable. Two people do not need that to keep `feeding` from importing `finance/persistence`. Directories plus a test are reversible: a later extraction can still lift a directory into a package because the public index was the only door.

## Consequences

- `apps/domain-map` is outside the enforcement graph. It is not a module and it does not import `apps/api`.
- Fastify plugins are not how modules are separated ([ADR-005](ADR-005-backend-runtime.md)).
- The import test does not encode the whole context map. It stops the dangerous import: another module's tables and entities. Review still checks that a module does not call another module's write function. Orchestrators are the writers that span modules.
- Creating `apps/api` or `apps/web` is a later implementation task. The workspace globs already match `apps/*` and `packages/*`.

## When to revisit

- The import test is bypassed in practice and review is not catching writes across modules. Escalate to schema privileges or to packages.
- A module must be deployed apart from the others. That is an ADR-002 revisit, and the package split would follow the process split.
- `apps/web` needs shared kernel types on the client. Prefer contracts. Move the kernel into a package only if the client must share a branded id type and a contract string is not enough.

## Status of this document

- Version: 0.1
- Status: Proposed with physical architecture v0.1
- Last updated: 2026-10-04
- Source: ADR-002, ADR-003, AQ-P1-007
- Validation: Decision only. No application directory is created
