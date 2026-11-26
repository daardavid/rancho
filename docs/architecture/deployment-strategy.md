# Deployment strategy

How the system is run locally and, later, in production. No host is selected. No workflow file is added.

## Topology

```text
Browser
  │ HTTPS, one origin
  ▼
Node process
  ├── built SPA
  └── /api
        │
        ├── PostgreSQL
        └── S3-compatible bucket
```

The production process serves the API and the built files of `apps/web`. One origin keeps the session cookie first-party. The SPA remains a separate build. Development runs Vite on its own port and proxies `/api` to the API process.

A static host plus a separate API origin is acceptable later only if both names share one parent domain and the cookie still works. Unrelated origins are not the design.

Kubernetes is not a candidate. Serverless functions are not the API: a transaction and a connection pool want a long-lived process ([ADR-005](adr/ADR-005-backend-runtime.md)).

Deployment units: the Node process, the PostgreSQL database, the bucket. The database and the bucket are managed. The Node process is the only application the team deploys.

## Local development

Goal: explicit commands for infrastructure and for the app. Nothing starts a migration by booting the process.

- Install dependencies with npm, from the existing workspace.
- Start PostgreSQL with Docker Compose. The application itself is not containerized for daily work. The Compose file is PostgreSQL only.
- Evidence uses the filesystem adapter. An object-storage emulator, including MinIO, is not part of the initial local setup.
- Environment values the app will need, when it exists: `DATABASE_URL`, `SESSION_SECRET`, `EVIDENCE_STORAGE` (`filesystem` or `s3`), a filesystem path for local evidence, and endpoint, bucket, region, and credentials when `EVIDENCE_STORAGE=s3`.
- Intended commands, not added now: start PostgreSQL, migrate, reset the local database, run the API, and run the web app. Migrate is explicit locally as well as in deployment. Reset is local-only. Root `package.json` is unchanged by this design.
- Node versions stay inside the engines field the repository already declares.
- Tests use a separate PostgreSQL database. Migrations are applied before persistence tests. Most of those tests roll back. Tests that commit clean up after themselves. Testcontainers are not part of the initial setup ([testing-strategy.md](testing-strategy.md)).

Docker is the local dependency besides Node. A developer who cannot run Docker would point `DATABASE_URL` at any reachable PostgreSQL. That is a fallback, not a second supported database engine.

## Hosting requirements

Decide the provider at first deploy, against this list. The Physical Architecture v1 baseline does not lock one in.

| Need | Requirement |
| --- | --- |
| API | A long-lived Node process, or a container running that process. Build from GitHub. |
| PostgreSQL | Managed, automated backups, at least seven days, TLS. Direct connections from the small pool. A transaction pooler is unnecessary at this size. If a host forces a pooler, use session pooling so server-side transactions behave. |
| Object storage | S3-compatible API, one private bucket. |
| Secrets | Host secret store, not the image. |
| Logs | Stdout JSON, retained by the host long enough to debug a failed capture. |
| HTTPS | Provided by the host or a proxy in front of it. |
| Domain | Optional at the start. Required before a cookie is shared across names. |
| Latency | Interactive forms for a user in Mexico. A North American region, central or eastern United States, is the preference. A Mexico region is not required. Europe and South America are a weaker default. |
| Backups | Automated daily PostgreSQL backups, at least seven days, point-in-time recovery when economically available, one practiced restore before real ranch history. Object-storage versioning when inexpensive. Backup credentials protected like database credentials. |

Candidate categories, not a selection: a small application platform that also sells managed PostgreSQL, or a small virtual machine plus managed PostgreSQL. Object storage may be the same company or a second one. Prefer two bills plus GitHub, not a third platform for auth, search, or queues.

There is no compelling reason to name the vendor in an ADR yet. AQ-P1-006 stays open for the provider and the region. The shape above is closed.

A free host for the first publication is proposed in [ADR-016](adr/ADR-016-publicacion.md). It stays a proposal until David accepts it. AQ-P1-006 stays open until then.

A container image is created only if the chosen host wants one. A Dockerfile is not part of this design.

## CI/CD

GitHub Actions, designed now and implemented with the application.

On a pull request, and on the main branch:

- install from the lockfile
- lint
- typecheck
- the architecture import test
- unit tests
- persistence tests against a PostgreSQL service container
- build
- the few Playwright end-to-end flows, against the built application

When migration files exist, the pipeline also applies them to the test database before the persistence tests. High or critical production advisories from `npm audit` block the pipeline or require an explicit review.

## Release shape

When a host exists, a release does these steps in order:

1. Build.
2. Confirm a backup is available.
3. Run the reviewed migration as its own command.
4. Start or deploy the new process.
5. Verify `GET /api/health/ready`.

Migrations are not applied from a pull request against production. No environment migrates on process start. Prefer a backward-compatible migration when that is practical. A destructive migration uses a maintenance window and an explicit procedure.

Workflow files are not added in this version.

## Observability

There is one process. Distributed tracing is not a starting tool.

- Structured JSON logs through Pino, including the Fastify request id.
- The response exposes that id so a failed capture can be found in the log.
- `GET /api/health` reports that the process is up. `GET /api/health/ready` checks PostgreSQL. Neither prints secrets.
- Host logs retain stdout long enough to debug a failed capture.
- Unhandled errors are logged with the request id. Stack traces stay in the log, not in the browser.
- An external error product waits until remote operation makes log-only diagnosis inadequate. It is not required to launch.
- Database backup failure is the provider's monitoring, plus the restore drill above. It is not a second monitoring stack.
- Ranch alerts (confirmed missing, a severe health note) are read models, not observability.

## Cost and complexity

Counted for a hobby team and about 21 head:

| Question | Answer |
| --- | --- |
| What must be understood? | TypeScript, React, Vite, Fastify at the edge, Drizzle, PostgreSQL, Zod, a session library, TanStack Query, Vitest, later Playwright, GitHub Actions, the S3 API |
| What must be paid for? | A small app host, managed PostgreSQL (often the same bill), object storage, a domain when a real name is needed. No per-user auth fee |
| Local dependencies | Node, and Docker for PostgreSQL |
| Deployment units | One Node process, one database, one bucket |
| Accounts | GitHub, one compute/database host, object storage if it is not included |
| Ceremony without a current benefit | Not included: Kubernetes, a broker, a second framework, a package per module, MinIO, a tracing cluster, an error subscription, row-level security, Testcontainers |

The stack is large enough to keep a transaction and a module boundary, and small enough that a second person can run it. If a later review finds a tool that only the diagram needed, delete the tool.

## Status

- Version: 0.2
- Status: Accepted with the Physical Architecture v1 baseline. No host, workflow, or Compose file
- Last updated: 2026-10-04
- Source: ADR-002, ADR-005, security baseline, physical architecture QA
- Validation: Vendor remains open. Topology is decided
