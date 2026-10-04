# 010 — Physical architecture v0.1

## Objective

Choose how the frozen logical architecture is implemented, and stop there.

This plan records the evaluation. The decisions live in `docs/architecture` and in ADR-005 through ADR-012. It does not approve a product scope, close a ranch question, scaffold an application, or install a dependency.

Logical architecture v0.2 at `762739b06d830146d61084497eff3f1a1edafd18` is the input. It is frozen as the Logical Architecture v1 baseline. A physical choice that cannot express that baseline would be a reason to reopen it. None of the choices below have that problem.

`docs/domain`, AS-IS, and TO-BE are unchanged. `apps/domain-map` is unchanged. The ARCHITECTURE tab stays a placeholder.

## Baseline being implemented

| Piece | Where it is frozen |
| --- | --- |
| Herd, Growth, Feeding, Inventory, Finance | [domain-boundaries.md](../architecture/domain-boundaries.md) |
| Application orchestrators, one local transaction | [ADR-003](../architecture/adr/ADR-003-application-orchestration.md) |
| No required cross-module event bus | [ADR-004](../architecture/adr/ADR-004-no-cross-module-event-bus-yet.md) |
| Read models | [data-ownership.md](../architecture/data-ownership.md) |
| Evidence, audit, source quality | [cross-cutting-concerns.md](../architecture/cross-cutting-concerns.md) |
| Shared kernel limits | [cross-cutting-concerns.md](../architecture/cross-cutting-concerns.md) |
| Client-safe ids, idempotency, versions | [offline-readiness.md](../architecture/offline-readiness.md) |
| Modular monolith | [ADR-002](../architecture/adr/ADR-002-modular-monolith.md) |

Known scale is unchanged: about 21 head, few users, one ranch, a two-person hobby team, GitHub as the workflow. Evolution that must stay possible: hundreds of head, another ranch later, hardware adapters, a worker client, unreliable field connectivity.

## Evaluation priorities

In order: simplicity, maintainability, strong TypeScript domain modeling when TypeScript is chosen, low hosting cost, easy local development, transactional correctness, simple deployment, strong PostgreSQL support, a future PWA and offline path, easy testing.

Do not optimize for enormous traffic. Do not pick a tool because it is popular or because its documentation uses the word "module."

## Phase 1 — Freeze

The architecture index now states that v0.2 is the Logical Architecture v1 baseline for implementation design. P1 questions that this plan answers are closed in [architecture-open-questions.md](../architecture/architecture-open-questions.md). AQ-P1-009 (a feeding group id that is not a paddock) stays open. The hosting vendor stays open. Ranch `OQ-*` and `DQ-*` questions stay open.

Future extraction stays possible: public module indexes, one PostgreSQL schema per module, no cross-schema foreign keys.

## Frontend

Compared React + Vite SPA, Next.js, and a switch to another UI framework.

The production app is authenticated dashboards and forms. SEO does not matter. The team already uses React, TypeScript, and Vite. Android browsers are a layout constraint, not a native-app decision. A later PWA is a shell on top of the same SPA.

**Decision:** React + TypeScript + Vite at the future `apps/web`. TanStack Query for server state. Component state and the URL for UI state. `apps/domain-map` stays the discovery tool and is not the production frontend. [ADR-006](../architecture/adr/ADR-006-frontend-approach.md).

Next.js would add a server UI runtime beside the API without a ranch requirement. Another component framework would spend the team's React experience for no constraint React fails. Redux is not selected.

`apps/web` is not created.

## Backend language and framework

Compared TypeScript on Node.js with Python, Go, and C#. Compared Fastify, NestJS, Express, and Hono.

**Decision:** TypeScript on Node.js, one long-lived process, Fastify as the HTTP adapter only. Domain modules and orchestrators are plain TypeScript and do not import Fastify. [ADR-005](../architecture/adr/ADR-005-backend-runtime.md).

NestJS was rejected because its modules are a dependency-injection mechanism and would collide with the five domain modules. Express would still need the logging, request ids, and thin-route discipline Fastify already has. Hono is a strong small router whose center of gravity is the edge; this API holds a PostgreSQL transaction in a Node process. Another language was rejected because the workload is rules and I/O, and the team would then maintain two languages for about 21 head.

## API

Compared command-oriented REST, GraphQL, and a TypeScript RPC client as the public API.

**Decision:** command-oriented REST and Zod contracts. [ADR-009](../architecture/adr/ADR-009-api-style.md), [api-strategy.md](../architecture/api-strategy.md).

An exit is `POST /api/animals/{id}/exit`, not a patch that clears an active flag. A sale of named animals is one capture command. GraphQL would invite a cross-module object graph. tRPC would make a later non-TypeScript adapter a second-class client. Zod schemas shared as `packages/api-contracts`, when the web app exists, keep the TypeScript client aligned. The full route list is not designed.

Domain model, API contract, and UI model stay three things.

## Persistence and data access

PostgreSQL is the store. One database. Schemas `herd`, `growth`, `feeding`, `inventory`, `finance`, plus technical `identity` and `evidence`. A `read_model` schema is reserved and unused. No database per module. No cross-schema foreign keys. [ADR-007](../architecture/adr/ADR-007-postgresql.md).

Compared Drizzle, Kysely, and Prisma.

**Decision:** Drizzle, with the orchestrator passing one transaction handle into each module function. No cross-module Drizzle relations. [ADR-008](../architecture/adr/ADR-008-data-access.md), [persistence-strategy.md](../architecture/persistence-strategy.md).

Prisma was rejected because its client graph fights module ownership. Kysely was the closest alternative and remains an acceptable query-layer replacement if Drizzle relations start crossing modules. PostgreSQL would stay.

Read models are SQL on demand: weekly summary, growth, provisional profitability, inventory variance, missing-animal risk, and the last-observation projection. Materialized views wait for a measured need.

Identifiers are UUID v4. Mutable rows have an integer version. History is a current row plus an append-only history table in the same schema and the same transaction. Money and quantities are `numeric`. Instants are `timestamptz`.

## Authentication and evidence

Compared a managed identity provider, hand-rolled passwords, and a session library.

**Decision:** library-based sessions in PostgreSQL, HTTP-only cookie, Better Auth at the edge unless it starts owning orchestrator behavior. Roles `owner` and `support` now. `worker`, `veterinarian`, and `partner-readonly` are named and not built. Actors are not roles. [ADR-010](../architecture/adr/ADR-010-authentication.md).

**Decision:** evidence bytes behind a port. Filesystem in development. S3-compatible storage when deployed. No vendor. Bytes stay out of PostgreSQL. [ADR-011](../architecture/adr/ADR-011-evidence-storage.md).

## Repository, tests, and delivery

Modules are directories inside the future `apps/api`, not workspace packages. Enforcement is the public index plus an import test. [ADR-012](../architecture/adr/ADR-012-repository-module-enforcement.md), [repository-structure.md](../architecture/repository-structure.md).

Tests: Vitest for domain, application, persistence, API, components, and the import test. Playwright for a few flows later. Persistence tests use real PostgreSQL and do not skip when it is down. [testing-strategy.md](../architecture/testing-strategy.md).

Local infrastructure is Compose for PostgreSQL only. The app is a Node process. Production is that process serving the API and the built SPA, plus managed PostgreSQL and an S3-compatible bucket. No Kubernetes. No vendor ADR. GitHub Actions runs lint, typecheck, tests, and build. Migrations are an explicit deploy step. Logs are structured, with a request id. An error-monitoring product can wait. [deployment-strategy.md](../architecture/deployment-strategy.md), [security-baseline.md](../architecture/security-baseline.md).

Offline sync is not in the MVP. The command rules above are the readiness. A PWA shell may be added later without a write queue.

## Decision matrix

The matrix of record is [technology-stack.md](../architecture/technology-stack.md). It covers frontend, backend runtime, backend framework, API, database, schema layout, data access, validation, authentication, file storage, frontend server state, module enforcement, testing, local development, deployment, read models, and offline behavior.

## Traceability

The logical-to-physical map is in [physical-architecture.md](../architecture/physical-architecture.md). Orchestrators become plain functions. The local transaction becomes a Drizzle handle. Module ownership becomes schemas plus the import test. Evidence ids become the storage port. Read models become queries. Offline-ready commands become client UUIDs and version checks.

## Cost and complexity

One Node process, one database, one bucket. Locally: Node and Docker. Paid: a small host, managed PostgreSQL, object storage, a domain later. No auth subscription, no cluster, no broker. The list of what the team must understand, and what was left out, is in [deployment-strategy.md](../architecture/deployment-strategy.md).

If a tool in that list is only there because a diagram looked unfinished, it should be deleted at implementation time. The current list is the smallest set that still keeps one transaction and a module boundary.

## Self-check

| # | Question | Answer |
| --- | --- | --- |
| 1 | Is the stack boring enough? | PostgreSQL, Node, React, Vite, REST, cookie sessions, files or S3 |
| 2 | Can two developers run it locally? | Node, Compose for PostgreSQL, npm scripts when the app exists |
| 3 | Does one local transaction survive? | One Drizzle transaction, two module functions, one rollback |
| 4 | Is module ownership enforced? | Schemas, public index, import test. Not by goodwill alone |
| 5 | Is vendor lock-in avoided where it was unnecessary? | No host ADR. S3 API. Standard PostgreSQL. Sessions in our database |
| 6 | Does a later PWA still fit? | Client ids, versions, command routes. No sync designed |
| 7 | Can a hardware adapter be added cleanly? | A port in-process, normalized command. A ranch-side gateway waits on ADR-002 |
| 8 | Can evidence outgrow a laptop disk? | Deployed bytes go to object storage. The id stays on the fact |
| 9 | Are backups straightforward? | Managed PostgreSQL backups and a restore drill. The bucket holds the files |
| 10 | Did a framework distort the logical modules? | Fastify is HTTP. Drizzle relations do not cross modules. NestJS was rejected |
| 11 | Was technology added without a TO-BE reason? | No bus, no GraphQL, no Kubernetes, no Redux, no per-module database |
| 12 | Is the cost proportional to about 21 head? | One small process, one small database, one bucket |

## Files

| File | Role |
| --- | --- |
| [../architecture/README.md](../architecture/README.md) | Baseline freeze and index |
| [../architecture/physical-architecture.md](../architecture/physical-architecture.md) | Map and traceability |
| [../architecture/technology-stack.md](../architecture/technology-stack.md) | Stack and matrix |
| [../architecture/repository-structure.md](../architecture/repository-structure.md) | Future tree |
| [../architecture/persistence-strategy.md](../architecture/persistence-strategy.md) | Database, transactions, reads |
| [../architecture/api-strategy.md](../architecture/api-strategy.md) | Commands and contracts |
| [../architecture/security-baseline.md](../architecture/security-baseline.md) | Controls for a few users |
| [../architecture/testing-strategy.md](../architecture/testing-strategy.md) | Pyramid |
| [../architecture/deployment-strategy.md](../architecture/deployment-strategy.md) | Local, host, CI, cost |
| ADR-005 through ADR-012 | Constraining decisions |

Also updated, without changing their logical rules: open questions, ADR-002's pointer to later choices, the auth and file ports, the system-context trust boundary, and the repository README's phase description.

Not changed: `docs/domain`, `docs/maps/as-is`, `docs/maps/to-be`, `apps/domain-map`, package manifests, lockfiles.

## Non-goals

- Backend code, `apps/web`, `apps/api`, schemas, migrations, dependencies, workflows, Compose files, authentication implementation, deployment, or the ARCHITECTURE tab.
- A hosting vendor.
- The full HTTP catalog.
- Offline synchronization, CRDTs, or a worker field client.
- Closing `OQ-*`, `DQ-*`, or AQ-P1-009.
- Rewriting AS-IS or TO-BE.

## Remaining implementation questions

- The provider and region (AQ-P1-006).
- Whether a feeding group needs an id that is not a paddock (AQ-P1-009).
- The route catalog, when a vertical slice is built.
- Whether Better Auth stays at the edge once it is integrated. The fallback is a thinner session library, not a new approach.
- Email delivery for password reset. Developer-assisted reset is enough until then.
- Numeric scale for money, at schema time.
- OpenAPI generation, when a non-TypeScript adapter exists.
- Alert transport beyond the in-app banner (AQ-P2-004).

## Final validation criteria

1. The five modules, orchestrators, read models, transversal evidence and audit, and the minimal kernel are the baseline, unchanged in meaning.
2. No physical tool forced a logical boundary change.
3. One PostgreSQL database, schemas per module, not a database per module.
4. The transaction path is an explicit handle across module functions.
5. The public API is command-oriented REST. Table CRUD is not the write model.
6. `apps/domain-map` remains the discovery app. `apps/web` is named and not created.
7. Package manifests and the lockfile are unchanged.
8. Offline sync is not designed. Command readiness is.
9. No hosting vendor is locked.
10. Read models start as queries.
11. AS-IS and TO-BE are untouched. The ARCHITECTURE UI is not implemented.

## Status

- Version: 0.1
- Status: Physical design of record, pending physical architecture QA. Not an authorization to scaffold
- Last updated: 2026-10-04
- Source: logical architecture v0.2 at `762739b`
- Validation: Decisions applied in `docs/architecture`. No production code
