# ADR-005: TypeScript on Node.js, with Fastify as the HTTP adapter

## Status

Accepted

Accepted with the Physical Architecture v1 baseline. The decision is unchanged by the v0.2 refinement. It does not authorize scaffolding the API.

## Context

The ranch system is a modular monolith ([ADR-002](ADR-002-modular-monolith.md)). Application orchestrators coordinate cross-module writes inside one local transaction ([ADR-003](ADR-003-application-orchestration.md)). The team is two people. The herd in view is about 21 head. The repository is already TypeScript, React, and Vite in `apps/domain-map`.

The backend has to express domain invariants in types, talk to PostgreSQL transactionally, and stay operable by the same two people who will write the UI. A second language would be a second stack for a workload that is I/O and rules, not CPU.

## Decision

Implement the modular monolith in TypeScript on Node.js.

- Use the Node engines already declared by the repository (`^20.19.0 || >=22.12.0`).
- Run one long-lived Node process. The API is not a set of serverless functions.
- Use Fastify as the HTTP adapter.
- Keep domain modules, orchestrators, and repositories as plain TypeScript. They do not import Fastify.
- Fastify plugins stay at the edge: routing, parsing, request ids, logging, rate limits, and the auth hook. A Fastify plugin is not a domain module.

## Why this runtime

The people building the UI already work in TypeScript. The domain needs branded ids, unions for source quality and unknown states, and functions small enough to test without a server. Node's async I/O matches a form-and-dashboard system in front of PostgreSQL. A hardware adapter, when one exists, can translate a vendor protocol into a command the same process already exposes. Nothing in the current scale rewards a language chosen for theoretical throughput.

## Why Fastify, among Node HTTP frameworks

### Fastify

Fastify is a small HTTP server with a plugin model, structured logging, request ids, and a way to inject requests in tests. The modular monolith can sit behind it. The framework does not supply a domain module system, which is what this project wants: the five modules remain directories with public application functions ([ADR-012](ADR-012-repository-module-enforcement.md)).

### NestJS

NestJS modules are a dependency-injection concept. They are easy to confuse with Herd, Growth, Feeding, Inventory, and Finance, and they are not those boundaries. Decorators and a Nest testing module pull application code toward the framework. The ceremony is real for two people, and the framework's module word would fight the word this architecture already uses. NestJS is not selected.

### Express

Express is minimal and widely known. The API would still need logging, request ids, validation hooks, and a place to keep routes thin. Those are the parts Fastify already has. Express does not buy a simpler domain model.

### Hono

Hono is a small, typed router with a strong edge and RPC story. This API is a long-lived process holding a PostgreSQL transaction open across two module repositories. That is a Node server, not an edge function. Hono can run on Node, and it does not offer a meaningful advantage for that shape.

## Alternatives considered for the language

- **Another language for performance.** The herd is about 21 head and might become hundreds. PostgreSQL and a single Node process are not the constraint. A second language splits the team.
- **Python.** No current ranch capability needs a Python ecosystem. The team would maintain two type systems.
- **Go or C#.** Both can host a modular monolith and a transaction. Both are a new daily language for a team whose UI is already TypeScript.

## Consequences

- One language covers the API, the contracts, and the production UI ([ADR-006](ADR-006-frontend-approach.md)).
- Orchestrators call module application functions inside a database transaction ([ADR-008](ADR-008-data-access.md)). The HTTP handler starts that work and does not contain herd or finance rules.
- Domain types do not import Fastify, Drizzle, or the auth library.
- Structured logs come from Fastify's default logger (Pino), with the request id as the correlation id ([deployment-strategy.md](../deployment-strategy.md)).
- A later scale or camera adapter is a port implemented in this process until a real process boundary exists. That later boundary is an [ADR-002](ADR-002-modular-monolith.md) revisit, not a second service created in advance.

## When to revisit

- A measured CPU-bound workload appears that Node cannot host beside the request path.
- The people building the system no longer share TypeScript.
- Fastify's HTTP model cannot host the transaction and module rules without domain code importing the framework.
- ADR-002's conditions for leaving the monolith are met.

Do not revisit it because a benchmark of an empty router was faster, or because a framework's marketing uses the word "module."

## Status of this document

- Version: 0.1
- Status: Accepted with the Physical Architecture v1 baseline. Decision unchanged by the v0.2 refinement
- Last updated: 2026-10-04
- Source: Logical Architecture v1 baseline at `762739b`, team shape, repository engines
- Validation: Decision only. `apps/api` is not created
