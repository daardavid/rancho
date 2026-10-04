# ADR-009: Command-oriented REST, with Zod contracts

## Status

Proposed

Proposed with physical architecture v0.1. It does not define the full route catalog and does not add a dependency.

## Context

Owner-facing behavior is a mix of straightforward records and workflow commands. An identified sale writes Finance and Herd. An exit is a lifecycle transition, not a patch of an `active` column. Later hardware adapters and a possible field client need a stable HTTP contract. Offline readiness already requires client-minted ids, idempotent creates, and versioned updates ([offline-readiness.md](../offline-readiness.md)).

Three representations have to stay distinct:

| Representation | What it is |
| --- | --- |
| Domain model | Invariants inside a module. An `Animal` the UI never imports |
| API contract | The request and response the HTTP boundary accepts and returns |
| UI model | What a screen holds. It may match a contract. It is still not the domain |

## Decision

The public application API is command-oriented REST over JSON.

- A route names a command. `POST /api/animals/{id}/exit` is the shape of an exit. `PATCH /api/animals/{id}` with `{ "active": false }` is not an exit command and is not the way to inactivate an animal.
- Cross-module captures are their own commands, for example a cattle-sale command that the `RecordCattleSale` orchestrator handles. The client does not update Finance and then Herd as two optional calls.
- Create commands carry client-generated ids ([ADR-007](ADR-007-postgresql.md)). Repeating the same id and the same business payload returns the existing result. The same id with a different business payload fails visibly.
- Update commands carry the version the caller read. A stale version fails visibly. The stored row is unchanged.
- Validate requests and responses at the HTTP boundary with Zod. Infer TypeScript types from those schemas. Fastify does not keep a second, hand-written JSON Schema for the same payload.
- Domain functions re-check invariants. Zod does not replace them. Zod rejects a malformed body. The domain rejects a legal-looking body that breaks a ranch rule, including a guess where unknown is required.
- When `apps/web` is created, the Zod contracts move to `packages/api-contracts` so the SPA can type its client without importing the API's domain. Until then the schemas live with the API. This ADR does not create the package.
- The Zod schema is the contract source. An OpenAPI document may be generated later for a non-TypeScript adapter. It is not a second contract edited by hand.

No `/v1` prefix until a real break exists.

Illustrative commands, not a catalog:

| Command | Route shape | Who handles it |
| --- | --- | --- |
| Exit an animal outside a sale | `POST /api/animals/{id}/exit` | Herd |
| Record a sale of named animals | `POST /api/captures/cattle-sales` | `RecordCattleSale` |
| Record a feed purchase | `POST /api/captures/feed-purchases` | `RecordFeedPurchase` |
| Record a weighing session | `POST /api/weighing-sessions` | Growth |

## Why REST, and why not the others

### GraphQL

GraphQL pays for flexible client queries. This client is one application the team also writes. A graph encourages the UI to assemble animals, expenses, and weights as one navigable model, which is the ownership failure the logical architecture already refused. Hardware adapters do not need a graph. GraphQL is not selected.

### RPC or tRPC as the public API

An end-to-end TypeScript RPC client is pleasant inside one monorepo and awkward for a scale adapter or any later client that is not that TypeScript project. Command semantics, idempotency, and version conflicts are ordinary HTTP. Shared Zod types recover the part of the RPC benefit the team actually needs: the request and the response stay aligned. tRPC is not the public API.

### Table CRUD

CRUD that maps a route to a table invites the client to set `active`, edit a margin, or overwrite a weight cell. Those are the writes [data-ownership.md](../data-ownership.md) forbids. Commands name the ranch operation. Queries still read: `GET` for an animal file, a session, or a read model. A query is not a back door that writes.

## Consequences

- HTTP status carries the conflict: a validation failure, a domain rejection, a version conflict, and an idempotency mismatch are distinguishable. A small JSON error body is enough. Problem-details machinery is not required.
- The SPA's TanStack Query functions call these commands and then invalidate the queries those commands affect ([ADR-006](ADR-006-frontend-approach.md)).
- Adapters speak HTTP commands. They do not share the process's domain objects unless they run inside the process and call the application function directly. A future out-of-process adapter uses the HTTP contract.
- Contracts do not include profitability formulas, parentage inference, or stock-balance rules. Those stay in the module or the read model.

## When to revisit

- A real third-party client needs a query flexibility REST cannot offer without a dozen bespoke read routes, and that client is in scope.
- A non-TypeScript adapter becomes the main consumer and a generated OpenAPI workflow is no longer optional.
- Command routes are being bypassed by generic patches. That is a reason to enforce this ADR, not to replace it with table CRUD.

## Status of this document

- Version: 0.1
- Status: Proposed with physical architecture v0.1
- Last updated: 2026-10-04
- Source: ADR-003, offline-readiness constraints, capture-once rules
- Validation: Decision only. No routes are implemented
