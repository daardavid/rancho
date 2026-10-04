# ADR-010: Cookie sessions in PostgreSQL, library chosen at scaffold

## Status

Accepted

Accepted with the Physical Architecture v1 baseline. The session architecture is frozen. The library is not. This ADR does not implement login, passwords, or roles.

## Context

The first application user is the owner. The two developers need a support path. Workers, the veterinarian, the economic partner, buyers, sellers, and suppliers are actors in the domain catalog. They are not assumed to have accounts ([system-context.md](../system-context.md), `CON-ENTRY-001`).

Authentication is a port in front of the application ([integrations.md](../integrations.md)). Domain aggregates do not import a provider. A later worker or partner account must be possible without rewriting Herd or Finance.

Priorities are security, low maintenance, roles, a browser and later PWA that can send the same credential, and low cost. The user count at the start is a handful, not a directory.

Physical architecture v0.1 named Better Auth as the default library. The v0.2 refinement keeps library-based sessions and leaves the package until scaffold, because a library that owns organizations, roles, or domain objects would contradict [ADR-013](ADR-013-ranch-scope.md) and the module boundary.

## Decision

Use cookie-based server sessions stored as rows in PostgreSQL, maintained by an authentication and password library, isolated at the HTTP and identity edge.

Frozen:

- Sessions are rows in the `identity` schema, not a long-lived access token. Revoking a session deletes or expires the row.
- The browser receives an HTTP-only session cookie. In production the cookie is `Secure`, with `SameSite=Lax`. Production serves the SPA and the API on one origin so the cookie is first-party ([deployment-strategy.md](../deployment-strategy.md), [security-baseline.md](../security-baseline.md)).
- Passwords are hashed by the maintained library. The application does not invent a hash.
- Password reset for the first boot may be developer-assisted. An email provider is not required to start.
- The HTTP layer resolves the session, reads `RanchId` and the role from that session, and checks the role before it calls an orchestrator or a module command. Module domain code receives `RecordedBy`. It does not read cookies, and it does not import the auth library.
- The session carries the `RanchId` the caller may act for ([ADR-013](ADR-013-ranch-scope.md)). The client does not select an arbitrary ranch.

The library itself is chosen when the API is scaffolded. Better Auth is the first candidate to try. It is not an accepted dependency of this baseline.

Acceptance criteria for whichever library is tried:

- Session ownership remains in identity infrastructure. The library does not become an application module.
- No organization, team, or tenant object from the library becomes the ranch.
- Auth-specific objects do not leak into Herd, Growth, Feeding, Inventory, or Finance.
- Roles remain application authorization concepts, checked at the route or command. They are not a policy engine inside the library's data model.
- Ranch actors remain distinct from user accounts. `ReportedBy` is not a user id.

If Better Auth cannot meet those criteria, the scaffold uses a thinner maintained session and password library. That replacement does not reopen cookie sessions or the `identity` schema. Hand-rolled password hashing is not the thinner option.

Conceptual authorization roles, separate from domain actors:

| Role | Who | Initial |
| --- | --- | --- |
| `owner` | The ranch owner. Writes and reads operational facts | Yes |
| `support` | A developer session. Writes are still audited as that account | Yes |
| `worker` | A future field account | Reserved name. Not built |
| `veterinarian` | A future professional account | Reserved name. Not built |
| `partner-readonly` | A future read-only partner account | Reserved name. Not built |

`ReportedBy` stays the real-world source on a fact. It is not a role and not a user id. Giving a worker a `ReportedBy` value does not create a login.

A permission matrix is not part of this decision. The first check is the role on the session, on the route or command. There is no per-animal access list and no database row-level grant for business authorization.

## Why not the other approaches

### Managed identity provider

Clerk, Auth0, Cognito, or a hosted auth product can be the right answer when strangers sign themselves up. Here the owner account can be created by the team. A managed provider adds a vendor, a second failure domain, and a cost or a free-tier limit the herd does not need. It also tempts the domain to treat the provider's user object as a ranch actor. Not selected for the first deployment.

### Hand-rolled application auth

Storing a password without a maintained library is how hobby projects leak credentials. The application owns the session rows. It does not own the cryptographic design. Hand-rolled auth is not selected.

### Freezing Better Auth in this ADR

Naming the package before it has been held against the acceptance criteria would make an organization model, or a leak into a domain module, a surprise during scaffold. The session architecture can be frozen without freezing the package.

## Consequences

- `identity` tables are technical. They are not a sixth domain module and they are not imported by Herd, Growth, Feeding, Inventory, or Finance.
- `RecordedBy` stores the application account id. A support edit is distinguishable from an owner edit.
- A future PWA on the same origin reuses the cookie. A future client on another origin needs a new decision for bearer tokens. That decision is not this one.
- Rate limiting applies to login and similar auth routes ([security-baseline.md](../security-baseline.md)).
- Domain questions about who may assert a fact (`DQ-GOV-001` and the owner-as-assertor rule) stay domain questions. This ADR only decides how an account is established.

## When to revisit

- People outside the team must register themselves, or social login becomes a requirement.
- The session library cannot stay out of the domain modules, and no thinner maintained library can either.
- A worker application on a different origin needs a token the cookie cannot provide.
- More than the owner and support need access, and a role is no longer a sufficient check. Add permissions then. Do not add them in advance.
- The deployment topology stops being one origin. The CSRF baseline in the security document is reviewed with that change.

## Status of this document

- Version: 0.2
- Status: Accepted with the Physical Architecture v1 baseline. Library selection remains implementation-time
- Last updated: 2026-10-04
- Source: system context v0.2, `CON-ENTRY-001`, `BR-ENTRY-001`, physical architecture QA
- Validation: Decision only. No accounts are created
