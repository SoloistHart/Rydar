---
doc: DECISIONS_INDEX
status: active
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Architecture decision records

Every choice that closed off an alternative. Specs describe what Rydar does now. These describe what else was possible and why it lost, which is the part a reader cannot reconstruct later.

`node tools/check-docs.mjs` fails when a numbered record exists in this directory but is missing from the index below.

## Index

- [0001. Rydar compares fares and never books](0001-comparison-only-positioning.md). Accepted 2026-07-26.
- [0002. Specify the product before choosing the stack](0002-docs-first-platform-agnostic.md). Accepted 2026-07-26.

## Pending

Decisions known to be needed, with what each one blocks. Each becomes a record when made.

- **Platform and language.** Blocks all application code. Candidates in [../RESEARCH/stack-candidates.md](../RESEARCH/stack-candidates.md).
- **Map SDK, geocoding, and routing providers.** Blocks the map adapter and every camera value in [../MAP.md](../MAP.md). Candidates in [../RESEARCH/map-motion-candidates.md](../RESEARCH/map-motion-candidates.md).
- **On-device or server-side fare fetching.** The largest open question. Decides whether Rydar has a backend at all. Scoped in [../CONNECT.md](../CONNECT.md).
- **Visual identity token set.** Blocks any real UI. Fill order in [../../DESIGN.md](../../DESIGN.md).
- **Dependency rule enforcement mechanism.** Blocks trusting the layering in [../ARCHITECTURE.md](../ARCHITECTURE.md).
- **JoyRide Super Taxi class mapping.** Blocks that provider's registry entry being complete.

## Writing one

Copy [../_templates/adr.md](../_templates/adr.md). Number sequentially. Add it here in the same change.

Two sections carry the weight. Alternatives considered, where each option needs the specific reason it lost, because an alternative listed without one implies the choice was arbitrary. And revisit when, naming the condition that would justify reopening it.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Seeded the first two records and listed six pending decisions.
