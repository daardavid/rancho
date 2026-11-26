# ADR-016: Free publication on Render and Neon

## Status

Proposed

Proposed with R-32, inside INC-005. Accepted when David merges it into `main`. It does not publish the app, create accounts, or close [AQ-P1-006](../architecture-open-questions.md). Accepting it would answer that question for this first publication. Until then [deployment-strategy.md](../deployment-strategy.md) still leaves the vendor open.

Checked against the providers' docs on 2026-11-25. A number or a panel label this ADR does not cite from those docs is marked «por confirmar».

## Context

INC-005 prepares the app so a family member can open it from a phone without David's laptop. R-32 does the preparation and does not publish. David decides when, and he creates the accounts.

David's constraints for this step: free, no extra ceremony, no Docker Desktop. `npm run local` stays the laptop path ([ADR-015](ADR-015-local-embedded-postgresql.md)). No secret goes in the repository.

The accepted shape is one long-lived Node process serving the API and the built SPA on one origin, plus managed PostgreSQL ([deployment-strategy.md](../deployment-strategy.md), [ADR-005](ADR-005-backend-runtime.md), [ADR-007](ADR-007-postgresql.md)). The HTTP process does not migrate. The session cookie is `Secure` when `NODE_ENV=production` ([ADR-010](ADR-010-authentication.md)). A North American region, central or eastern United States, is the latency preference. The herd is about 21 head.

Serverless functions are not the API. A Dockerfile is not part of the design. A managed identity provider is not the session store.

## Options

Both combinations are a free Node web service plus a free managed Postgres. Render's own free Postgres is not one of them: it expires 30 days after creation, has no backups, and is deleted after a 14-day grace period ([Render free](https://render.com/docs/free)). That is the wrong place for ranch history.

### A. Render web (free) + Neon Postgres (free) — recommended

| | What the docs say |
| --- | --- |
| Sleep | The web service spins down after 15 minutes without an inbound HTTP request or WebSocket message, and wakes in about one minute. Neon compute scales to zero after 5 minutes of inactivity and cannot disable that on the free plan. |
| Hours and storage | 750 free instance hours per workspace per calendar month. Spun-down time does not consume them. One service awake all month fits. Neon: 100 CU-hours per project per month, up to 2 CU, 1 GB of Postgres storage per project. |
| Backups | Neon free: instant restore up to 6 hours, capped at 1 GB of change history, plus 1 manual snapshot. Scheduled `pg_dump` backups are paid. This is shorter than the seven-day automated backup in the deployment strategy. |
| Region | Render `ohio`. Neon `aws-us-east-2` (Ohio). Same region. No Mexico region. |
| If the limit is exceeded | Web: free services suspend until the next month when the 750 hours run out. Past the included outbound bandwidth, Render bills a supplement; without a payment method it suspends instead of billing. The included gigabytes, and which services that suspension covers, are «por confirmar». Neon: compute suspends until the next period when CU-hours or transfer run out; writes that would grow past 1 GB fail. Data is not deleted. |
| How the laptop's data moves | `npm run respaldo` writes SQL. From the laptop, `npm run cargar-respaldo` loads that file into the Neon URL. The bytes of photos do not travel. |

Sources: [Render free](https://render.com/docs/free), [Render pricing](https://render.com/pricing) (free web, 512 MB RAM), [Render blueprint](https://render.com/docs/blueprint-spec) (`region: ohio`; `preDeployCommand` is paid-only), [Neon free limits](https://neon.com/faqs/free-plan-limits-and-quotas), [Neon plans](https://neon.com/docs/introduction/plans), [Neon regions](https://neon.com/docs/introduction/regions) (page updated 2026-11-18).

### B. Render web (free) + Supabase Postgres (free)

The web half is the same Render service. The database differs.

| | What the docs say |
| --- | --- |
| Sleep | Same Render spin-down. A free Supabase project pauses after a week of low database activity. Restore from the dashboard is available for up to a year after the pause. |
| Hours and storage | Same Render hours. Supabase free: 500 MB database per project, two active projects. |
| Backups | No automatic backups on the free plan. Daily backups start on the paid plan. |
| Region | Render `ohio`. Supabase: the US East region in the panel. The exact region id is «por confirmar». |
| If the limit is exceeded | Same Render rules. Supabase: the project pauses for inactivity; the size cap is 500 MB. What the panel does at the exact byte over 500 MB is «por confirmar». |
| How the laptop's data moves | The same SQL file and `npm run cargar-respaldo`, with Supabase's direct Postgres URL. |

Sources: [Supabase pricing](https://supabase.com/pricing), [project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [backups](https://supabase.com/docs/guides/platform/backups).

## Decision

Recommend A. David publishes, when he decides, as one free Render web service and one free Neon project.

- `render.yaml` at the repository root describes the web service and contains no secrets. `DATABASE_URL` and `SESSION_SECRET` are `sync: false`: the panel asks for them, the file does not hold them.
- The service is native Node (`runtime: node`). There is no Dockerfile.
- Region `ohio` on Render and `aws-us-east-2` on Neon.
- `NODE_ENV=production`, so the session cookie is `Secure`. `HOST=0.0.0.0`, so the platform proxy can reach the process. `MODO=local` is not set. The laptop path is unchanged.
- The start command is `npm start`. That process does not migrate, seed, or create accounts.
- Render's `preDeployCommand` would be the right hook for `db:migrate`, and it is not available on the free plan. David runs `npm run db:migrate` from the laptop, with `DATABASE_URL` set to Neon, before he uses a newly deployed version. The same command is what a paid plan would put in `preDeployCommand`.
- The blueprint does not set a health-check path. Whether Render's own checks count as the traffic that prevents spin-down is «por confirmar». Waking the service on a timer would spend the 750 hours. David opens `/api/health/ready` himself after a deploy.
- `DATABASE_URL` is Neon's direct connection string (the host without `-pooler`), including the `sslmode` Neon puts on it. The app pool stays the small default. A transaction pooler is not required at this size.
- Moving data is `npm run respaldo` on the laptop, then `npm run cargar-respaldo` against the Neon URL. The load runs in one transaction and replaces the app schemas. It asks for the word `CARGAR` and it prints the host and database name, not the password.
- The first owner account is `cuenta:crear` from the laptop against that same URL, unless the loaded backup already has the account. Workers stay out of the app.

B stays the fallback if Neon is unavailable. It is the weaker copy: the project can pause for a week of quiet use, the free plan has no automatic backup, and the disk is half the size.

## Why not the other approaches

- **Render free Postgres.** Expires in 30 days and has no backups. Rejected.
- **Fly.io, Railway, or a virtual machine.** Not compared as a selected pair. A lasting free allowance, and whether a machine image is required, are «por confirmar». The two combinations above already match the Node-plus-managed-Postgres shape without a Dockerfile.
- **Supabase Auth or Neon managed auth.** [ADR-010](ADR-010-authentication.md) keeps sessions in this application's `identity` schema. The hosted auth products are not used.
- **Migrating inside `npm start`.** That would put the migration in the HTTP process, which ADR-007 and the deployment strategy forbid. The free plan's missing pre-deploy hook does not reopen that rule. The explicit command runs on the laptop.

## Consequences

- The first open after a quiet period waits: about a minute for Render, then Neon wakes. The phone may show the platform's loading page.
- Free Neon does not keep seven days of automated backups. Before real ranch history, David takes the one manual snapshot and keeps a `npm run respaldo` file from the laptop. A restore drill against a copy is still the deployment strategy's bar; this ADR does not claim the free tier meets it.
- `npm run respaldo` reads `.datos/`, not Neon. Weights captured on the phone are not in the laptop copy.
- Photo bytes stay on the laptop. The free web disk is wiped on spin-down, restart, and redeploy ([Render free](https://render.com/docs/free)). [ADR-011](ADR-011-evidence-storage.md) still wants an S3-compatible bucket for a deployed environment, and this ADR does not pick one. A weight's photo will not open on the phone.
- `npm run local` is unchanged. It does not read `DATABASE_URL` and it does not use this host.
- Two bills are possible later (Render and Neon). Today both are free. GitHub remains the third account, for the code.

## Revisit when

- David accepts a paid database so the backup window can reach seven days, or a paid web service so `preDeployCommand` can run the migration.
- A bucket is chosen for evidence bytes.
- The family needs a name other than the host's default HTTPS name.
- The free limits above change, or a cited doc no longer matches. Update this ADR; do not guess the new number.

## Status of this document

- Version: 0.1
- Status: Proposed with R-32
- Last updated: 2026-11-25
- Source: INC-005, R-32, ADR-005, ADR-007, ADR-010, ADR-011, ADR-015, deployment strategy, the provider docs cited above
- Validation: Proposal plus the startup and backup-load tests. No account is created and nothing is published
