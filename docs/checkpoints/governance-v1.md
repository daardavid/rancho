# RANCHO Governance v1 Checkpoint

- Status: CLOSED
- Effective: when this checkpoint is present on `main`

A working branch may contain this closure checkpoint before merge. `main` remains the accepted project state. Once the GOV-005 PR containing this document is reviewed and merged into `main`, Governance v1 is closed.

## Purpose

Governance v1 sets how humans and AI agents decide, record, scope, review, and deliver RANCHO work. It does not frame an MVP, select features, or change ranch facts or architecture.

## State

| Phase | State |
| --- | --- |
| Design v1 | CLOSED. [design-v1.md](design-v1.md) |
| Governance v1 | CLOSED when this checkpoint reaches `main` |
| Next phase | MVP Framing |

## Governance layers

| Layer | Artifact |
| --- | --- |
| Product Constitution | [../product/constitution.md](../product/constitution.md) |
| Uncertainty Protocol | [../product/uncertainty-protocol.md](../product/uncertainty-protocol.md) |
| UX Principles | [../product/ux-principles.md](../product/ux-principles.md) |
| Product Scorecard | [../product/product-scorecard.md](../product/product-scorecard.md) |
| Definition of Done | [../product/definition-of-done.md](../product/definition-of-done.md) |
| AI Context Guide | [../ai/context-guide.md](../ai/context-guide.md) |
| Cursor Rules | `.cursor/rules/` |
| Prompt playbooks | [../prompts/](../prompts/implement-pr.md) |
| Master Plan | [../product/master-plan.md](../product/master-plan.md) |
| Product Decision mechanism | [../product/decisions/README.md](../product/decisions/README.md) |
| Opportunity Backlog | [../product/opportunity-backlog.md](../product/opportunity-backlog.md) |
| Product Increment mechanism | [../product/increments/README.md](../product/increments/README.md) |
| GitHub delivery workflow | [../development/github-workflow.md](../development/github-workflow.md) |
| PR and Issue templates | `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/` |
| Minimal CI | `.github/workflows/ci.yml` |

Authority by question type stays in [../START-HERE.md](../START-HERE.md).

## Governance commits

| Task | Commit |
| --- | --- |
| GOV-001 Product governance baseline | `ef67778c3eaddb58eebfd137d0af97abbbe65052` |
| GOV-002 UX, evaluation, and Definition of Done | `c3e04f2e01e2a1e23d7c539f73fa62015578f408` |
| GOV-003 AI agent and Cursor governance | `eb6d1fea1ec8c2d0337c1ffb003574c4a9605924` |
| GOV-004 Product direction governance | `2c688c22c7110a2a3a91a7361ad3575c53da99eb` |
| GOV-005 GitHub delivery governance | Closure commit containing this checkpoint |

## Bootstrap exception

The private GitHub remote was initially empty. Design v1 and GOV-001 through GOV-004 were pushed directly to remote `main` at `2c688c22c7110a2a3a91a7361ad3575c53da99eb` before delivery governance existed. That was a one-time initialization step. It is not precedent. See [../development/github-workflow.md](../development/github-workflow.md#bootstrap-exception).

## Not yet configured

Branch protection, the required CI check, merge-method restrictions, labels, milestones, and any project board are documented as intent in the delivery workflow. They are not configured by Governance v1. Apply them manually after merge.

## Where the project stands

- No production application exists yet.
- No MVP scope has been selected.
- No real Product Increment has been created.
- No Product Decision has been created.
- MVP Framing comes before implementation.

## Stop condition

Governance v1 construction ends at this checkpoint. The next phase is MVP Framing, as the [Master Plan](../product/master-plan.md) states.
