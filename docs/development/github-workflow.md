# RANCHO GitHub delivery workflow

## Status

- Status: ACCEPTED DELIVERY GOVERNANCE BASELINE
- Version: v1
- Last updated: 2026-10-06

## Purpose

This guide defines how RANCHO moves accepted work safely through Git and GitHub.

It owns branches, Pull Requests, CI, review, and merge. It does not own product scope, ranch facts, or architecture. Scope comes from the [Master Plan](../product/master-plan.md) and the current [Product Increment](../product/increments/README.md), when one exists. Ranch truth comes from [../domain/](../domain/README.md). Architecture comes from [../architecture/](../architecture/README.md). The [Product Constitution](../product/constitution.md) still governs tradeoffs.

Read this guide when the task involves a branch, a commit meant for `main`, a PR, a review of a PR, or a merge. A task that does not touch repository delivery does not need it.

## Core model

Simple GitHub Flow.

```
main
  ↑
Pull Request
  ↑
working branch
```

`main` represents the accepted repository state. Meaningful work reaches `main` through a reviewed Pull Request.

There is no `develop` branch, no GitFlow, no release branch by default, and no environment branch.

## Normal workflow

1. Begin from current `main`.
2. Update local `main` from `origin`.
3. Create a focused working branch.
4. Implement only the approved scope.
5. Run the relevant validation.
6. Commit coherent work.
7. Push the working branch.
8. Open a Pull Request into `main`.
9. Let CI run.
10. Perform a critical review.
11. Resolve `BLOCKER` findings and the appropriate `MAJOR` findings.
12. A human decides whether to merge.
13. Merge.
14. Delete the stale branch when appropriate.
15. Feed important validation or learning back into the artifact that owns it, as the [Master Plan learning loop](../product/master-plan.md#learning-loop) describes.

A local experiment that never becomes accepted work does not need its own branch or PR. Anything intended to enter `main` follows this workflow.

An agent does not push, open a PR, or merge unless a human explicitly asks for that step.

## Branch naming

Lightweight conventions. They are not domain truth, and nothing validates them.

| Prefix | Use | Example |
| --- | --- | --- |
| `gov/` | Governance | `gov/005-github-delivery` |
| `inc/` | Product Increment work | `inc/001-short-description` |
| `fix/` | Bug fix | `fix/short-description` |
| `docs/` | Documentation | `docs/short-description` |
| `chore/` | Maintenance | `chore/short-description` |

An issue number in the branch name is optional.

## Increment, Issue, and Pull Request

| Artifact | Meaning |
| --- | --- |
| Product Increment | A coherent unit of product value or learning. See [increments/README.md](../product/increments/README.md). |
| GitHub Issue | An executable work item, a bug, or a discovery question, when tracking it separately is useful. |
| Pull Request | A reviewable repository change. |

The relationship is flexible:

- one Increment, one PR;
- one Increment, several Issues or PRs;
- one Issue, one PR, with no Increment, for a small bug or chore.

Do not require an Issue when it adds no value. Do not require an Increment for trivial maintenance. There is no fixed rule of one Increment, one Issue, one PR.

Do not slice an Increment only by technical layer when that delays useful validation. Prefer a vertical slice when practical.

A GitHub Issue or comment is discussion. An accepted decision found there belongs in the repository artifact that owns it.

## Pull Requests

Use [`.github/pull_request_template.md`](../../.github/pull_request_template.md). Fill only what applies. Write `N/A` rather than invent an identifier. List only checks that actually ran.

The [Definition of Done](../product/definition-of-done.md) applies in proportion to the change. The template does not copy it.

## Issues

Three optional templates live in [`.github/ISSUE_TEMPLATE/`](../../.github/ISSUE_TEMPLATE/):

- `work-item.md` — concrete executable work.
- `discovery.md` — a question or investigation where information is not yet sufficient. It supports the [Uncertainty Protocol](../product/uncertainty-protocol.md): unknown and blocking means ask or investigate. Discovery is not permission to implement.
- `bug.md` — a defect. A bug does not need an Increment.

Blank issues stay allowed.

## Review

```
Builder
  → PR
    → Reviewer
      → targeted correction, if needed
        → review
          → human merge decision
```

Builder and Reviewer are separate modes, as in the [AI context guide](../ai/context-guide.md#9-builder-and-reviewer-modes). A reviewer starts read-only. A correction is a separate, explicit task.

Severities, consistent with the [review playbook](../prompts/review-pr.md):

| Severity | Meaning | Before merge |
| --- | --- | --- |
| `BLOCKER` | Contradicts accepted governance, domain truth, architecture, or approved scope. Examples: an invented ranch or business rule; a blocking unknown bypassed; a serious data-loss or security issue; a clear violation of accepted architecture; materially incorrect scope; derived data confused with authoritative data. | Must be resolved. |
| `MAJOR` | A meaningful defect, or a governance violation that is not a `BLOCKER`. | Should normally be resolved. |
| `MINOR` | A limited issue. | Fix now, or track it consciously. |

No numerical review score. Do not call work perfect. `NO BLOCKING FINDINGS` is an acceptable conclusion.

## Merge policy

Humans decide merge.

AI agents may implement, review, comment, and recommend merge readiness. They do not have product authority to merge. Do not push to or merge into `main` merely because an agent is technically able to.

Squash merge is the preferred normal method. A PR is one logical reviewed change. Intermediate fixup commits stay visible in the PR without making `main` history noisy. This is a preference, not a permanent rule. Another method can be chosen explicitly when a case justifies it.

Never force-push to `main`. Never delete `main`.

## CI

Workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). Workflow name `CI`. One job, `validate`.

It runs on pull requests targeting `main` and on pushes to `main`:

1. `npm ci`
2. `npm run lint:map`
3. `npm run build:map`, which includes the TypeScript check

CI checks only what exists today. It uses official GitHub actions, read-only repository permissions, and no secrets. There is no deployment, database, Docker, migration, coverage gate, or release automation.

The application pipeline is designed in [deployment-strategy.md](../architecture/deployment-strategy.md#cicd). Those steps join CI with the application. CI grows with real product code.

### Node version

The repository declares `engines.node` as `^20.19.0 || >=22.12.0`. [ADR-005](../architecture/adr/ADR-005-backend-runtime.md) keeps Node within that range. No exact version is pinned.

CI uses Node 24, a supported LTS line inside that range and the version this workspace was bootstrapped with. This is a reversible technical assumption. Change it in `ci.yml` when the project pins a version or a dependency requires another one.

### Check name

The check is intended to appear as `CI / validate`. Confirm the exact name GitHub shows after the first real run before marking it required.

## GitHub repository settings after GOV-005 merge

Documentation only. None of these settings is configured by GOV-005. Do not assume they exist until a human applies them.

For `main`:

- The repository stays private unless humans explicitly decide otherwise.
- The default branch is `main`.
- Require a Pull Request before merging meaningful accepted work.
- Require the CI validation check, once its exact GitHub name is confirmed.
- Require conversation resolution before merge, when available.
- Block force pushes to `main`.
- Block deletion of `main`.
- Merge stays a human decision.
- No mandatory approval count at first, if that would stop the owner from working alone.

If regular collaboration later makes it useful, revisit requiring at least one human approval.

GitHub's interface wording may change. These items describe intent, not exact menu labels.

### Merge methods

Squash merge is the preferred normal method. The repository may expose other merge buttons for now. Restricting the repository to squash merge is optional and can be configured later if the team prefers.

## Optional organization aids

These are optional aids, not governance truth. None is created by GOV-005.

Possible labels:

- `type:product`, `type:bug`, `type:discovery`, `type:technical`
- `area:ux`, `area:domain`, `area:architecture`
- `status:blocked`, `status:needs-ranch-answer`

Do not create priority labels that duplicate Master Plan priority.

Possible milestones, if useful later: MVP Framing, Pilot Design, Pilot-ready Core, Ranch Pilot, MVP v1. A milestone is not committed scope. The Master Plan owns phase.

A GitHub Project or Kanban board is optional. Governance does not depend on one.

## Bootstrap exception

The private GitHub remote was initially empty. The accepted history through GOV-004 was pushed directly to remote `main` before this delivery governance existed.

Remote `main` after bootstrap: `2c688c22c7110a2a3a91a7361ad3575c53da99eb`.

That was a one-time repository initialization step. It is not precedent for bypassing the PR workflow after GOV-005 is accepted.
