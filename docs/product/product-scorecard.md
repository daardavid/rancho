# RANCHO Product Scorecard

## Status

- Status: ACCEPTED PRODUCT EVALUATION BASELINE
- Version: v1
- Last updated: 2026-10-04

This scorecard is a qualitative framework for deciding whether a product idea, feature, automation, integration, or meaningful increment deserves to be pursued now.

It supports human judgment. It does not produce a numerical ROI, a weighted total, or an automatic priority. The [Product Constitution](constitution.md) still governs the tradeoff. The [Uncertainty Protocol](uncertainty-protocol.md) still applies when a missing fact blocks the decision.

## Rating scale

Use exactly one of:

- `HIGH`
- `MEDIUM`
- `LOW`
- `UNKNOWN`

`UNKNOWN` means the available evidence is insufficient. `UNKNOWN` is not automatically `LOW`. A missing blocking fact is a reason to investigate or ask, not a reason to invent a rating.

## Dimensions

Rate each dimension separately. Do not add the ratings together.

### 1. Economic value

What plausible effect can this have on ranch economics?

Consider revenue, cost, avoidable loss, operational risk, capital use, and profitability visibility.

`HIGH` does not require immediate revenue if the relationship to an important economic decision is strong. Profitability visibility remains a management reading. It does not become fiscal or statutory accounting truth.

### 2. UX benefit

How does this affect recurring human effort?

Consider the number of steps, frequency, repetition across animals or groups, cognitive burden, correction burden, device and environment, and work the change removes.

Rate **UX benefit**, not raw friction.

- `HIGH` means the change substantially reduces recurring effort for the people who actually do the work.
- `MEDIUM` means it reduces some recurring effort, or the relief and the new effort are both real.
- `LOW` means little relief, or the change adds recurring effort.
- `UNKNOWN` means there is not enough evidence about how people will actually use it.

A high amount of friction is not a high score. If a proposal makes the recurring job harder, its UX benefit is `LOW`.

### 3. Decision value

Which real ranch decision becomes easier, faster, or better?

A feature that only stores information, and supports no current or credible future decision, may have low decision value.

### 4. Data value

Does the work create or improve useful, trustworthy, reusable information?

Consider identity, source, quality, temporal context, evidence, reuse across workflows, correction and history, and reduction of ambiguity.

Do not rate maximum data collection as maximum data value. Better-structured useful data is the aim. A declared quantity does not become measured because a file was attached.

### 5. Evolution / automation value

Does the work create a clean, proportionate path toward better integrations, automation, AI, sensors, or future clients, without prebuilding speculative complexity?

A proposal can score `LOW` here and still be valuable now. AI-readiness is not mandatory for every feature. A `HIGH` score here does not justify building future infrastructure now.

Progressively AI-native does not mean adding an LLM everywhere or installing cameras and sensors before value is proven.

### 6. Frequency / reach

How often and how broadly will this matter?

Consider daily, weekly, or occasional use, the number of animals or groups affected, the number of users, and operational importance.

Do not inflate value merely because a task happens often if it has little consequence. Do not assume workers are application users. The capture direction so far is the owner, using what workers already communicate.

### 7. Complexity / burden

What does this cost to design, implement, deploy, operate, maintain, teach, support, and reverse later?

For this dimension only, `HIGH` means high burden. This dimension counts against a proposal when making the decision. The other dimensions count in favor when they are `HIGH`.

Do not fold this rating into a numerical total with the others.

## Qualitative review

Copy this block for a real proposal. Leave a rating as `UNKNOWN` when the evidence is not there.

```
Idea / Increment:
Problem:
Primary user:
Current evidence:

Economic Value:
UX Benefit:
Decision Value:
Data Value:
Evolution Value:
Frequency / Reach:
Complexity / Burden:

Important unknowns:
Dependencies:
Explicit non-goals:

Recommendation:
Reasoning:
```

## Recommendation states

Use exactly one of:

- `PURSUE NOW` — enough value and evidence exist to justify current work.
- `INVESTIGATE` — potential value exists, but evidence is needed before committing.
- `DEFER` — potentially useful, but timing, dependencies, current value, or opportunity cost makes it inappropriate now.
- `REJECT` — it conflicts with product strategy, introduces disproportionate burden, or has insufficient value even if it is technically possible.

Humans choose the recommendation. The scorecard does not choose it automatically.

## Decision rules

No arithmetic total decides the recommendation.

Important tensions:

- `HIGH` economic value together with `LOW` UX benefit or high burden requires design discussion. A valuable workflow that people will not finish is not automatically a good RANCHO solution.
- `HIGH` evolution value alone does not justify building future infrastructure now.
- `LOW` complexity does not justify a feature with `LOW` product value.
- `UNKNOWN` in a blocking dimension may require investigation or a human question rather than a decision. Do not replace that unknown with a convenient rating.

A technically interesting idea without a ranch-value path should not be pursued merely because it is interesting.

## Example: cameras, hypothetical only

This example shows how to fill the scorecard. It is not a ranch decision. Design v1 does not adopt cameras. There are no cameras today. Physical intrusion remains unaddressed, and its method is unselected.

```
Idea / Increment: Perimeter cameras as a possible later tool for intrusion evidence
Problem: Missing cattle and physical intrusion are different pains. No accepted method covers intrusion.
Primary user: The owner, if footage were ever reviewed. Not a worker application.
Current evidence: No cameras are installed. Coverage, cost, power, and review workload are not established. Cellular coverage is still unvalidated.

Economic Value: UNKNOWN
UX Benefit: UNKNOWN
Decision Value: UNKNOWN
Data Value: UNKNOWN
Evolution Value: HIGH
Frequency / Reach: UNKNOWN
Complexity / Burden: HIGH

Important unknowns: Whether cameras would reduce loss, what they would cost to run, and who would review them.
Dependencies: The open choice of physical-security method. Connectivity is not validated.
Explicit non-goals: Selecting cameras. A worker app. Offline sync. Treating an image as measured feed, confirmed parentage, or a herd count.

Recommendation: INVESTIGATE
Reasoning: Potential data and evolution value may be high, and the infrastructure and economic evidence is insufficient. UNKNOWN is not LOW. HIGH evolution value alone does not justify building camera infrastructure now. DEFER would also be consistent if current attention is better spent on a workflow that does not need this hardware. Neither conclusion selects cameras.
```

## When to use the scorecard

Use it for meaningful product features, major workflows, new automation, hardware integrations, AI capabilities, substantial data collection, large UX changes, and major infrastructure proposals motivated by future product value.

Do not require it for typo fixes, trivial refactors, straightforward bug fixes, or equivalent implementation details already governed by architecture.

The scorecard should prevent drift, not create ceremony.
