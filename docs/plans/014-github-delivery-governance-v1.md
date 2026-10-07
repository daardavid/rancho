# Plan 014 — GitHub delivery governance v1

## Purpose

GOV-005 connects accepted product governance to actual repository changes:

```
Master Plan
    → Product Increment
        → Issue, when useful
            → working branch
                → Pull Request
                    → CI
                        → critical review
                            → human merge
                                → validation and learning
                                    → repository knowledge and next direction
```

It is the last Governance v1 construction task. It closes Governance v1 when its PR is reviewed and merged into `main`.

It does not frame an MVP, choose features, or create an Increment.

## Current remote state

- Private repository `daardavid/rancho`. Remote `origin` is `https://github.com/daardavid/rancho.git`.
- Remote `main` is at `2c688c22c7110a2a3a91a7361ad3575c53da99eb` (GOV-004).
- The remote was empty when it was created. Design v1 and GOV-001 through GOV-004 were pushed directly to remote `main` before any delivery governance existed.

That direct push was a one-time bootstrap exception. It is not precedent. After GOV-005 is accepted on `main`, meaningful work uses the documented PR workflow.

## Artifacts

| Artifact | Role |
| --- | --- |
| [../development/github-workflow.md](../development/github-workflow.md) | Delivery authority: branches, PRs, review, merge, CI, manual settings |
| `.github/pull_request_template.md` | PR description |
| `.github/ISSUE_TEMPLATE/work-item.md`, `discovery.md`, `bug.md` | Optional issue shapes |
| `.github/workflows/ci.yml` | Minimal CI for what exists today |
| [../checkpoints/governance-v1.md](../checkpoints/governance-v1.md) | Governance v1 closure |

Minimal updates: Start Here, the AI context guide, the development-workflow Cursor rule, the implement and review playbooks, and the Master Plan.

## Strategy

Simple GitHub Flow. `main` is the accepted state. A focused working branch reaches `main` through a reviewed Pull Request. No `develop` branch, no GitFlow, no release or environment branches.

An Increment is a product unit. An Issue is an optional work item. A PR is a reviewable change. The ratio between them is flexible. An Issue is not required when it adds nothing. A trivial change does not need an Increment.

Review uses the existing `BLOCKER`, `MAJOR`, `MINOR` severities. Humans decide merge. Squash merge is the preferred normal method, not a permanent law.

## CI scope

One workflow, `CI`, with one job, `validate`: `npm ci`, `npm run lint:map`, `npm run build:map`. It runs on pull requests targeting `main` and on pushes to `main`. Read-only permissions, no secrets, official GitHub actions only.

This is the domain-map subset of the pipeline designed in [../architecture/deployment-strategy.md](../architecture/deployment-strategy.md). Typecheck already runs inside `build:map`. The application steps there, including unit tests, persistence tests, migrations, and audit, arrive with the application. GOV-005 does not change that design.

Node version: the repository declares `engines.node` as `^20.19.0 || >=22.12.0`, and ADR-005 says to stay within it. No exact version is pinned. CI uses Node 24 LTS, the version the workspace was bootstrapped with. That is a reversible technical assumption, documented in the delivery guide.

## Manual settings after merge

Branch protection, the required status check, conversation resolution, merge-method settings, labels, milestones, and any project board are documented in the delivery guide. None is configured by this task. The required check name is confirmed from a real CI run first.

## Closure condition

Governance v1 is closed when the PR containing [../checkpoints/governance-v1.md](../checkpoints/governance-v1.md) is reviewed and merged into `main`. Until then this branch only proposes closure.

## Validation

- Baseline: branch `gov/005-github-delivery`, clean tree, `origin/main` at `2c688c2`.
- `git diff --check` is clean.
- `npm run lint:map` and `npm run build:map` pass locally.
- CI is not remotely validated until the branch is pushed and a real PR runs it.
- Every governance question has one authority. No circular authority.
- Links resolve.
- No MVP scope, feature, Increment, Product Decision, or production code is created.

## Non-goals

- MVP Framing, MVP scope, first features, `INC-001`, or an MVP backlog
- New Product Decisions, domain facts, or architecture changes
- Promoting an opportunity into the plan
- `apps/api`, `apps/web`, migrations, backend dependencies, deployment
- Pushing this branch, opening the PR, or changing GitHub settings
- Creating labels, milestones, or a project board
- Enterprise release ceremony or naming validation
