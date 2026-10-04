# Technology stack

The selected physical stack for the Logical Architecture v1 baseline and the Physical Architecture v1 baseline. Hosting vendors are requirements, not a brand. Versions follow the workspace when a tool is already present. New libraries are named without pinning a version in this document. The v0.2 refinement did not replace this stack. It constrained how the stack is used.

## Selected stack

| Layer | Choice |
| --- | --- |
| Production UI | React, TypeScript, Vite SPA at the future `apps/web` |
| UI server state | TanStack Query |
| UI local state | Component state and the URL |
| Discovery UI | Existing `apps/domain-map`, unchanged |
| API language | TypeScript |
| API runtime | Node.js, engines already in the repository, one long-lived process |
| HTTP | Fastify, edge only |
| API style | Command-oriented REST, JSON |
| Contracts | Zod, later `packages/api-contracts` |
| Database | One PostgreSQL database |
| Schema layout | One schema per domain module, plus `identity` and `evidence`. No `read_model` schema initially |
| Scope | `RanchId` on authoritative business rows from the first migration |
| Data access | Drizzle, transaction-scoped repositories. No Drizzle type in domain or application services |
| Auth | Cookie sessions in PostgreSQL. Library chosen at scaffold. Better Auth is the first candidate, not a frozen dependency |
| Evidence | Filesystem adapter in development, S3-compatible adapter when deployed |
| Read models | Query on demand |
| Module boundaries | Directories, public index, import test |
| Unit and integration tests | Vitest |
| Browser flows | Playwright, a handful, when the app exists |
| Local infrastructure | Docker Compose for PostgreSQL only |
| Automation | GitHub Actions |
| Logs | Pino through Fastify, request id |
| Error product | None required at the start |

## Decision matrix

The matrix of record. "Revisit when" is a trigger, not a backlog.

| Concern | Candidate A | Candidate B | Candidate C | Decision | Why | Revisit when |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend | React + Vite SPA | Next.js | Another UI framework | React + Vite SPA | Authenticated forms, no SEO need, team already on this stack, API stays separate | A public server-rendered site becomes a product requirement |
| Backend runtime | TypeScript / Node.js | Python | Go or C# | TypeScript / Node.js | One language with the UI, enough for the I/O and the rules | A measured CPU-bound workload, or the team no longer shares TypeScript |
| Backend framework | Fastify | NestJS | Express or Hono | Fastify as HTTP adapter | Domain modules stay plain TypeScript. Nest's modules are a different concept. Express and Hono do not improve the transaction model | Domain code must import the framework to get a correct transaction |
| API | Command-oriented REST | GraphQL | tRPC as the public API | Command-oriented REST | Commands match orchestrators. Shared Zod types cover the TypeScript client. Adapters stay on HTTP | A real third-party client needs a graph this team does not want to hand-build |
| Database | PostgreSQL, one database | SQLite | A document store | PostgreSQL, one database | Local transactions, relational history, reporting, hosted backups | ADR-002 forces a process split that cannot share a transaction |
| Schema layout | Schema per domain module | One schema, table prefixes | Database per module | Schema per domain module | Ownership is visible and transactions still cross schemas. Cross-schema foreign keys are limited to downstream references to `herd.animal` and, where justified, `herd.paddock_reference` | Cross-module writes keep happening and privileges must enforce the schema |
| Data access | Drizzle | Kysely | Prisma | Drizzle | Typed SQL-like queries, schema support, reviewed SQL migrations, no cross-module object graph. Repositories are scoped to the transaction. Application services do not receive the Drizzle transaction | Relations start crossing modules, or SQL migrations become unclear |
| Validation | Zod | Framework-native JSON Schema only | Hand-written checks | Zod at the edge, domain invariants in the module | One contract, inferred types, future client reuse. The domain still rejects illegal ranch states | Contracts must be maintained twice |
| Authentication | Library-based sessions | Managed identity provider | Hand-rolled passwords | Cookie sessions in PostgreSQL. Library at scaffold | A handful of users, revocation by row, no auth vendor, no homemade crypto. Better Auth is tried first and is not frozen here | Self-service registration, or a client that cannot use a first-party cookie |
| File storage | S3-compatible port, filesystem in dev | Cloud vendor locked now | Bytes in PostgreSQL | Port. Filesystem locally, S3-compatible when deployed | The interface is enough. Images stay out of relational backups | The store cannot speak S3, or retention must be immutable |
| Frontend server state | TanStack Query | `fetch` only | Redux | TanStack Query | Server cache and invalidation without a global domain store | The library is unmaintained and a thin wrapper would replace it |
| Module enforcement | Public index + import test | Workspace package per module | dependency-cruiser or ESLint as a second toolchain | Public index + import test | Smallest check that blocks `feeding` from importing `finance` persistence | The test is bypassed and review is not enough |
| Testing | Vitest + Playwright for a few flows | Jest and Cypress as well | Tests only through the UI | Vitest pyramid, few Playwright flows | One runner for domain, application, persistence, and API. E2E stays small | Persistence tests no longer run against real PostgreSQL |
| Local development | Compose for PostgreSQL, Node for the app | Everything in containers | SQLite file, no Docker | Compose for PostgreSQL only | One infrastructure command. The app stays a normal Node process | The team cannot run Docker and a hosted dev database is simpler |
| Deployment | One Node process serving API and SPA | Static host + separate API origin | Kubernetes | One Node process, one origin | Cookies stay first-party. One application deployable. Postgres and the bucket sit beside it | The host's cheapest shape is a split origin on one parent domain |
| Read models | Query on demand | Database views | Materialized views or projection tables | Query on demand | About 21 head, and hundreds still fit a query. Ownership stays on the source row | A measured query is too slow, or a screen needs a frozen snapshot |
| Offline | Responsive web app, commands already idempotent | Installable PWA with a write queue | CRDTs | Responsive web app. PWA shell later, no write queue | The owner records after the message arrives. Sync stays blocked by `OQ-CONN-001` | A field client is an explicit decision |

## Explicit non-choices

Kubernetes, microservices, a broker, event sourcing, temporal tables, GraphQL, Redux, Prisma as the graph, NestJS as the structure, a managed IdP, a frozen Better Auth dependency, MinIO as a required local dependency, an error-monitoring subscription, OpenTelemetry as a platform, per-module databases, and a SaaS tenant model are not part of the v1 baseline.

## Status

- Version: 0.2
- Status: Accepted with the Physical Architecture v1 baseline
- Last updated: 2026-10-04
- Source: [physical-architecture.md](physical-architecture.md) and ADR-005 through ADR-013
- Validation: No dependency is installed by this document
