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

Goal: one command for infrastructure, then ordinary Node scripts for the app.

- Install dependencies with npm, from the existing workspace.
- Start PostgreSQL with Docker Compose. The application itself is not containerized for daily work.
- Evidence uses the filesystem adapter. MinIO, or any other emulator, is optional and only for a test that must speak S3. It is not required to build features.
- Environment values the app will need, when it exists: `DATABASE_URL`, `SESSION_SECRET`, `EVIDENCE_STORAGE` (`filesystem` or `s3`), a filesystem path for local evidence, and endpoint, bucket, region, and credentials when `EVIDENCE_STORAGE=s3`.
- Intended scripts, not added now: `dev:api`, `dev:web`, a migrate command, and the test command. Root `package.json` is unchanged by this design.
- Node versions stay inside the engines field the repository already declares.

Docker is the local dependency besides Node. A developer who cannot run Docker would point `DATABASE_URL` at any reachable PostgreSQL. That is a fallback, not a second supported database engine.

## Hosting requirements

Decide the provider at first deploy, against this list. Physical architecture v0.1 does not lock one in.

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
| Backups | Provider backups, plus one practiced restore before real ranch data. |

Candidate categories, not a selection: a small application platform that also sells managed PostgreSQL, or a small virtual machine plus managed PostgreSQL. Object storage may be the same company or a second one. Prefer two bills plus GitHub, not a third platform for auth, search, or queues.

There is no compelling reason to name the vendor in an ADR yet. AQ-P1-006 stays open for the provider and the region. The shape above is closed.

A container image is created only if the chosen host wants one. A Dockerfile is not part of this design.

## CI/CD

GitHub Actions, designed now and implemented with the application.

On a pull request:

- install from the lockfile
- lint
- typecheck
- unit, application, API, and import tests
- persistence tests against a PostgreSQL service container
- build

On the main branch, the same checks. After they pass, and once a host exists: apply reviewed migrations as an explicit step, then deploy the process and the static build. A failed migration stops the deploy.

Migrations are not applied from a pull request against production. Production does not migrate on process start.

Workflow files are not added in this version.

## Observability

There is one process. Distributed tracing is not a starting tool.

- Structured JSON logs through Pino, including the Fastify request id.
- The response exposes that id so a failed capture can be found in the log.
- `GET /api/health` reports that the process is up. `GET /api/health/ready` checks PostgreSQL. Neither prints secrets.
- Unhandled errors are logged with the request id. Stack traces stay in the log, not in the browser.
- An external error product can be added later if host log retention is too short or the owner needs an exception alarm. It is not required to launch.
- Database backup failure is the provider's alarm, plus the restore drill above. It is not a second monitoring stack.
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
| Ceremony without a current benefit | Not included: Kubernetes, a broker, a second framework, a package per module, MinIO, a tracing cluster, an error subscription, row-level security |

The stack is large enough to keep a transaction and a module boundary, and small enough that a second person can run it. If a later review finds a tool that only the diagram needed, delete the tool.

## Status

- Version: 0.1
- Status: Proposed strategy. No host, workflow, or Compose file
- Last updated: 2026-10-04
- Source: ADR-002, ADR-005, security baseline
- Validation: Vendor remains open. Topology is decided
