---
doc: ADR_0002
status: active
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# ADR 0002. Specify the product before choosing the stack

**Status.** Accepted.

**Date.** 2026-07-26.

**Deciders.** Rhohart Martel, Vincent Perez.

## Context

Rydar starts from an empty repository, a clear flow, and three genuinely open technical questions: the platform, the map SDK, and how fare data is obtained at all. The last of those is the largest, because whether Rydar fetches prices on-device or through a service it operates changes whether the project has a backend, and that is not a detail a framework choice should be allowed to pre-empt.

The normal move is to pick a stack, scaffold it, and specify while building. Two things argued against it here. Most of what needs deciding, meaning the domain model, the flow, the camera behavior, the failure taxonomy, and the design structure, does not depend on the stack at all, and specifying it first is what makes the stack choice a comparison rather than a default. And the project is agent-assisted, so the documentation is not a byproduct but the context every future session loads, which makes writing it first a throughput decision rather than a diligence one.

The risk of specifying first is a documentation set that reads well and turns out to be unbuildable, which is the failure mode this decision has to guard against.

## Decision

Write the product, domain, flow, map, architecture, and design specifications before choosing a platform, and write them so that no document names a framework, language, or SDK.

Three mechanisms keep it honest.

Anything platform-dependent is written as an intent that an adapter must satisfy, not as an instruction. Camera behavior is four `CameraIntent` variants. Fare fetching is a `FareProvider` port. Both are implementable on every candidate stack, which is the test that keeps the specs from being fiction.

Anything undecided is the literal token `TBD` with a reason, never a plausible-looking value. This is enforced for colors in `DESIGN.md` by the doc checker and by review elsewhere.

Concrete technology findings live only in `docs/RESEARCH/`, marked as candidates. A candidate in a research note is not a decision, and the separation is what stops a stack from being adopted by drift.

The specification set is also built to evolve rather than to be finished. Front matter with a version and date, a changelog per document, a doc impact table in `AGENTS.md`, an ADR log, and a checker that fails on drift.

## Alternatives considered

### Pick the stack first, scaffold, then specify while building

Fastest to a running app and the industry default. It lost because the largest open question, on-device versus server-side fare fetching, would have been answered implicitly by whatever the framework made convenient. That is exactly the decision that deserves an explicit comparison, and a framework's defaults are not an argument.

### Skip the formal specs and work from the brief plus screenshots

Cheapest, and it would have worked for one session. It fails at the second, because an agent-assisted project reloads its context from scratch every time, and a brief plus screenshots does not carry the domain vocabulary, the failure taxonomy, or the reasons behind a choice. The cost of rebuilding that context repeatedly exceeds the cost of writing it once.

### One large context document

Simpler to keep consistent, since there is nothing to cross-reference. Rejected because it forces a reader to load everything to learn one thing, and because a single file gives no signal about which part of the system a change belongs to. The doc map plus the checker gets the consistency without the bulk.

## Consequences

Easy. The stack decision becomes a comparison against written requirements. The domain model, comparison logic, and state machine are all specified in a form that survives a platform change. Any future session starts from a complete context layer instead of reconstructing intent. A new provider or feature has a template and a doc impact checklist.

Hard. No running app yet, and no runtime evidence for anything specified. The route draw animation and the sixty-frames-per-second target in `docs/MAP.md` are the clearest exposure, since both are claims that only a device can settle. Some specified behavior will turn out to be wrong, and the documents have to be treated as revisable rather than as settled, which is what the version and changelog discipline is for.

Foreclosed. Nothing permanently. This decision is about ordering, not about content.

## Revisit when

The stack ADR lands. At that point every `TBD` that was blocked on it gets a value, the affected specs move from `draft` toward `active`, and any spec the chosen stack cannot honor gets corrected rather than defended.

## Changelog

- 2026-07-26 `0.1.0` Initial version.
