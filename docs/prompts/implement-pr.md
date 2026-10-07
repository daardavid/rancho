# Implement an approved change

This playbook is a Builder prompt. It is not a source of truth. The Master Plan gives direction. When the current-work artifact is a Product Increment, that increment is the product scope. This prompt does not override the increment or other governance.

No production application is scaffolded. Do not assume `apps/api` or `apps/web` exists. Repository delivery follows [../development/github-workflow.md](../development/github-workflow.md). Do not assume branch protection or other GitHub settings are configured.

CURRENT WORK:
<path or issue supplied by user>

## Before editing

1. Read [../START-HERE.md](../START-HERE.md).
2. Read the current-work artifact supplied above. If none was supplied, stop and ask for it.
3. Load only the domain, UX, and architecture context that this scope requires. Use [../ai/context-guide.md](../ai/context-guide.md) to choose it.
4. Summarize the understood scope before changing files: the problem, the primary user, what is in scope, and what is out of scope.
5. List blocking unknowns.
6. If a required fact is unknown, or the request conflicts with the Constitution, domain truth, an accepted Product Decision, an accepted ADR, or the supplied scope, stop and ask. Do not implement past that point.

## While editing

7. Implement only the approved scope.
8. Do not add an unrelated refactor, dependency, future integration, or extra feature.
9. Run the checks that the touched files require. For a domain-map change, run `npm run lint:map` and `npm run build:map`.

## Before calling the work done

10. Compare the result with [../product/definition-of-done.md](../product/definition-of-done.md). Apply it in proportion to the change.
11. Report:
    - files changed
    - checks actually run, and their results
    - assumptions made
    - unknowns left explicit
    - conflicts, if any
    - out-of-scope findings left unimplemented

Do not claim a check passed if it was not run. You may prepare commits on a working branch. Do not push, open a PR, or merge unless the user explicitly asks.
