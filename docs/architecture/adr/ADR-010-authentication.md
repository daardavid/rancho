# ADR-010: Library-based sessions in PostgreSQL

## Status

Proposed

Proposed with physical architecture v0.1. It does not implement login, passwords, or roles.

## Context

The first application user is the owner. The two developers need a support path. Workers, the veterinarian, the economic partner, buyers, sellers, and suppliers are actors in the domain catalog. They are not assumed to have accounts ([system-context.md](../system-context.md), `CON-ENTRY-001`).

Authentication is a port in front of the application ([integrations.md](../integrations.md)). Domain aggregates do not import a provider. A later worker or partner account must be possible without rewriting Herd or Finance.

Priorities are security, low maintenance, roles, a browser and later PWA that can send the same credential, and low cost. The user count at the start is a handful, not a directory.

## Decision

Use library-based authentication with server-side sessions stored in PostgreSQL.

- The default library is Better Auth, confined to the HTTP edge and the `identity` schema ([ADR-007](ADR-007-postgresql.md)).
- If that library's routes or schema start owning application behavior that belongs to orchestrators, replace it with a thinner session implementation (password hashing plus server-side session rows) without changing this decision's approach.
- Sessions are rows, not a long-lived access token. Revoking a session deletes or expires the row.
- The browser receives an HTTP-only, `Secure` session cookie with `SameSite=Lax`. Production serves the SPA and the API on one origin so the cookie is first-party ([deployment-strategy.md](../deployment-strategy.md)).
- Passwords are hashed by the library. The application does not invent a hash.
- Password reset for the first deployment may be developer-assisted. An email provider is not required to start.
- The HTTP layer resolves the session and checks the role before it calls an orchestrator or a module command. Module domain code receives `RecordedBy`. It does not read cookies.

Conceptual authorization roles, separate from domain actors:

| Role | Who | Initial |
| --- | --- | --- |
| `owner` | The ranch owner. Writes and reads operational facts | Yes |
| `support` | A developer session. Writes are still audited as that account | Yes |
| `worker` | A future field account | No |
| `veterinarian` | A future professional account | No |
| `partner-readonly` | A future read-only partner account | No |

`ReportedBy` stays the real-world source on a fact. It is not a role and not a user id. Giving a worker a `ReportedBy` value does not create a login.

A permission matrix is not part of this decision. The first check is the role on the session.

## Why not the other approaches

### Managed identity provider

Clerk, Auth0, Cognito, or a hosted auth product can be the right answer when strangers sign themselves up. Here the owner account can be created by the team. A managed provider adds a vendor, a second failure domain, and a cost or a free-tier limit the herd does not need. It also tempts the domain to treat the provider's user object as a ranch actor. Not selected for the first deployment.

### Hand-rolled application auth

Storing a password without a maintained library is how hobby projects leak credentials. The application owns the session rows. It does not own the cryptographic design. Hand-rolled auth is not selected.

## Consequences

- `identity` tables are technical. They are not a sixth domain module and they are not imported by Herd, Growth, Feeding, Inventory, or Finance.
- `RecordedBy` stores the application account id. A support edit is distinguishable from an owner edit.
- A future PWA on the same origin reuses the cookie. A future client on another origin needs a new decision for bearer tokens. That decision is not this one.
- Rate limiting applies to login and similar auth routes ([security-baseline.md](../security-baseline.md)).
- Domain questions about who may assert a fact (`DQ-GOV-001` and the owner-as-assertor rule) stay domain questions. This ADR only decides how an account is established.

## When to revisit

- People outside the team must register themselves, or social login becomes a requirement.
- The session library is abandoned, or it cannot stay out of the domain modules.
- A worker application on a different origin needs a token the cookie cannot provide.
- More than the owner and support need access, and a role is no longer a sufficient check. Add permissions then. Do not add them in advance.

## Status of this document

- Version: 0.1
- Status: Proposed with physical architecture v0.1
- Last updated: 2026-10-04
- Source: system context v0.2, `CON-ENTRY-001`, `BR-ENTRY-001`
- Validation: Decision only. No accounts are created
