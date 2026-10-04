# API strategy

How the owner-facing application and later adapters talk to the monolith. The route catalog is not designed here.

Decision: [ADR-009](adr/ADR-009-api-style.md).

## Commands and queries

The API is JSON over HTTP, prefixed with `/api`, so the same origin can serve the SPA at `/` and the API at `/api`.

A command is a `POST` that names the ranch operation. A query is a `GET` that returns a contract for a screen or a read model. Neither is a generic table update.

| Intent | Shape | Handler |
| --- | --- | --- |
| Exit one animal, not as part of a sale | `POST /api/animals/{id}/exit` | Herd |
| Sell named animals | `POST /api/captures/cattle-sales` | Orchestrator |
| Buy feed into the warehouse | `POST /api/captures/feed-purchases` | Orchestrator |
| Record a weighing | `POST /api/weighing-sessions` | Growth |
| Read the weekly summary | `GET /api/read-models/weekly-summary` | Read model |

`PATCH /api/animals/{id}` with a body that sets `active` to false is not an exit. The exit command carries the reason. Herd applies the lifecycle rule.

The examples are conceptual. Implementing them is a later phase.

## Three models

| Model | Lives | Crosses to the UI |
| --- | --- | --- |
| Domain | Module `domain/` | No |
| API contract | Zod schema at the HTTP edge, later `packages/api-contracts` | Yes |
| UI | Screen state in `apps/web` | It is the UI |

A contract can look like a form and still omit invariants that only the domain knows how to enforce. The UI can reshape a contract for a layout without becoming the place a weight is corrected.

## Validation

Zod parses the request and describes the response. Types are inferred. Fastify does not keep a parallel schema for the same body.

The domain runs after parsing. Examples it still owns: unknown tenure stays unknown, inferred parentage is not stored as confirmed, a declared delivery does not create a stock issue, a profitability figure is not accepted as a write.

Failures the client can tell apart:

| Situation | Outcome |
| --- | --- |
| Body does not match the contract | Validation error |
| Body matches and breaks a ranch rule | Domain rejection |
| Version is stale | Conflict, row unchanged |
| Same client id, different business payload | Conflict, previous row kept |
| Same client id, same business payload | Success, existing result |

## Idempotency and versions

Creates send UUIDs the client minted. That is the idempotency key. A second header that repeats the same id is unnecessary.

Updates send the version from the last read. The persistence rule is in [persistence-strategy.md](persistence-strategy.md).

A capture command sends one capture id plus the ids of the rows it will create. The orchestrator writes all of them in one transaction. A retry after a lost response uses the same ids. A partial success is not a state the client has to repair, because the transaction rolled back.

## Clients

The production SPA uses `fetch` through TanStack Query ([ADR-006](adr/ADR-006-frontend-approach.md)). An in-process hardware adapter may call the application function directly and still pass a normalized command. An out-of-process adapter uses this HTTP API. OpenAPI, if a non-TypeScript client needs it, is generated from the Zod schemas and is not edited as a second source.

No version prefix until a contract actually breaks.

## Status

- Version: 0.1
- Status: Proposed strategy. No routes implemented
- Last updated: 2026-10-04
- Source: ADR-009, capture-once orchestrators
- Validation: Closes AQ-P1-001. The catalog remains undesigned
