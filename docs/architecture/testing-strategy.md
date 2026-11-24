# Testing strategy

A small pyramid for a two-person team. Tools are named so the later implementation does not collect two of each. Nothing here adds a dependency or a test file.

## Layers

| Layer | What it protects | How it runs |
| --- | --- | --- |
| Domain unit | Invariants: unknown stays unknown, inferred parentage is not confirmed, exit keeps the file, a declaration is not a stock issue | Vitest, no database, no HTTP |
| Application | Orchestrators call the right module functions, and a thrown second call does not report success | Vitest, with fakes for the module functions |
| Persistence integration | Repositories, unique ids, version conflicts, idempotency mismatches, and a real rollback of a sale plus an exit | Vitest against a separate PostgreSQL test database. Migrations are applied before these tests. Most cases roll the transaction back. A test that must commit cleans its rows explicitly |
| API | A command's contract, auth gate, and status for `version_conflict` versus `idempotency_mismatch` versus rejection | Fastify's request injection, plus a few cases on PostgreSQL for the captures that must be atomic |
| Import boundary | Code outside a module does not import that module's `domain/`, `persistence/`, or internal application, except read models reading tables. Domain files do not import Fastify, Drizzle, or the auth library | Mandatory Vitest scan of the API source ([ADR-012](adr/ADR-012-repository-module-enforcement.md)) |
| Frontend component | Forms and a couple of screens render contracts and errors | Vitest and React Testing Library, in `apps/web` when it exists |
| End to end | A few ranch flows: register an animal, record a weight, record a feed purchase, sell a named animal | Playwright |

Domain tests carry the business rules. Persistence tests carry the transaction. End-to-end tests do not try to cover every invariant.

## Tools

- **Vitest** for unit, application, persistence, API, component, and the import test. One runner. The production apps are Vite and Vitest belongs to that family. `apps/domain-map` is not retrofitted with a suite in this design.
- **React Testing Library** for components.
- **Playwright** for the handful of browser flows, once a few stable critical flows exist. It is not the first test added with an empty app.
- **PostgreSQL**, the same engine as production, for persistence tests. GitHub Actions provides it as a service container. Locally it is the Compose database, on a database name separate from development data. Testcontainers are not introduced initially.

Jest, Cypress, and a second HTTP test framework are not added.

Persistence tests fail when PostgreSQL is down. They do not skip. A skipped transaction test is how the sale-and-exit rule would pass in CI without running.

Each test file opens its own database, created fresh and dropped when the file closes, so the files can run in parallel. In CI every file has its own database on the PostgreSQL service ([ADR-014](adr/ADR-014-local-test-database.md)).

## What the atomic test must show

One persistence test opens a transaction, writes a finance sale, forces the herd exit to fail, and asserts that neither row remains. A second case commits both and asserts both remain. Fakes at the application layer are not a substitute for that test. They are an addition so orchestrator sequencing stays fast.

## What stays out

- A browser test per module.
- Contract tests against a generated OpenAPI file, until a non-TypeScript client exists.
- Load tests. Twenty-one head, and a few hundred later, are not a traffic problem.
- Mutation testing and coverage gates that the team will route around. Review the domain tests for the invariants instead.

## When the suite appears

The pyramid is implemented with the API and the web app. This design does not add the tooling to the domain map and does not add empty test projects.

## Status

- Version: 0.2
- Status: Accepted with the Physical Architecture v1 baseline. No test runner added
- Last updated: 2026-10-04
- Source: ADR-003, ADR-008, ADR-012
- Validation: Proportional to two developers and a small herd
