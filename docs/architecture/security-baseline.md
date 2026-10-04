# Security baseline

Controls for a handful of users. This is not an enterprise program and it does not implement auth.

Authentication approach: [ADR-010](adr/ADR-010-authentication.md). Evidence bytes: [ADR-011](adr/ADR-011-evidence-storage.md).

## Transport and sessions

- Production traffic is HTTPS only.
- The session cookie is HTTP-only, `Secure`, and `SameSite=Lax`.
- The SPA and the API are served on one origin so the cookie is first-party ([deployment-strategy.md](deployment-strategy.md)).
- Login and other auth routes are rate-limited. Ordinary capture routes are not throttled so tightly that a weighing session cannot be entered.
- A stale version or a bad password fails the request. It does not reveal whether an email exists beyond what the login flow must say to a single known owner.

## Authorization

The HTTP layer checks the role on the session, then calls the command. Roles in [ADR-010](adr/ADR-010-authentication.md) are `owner` and `support` at the start. Workers and partners are not users until a later decision.

Domain modules do not read the session. They store `RecordedBy` as the account that was already checked. `ReportedBy` remains optional source metadata.

Row-level security in PostgreSQL is a second policy language. It is not adopted. If application checks are bypassed by ad-hoc SQL, that is an operational failure, not a reason to add RLS in advance.

## Secrets

- Local secrets live in an uncommitted environment file. An example file, when the app exists, lists keys and no real values.
- Production secrets live in the host's secret store.
- GitHub Actions holds only what deploy needs.
- The database password, the session secret, and the object-storage keys are different secrets.
- The application connects as a runtime role that cannot change the schema. Migrations use a different role.

## Input and files

- Zod validates command bodies ([api-strategy.md](api-strategy.md)).
- The domain still enforces ranch invariants.
- Uploads allow only the types the ranch actually sends: JPEG, PNG, WebP, PDF, and common phone audio types. Other types are rejected.
- A single upload is capped. The starting cap is 25 MB, enough for a phone photo or a short audio note, and it can move when a real file does not fit.
- Stored objects are not served as executable content. The bucket is not the web root.
- The evidence port stores bytes and technical metadata. It does not parse a peso or a kilogram out of the file.

Virus scanning and a web application firewall are out of proportion to two to five users. Revisit if the API is exposed to open registration.

## Audit and backups

- Corrections record who, when, and why, in the owning module ([persistence-strategy.md](persistence-strategy.md)).
- Support sessions are accounts of their own, so an edit by a developer is not stored as the owner.
- PostgreSQL backups are the managed provider's automated backups, kept at least seven days, with point-in-time recovery when the small plan includes it.
- A restore is practiced before the database holds real ranch history.
- Object storage keeps the bytes that PostgreSQL only references. A redeploy of the Node process must not be the only copy of a ticket photo.
- Application-level encryption is not added on top of the provider's encryption at rest.

## Least privilege

| Actor | Access |
| --- | --- |
| Browser user | One role, one ranch's commands |
| Runtime database role | DML on application schemas |
| Migration role | DDL, used by the migrate command |
| Object-storage credential | The one bucket |
| Domain module | Its own tables, through its repositories |

The production application does not connect as a superuser.

## Dependency and platform hygiene

- Dependencies are installed from the lockfile in CI.
- Auth cryptography comes from the session library, not from new code.
- Errors returned to the browser do not include SQL or stack traces.
- Health checks do not print connection strings.

## Status

- Version: 0.1
- Status: Proposed baseline. No controls implemented
- Last updated: 2026-10-04
- Source: ADR-010, ADR-011, a handful of expected users
- Validation: Proportional to the owner and the two developers. Not a compliance program
