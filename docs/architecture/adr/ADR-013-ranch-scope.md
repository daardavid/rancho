# ADR-013: RanchId is application scope from the first persistence version

## Status

Accepted

Accepted with the Physical Architecture v1 baseline. It does not create a table, a session, a seed, or a second ranch.

## Context

The system records facts for one ranch at Balancán. Physical architecture v0.1 left a second ranch as a later discriminator. Adding that column after authoritative history exists is a migration across every business table, every uniqueness rule, and every evidence key. The team can put the column in the first persistence version without building a tenant product.

`RanchId` also has to mean the same thing in three places that would otherwise invent three scopes: the business row, the session, and the object-storage key. A Herd aggregate called Ranch, a Better Auth organization, or a SaaS tenant would each pull the others into the wrong model.

## Decision

Introduce `RanchId` as data and application scope on the first persistence version.

- Every authoritative business record includes `ranch_id` unless the row is technical and has no ranch meaning. A migration journal is an example of a row that does not gain a decorative ranch id.
- `RanchId` is an identifier in the shared kernel. It is not a Herd aggregate, not a paddock, and not a roster concept.
- The first installation seeds one ranch. There is no provisioning workflow.
- A session stores the `RanchId` that session may act for. The client does not send an arbitrary ranch id to choose scope.
- Evidence object keys are `{ranchId}/{evidenceId}` ([ADR-011](ADR-011-evidence-storage.md)).
- A unique business constraint is generally unique inside the ranch. Conceptual examples: `unique(ranch_id, animal_display_code)`, `unique(ranch_id, paddock_label)`.
- Authorization roles stay application concepts ([ADR-010](ADR-010-authentication.md)). They are not ranch records. Domain actors stay distinct from user accounts.

This decision does not include billing, a ranch switcher, organization administration, invitations, a cross-ranch support console, tenant branding, tenant provisioning, or PostgreSQL row-level security.

## Why a dedicated decision

Persistence, the session, and the storage key all have to carry the same scope or they will drift. Putting the rule only in the PostgreSQL ADR would leave authentication free to model an organization, and the evidence ADR free to key objects by evidence id alone. One short decision keeps those three aligned.

## Why this is not a tenant platform

One seeded ranch is the operating assumption in [system-context.md](../system-context.md). The column exists so a later second ranch is a data fact rather than a rewrite. It does not create a product for managing many ranches. Support access is still the `support` role inside that one installation, not a console across customers.

## Consequences

- The first migration of business tables includes `ranch_id`. Uniqueness and evidence keys assume it.
- An authentication library's organization, team, or tenant object is not the ranch. If a candidate library requires that mapping, it fails the acceptance criteria in [ADR-010](ADR-010-authentication.md).
- Herd does not gain a Ranch aggregate root to "own" the id.
- Read models filter by the session ranch. They do not accept a client-selected ranch as a query parameter that widens scope.
- Extracting a module later takes `ranch_id` with that module's schema. The column is not a cross-module foreign key into a tenant service.

## When to revisit

- A second real ranch needs administration that a single seeded id and a session column cannot express. Add that administration then.
- A legal or hosting split requires a database per ranch. That would also reopen [ADR-002](ADR-002-modular-monolith.md) and [ADR-007](ADR-007-postgresql.md).

Do not revisit it to introduce billing, invitations, or a switcher before a second ranch exists.

## Status of this document

- Version: 0.1
- Status: Accepted with the Physical Architecture v1 baseline
- Last updated: 2026-10-04
- Source: physical architecture QA, system context v0.2, ADR-007, ADR-010, ADR-011
- Validation: Decision only. No seed and no schema are created
