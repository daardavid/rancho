# INC-002 — Todo en local

Status:
ACCEPTED. David merged it on 2026-11-25.

## Problem

INC-001 runs only through a developer setup that needs a PostgreSQL server. On 2026-11-23 David decided to keep everything local and free for now (no Supabase, no host) and to migrate later. Today there is no one-step way to run and use the app on his laptop and phone, there is no backup, and a weight has no photo of the scale.

## User / Actor

David, with the `support` role, on his laptop and on his phone in the same Wi-Fi. Real use by `ACT-OWNER` waits for the migration increment.

## Why this matters

- David can use and judge INC-001 for free, without installing a database server.
- A backup in a portable format turns the later migration into a load, not a rewrite.
- The scale photo closes the UX debt INC-001 accepted.
- The factory stops merging work whose CI is red.

## Hypothesis

If the app starts with one command and opens on the phone, David will use it with test data and find what to change before the family uses it.

## What we want to learn

- Whether capturing a weighing session on a phone works in practice.
- Whether a backup made locally restores into an empty database with the same data.

## User outcome

1. `npm run local` prepares and starts everything: the embedded database with its data in a local folder, migrations, the ranch seed, the first account if none exists, and the app.
2. The app shows the address to open it from a phone on the same Wi-Fi.
3. `npm run respaldo` writes a backup file; `npm run restaurar` brings it back after confirming.
4. Each weight can carry a photo of the scale indicator, taken from the phone.
5. A weighing draft does not survive logout, and failed logins cannot be used to lock the owner out on purpose.

## Domain facts involved

- `TGT-WEIGH-001`: the photo of the indicator is optional evidence of a weight.
- A photo does not turn a weight into `measured`; the quality is still chosen and stored on its own.
- Evidence metadata and storage: [persistence-strategy.md](../../architecture/persistence-strategy.md) ("Evidence metadata") and ADR-011.

## Data produced / improved

Local database files, backup files, evidence files and their metadata.

## Decision enabled

What to change in the capture flow before real use; when to migrate.

## Unknowns

### Blocking

None.

### Non-blocking

- `OQ-SCALE-001`: the scale model. The photo works with any indicator.
- The future host and database provider: deferred by David.

## In scope

- Local runtime on the embedded PostgreSQL engine (PGlite) with persistence, documented in a proposed ADR-015.
- One-command start, LAN access, local backup and restore in a format a normal PostgreSQL can load.
- Evidence port with the filesystem adapter, and the scale photo per weight.
- Two security details from the INC-001 final review.
- CI on pull requests to `integracion`, and the factory waiting for CI before merging.

## Explicitly out of scope

Hosting, Supabase, real ranch data, loading notebook or Excel history, feed, inventory, finance, births, exits, verification.

## Relevant ADRs

ADR-005, ADR-007, ADR-010, ADR-011, ADR-014, and the proposed ADR-015.

## Product Scorecard

Economic Value:
LOW

UX Benefit:
HIGH

Decision Value:
MEDIUM

Data Value:
MEDIUM

Evolution Value:
HIGH

Frequency / Reach:
LOW

Complexity / Burden:
MEDIUM

Recommendation:
PURSUE NOW

Reasoning: it costs nothing to run, it lets David validate INC-001 before the family uses it, and the portable backup prepares the migration.

## Acceptance criteria

- On a clean clone with Node installed, `npm install` then `npm run local` leaves the app running with no database server installed and no Docker.
- Data survives stopping and starting again. The data folder, backups and evidence are ignored by git.
- The app opens and logs in from a phone on the same Wi-Fi.
- A backup restores into an empty database with the same animals, weighings and corrections, and the same file loads into a normal PostgreSQL.
- A weight with a photo keeps its chosen quality; correcting or detaching a weight does not delete the photo bytes.
- Logging out removes the weighing draft from that browser.
- Five failed logins from another device do not stop the owner from logging in from theirs.
- A factory PR whose CI fails is not merged.

## Validation plan

Automated tests, CI on every factory PR, and David using the app on his phone with test data.

## Accepted UX debt

- Plain HTTP on the home network; HTTPS arrives with hosting.

## PR mapping

Tasks `fabrica/tareas/R-12.md` to `R-16.md`.

## Learning after validation

(empty)