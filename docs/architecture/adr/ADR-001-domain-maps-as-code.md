# ADR-001: Domain maps as code

## Status

Accepted

## Context

RANCHO is in domain discovery. The team needs a durable way to record how the ranch works today, which alternatives are considered, and which software shape follows from those choices.

Static diagram files are easy to draw and hard to trace. They do not show which pain point led to which option, which option was selected, or which software requirement and module came from that choice. They also review poorly in Git, because an image does not show the decision that changed.

The maps that matter here are expected to connect:

current process → pain point → solution options → selected approach → software requirement → architecture/module

## Decision

Maintain domain and process maps as code instead of using static diagrams as the primary source of truth.

The interactive application in `apps/domain-map` is the working surface. Node and edge definitions live in typed data files. Git preserves the evolution of the maps and the decisions attached to them.

Static images may be exported later for reading outside the tool. Those exports are not the source of truth.

## Alternatives considered

- **Static images only.** Fast to produce, but they hide history, do not link a process step to later requirements, and become stale copies.
- **A separate diagramming product as the source of truth.** Useful for workshops, but the model would live outside this repository and would not version with the software decisions.
- **Waiting to draw maps inside the future production application.** That application is not designed yet. Discovery needs a place to work before that design exists.

## Consequences

- Map changes are reviewed as code.
- The initial model stays small and typed, and can grow without treating pictures as the record.
- Someone must keep the interactive model and any later exports from drifting. The code remains authoritative.
- The current AS-IS graph is scaffolding. It is not a ranch process baseline.
