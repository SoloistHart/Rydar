---
doc: README
status: active
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Rydar

Rydar compares ride-hailing prices across the apps a Metro Manila commuter already has installed, then hands the booking off to the app that wins. It is a comparison layer, not a ride-hailing service. Rydar never dispatches a driver, never takes a payment, and never holds a booking.

Developers are Rhohart Martel and Vincent Perez.

## Status

Pre-implementation. No application code exists yet. The tech stack, map SDK, and visual design are deliberately undecided, so every document here is written to survive those choices. What is decided lives in [docs/DECISIONS](docs/DECISIONS/README.md).

## Start here

An agent or a new contributor should read in this order. [PRODUCT.md](PRODUCT.md) for what Rydar is and is not. [docs/DOMAIN.md](docs/DOMAIN.md) for the data shapes every other doc refers to. [docs/FLOWS.md](docs/FLOWS.md) for the screens. [AGENTS.md](AGENTS.md) before changing anything.

## Doc map

This list is authoritative. `node tools/check-docs.mjs` fails when a document exists but is missing here, or is listed here but missing on disk.

- [PRODUCT.md](PRODUCT.md) (`PRODUCT`). Positioning, non-goals, personas, the end-to-end user flow, and the feature ledger.
- [DESIGN.md](DESIGN.md) (`DESIGN`). The design system. Structure and motion are locked, all color and type values are `TBD`.
- [AGENTS.md](AGENTS.md) (`AGENTS`). How to work in this repo, and which docs a change must update before it counts as done.
- [docs/CONVENTIONS.md](docs/CONVENTIONS.md) (`CONVENTIONS`). Front matter, changelog format, the `TBD` rule, link checking.
- [docs/DOMAIN.md](docs/DOMAIN.md) (`DOMAIN`). The eight core shapes and the trip planning state machine.
- [docs/FLOWS.md](docs/FLOWS.md) (`FLOWS`). Sheet-by-sheet screen specs and the flow state diagram.
- [docs/MAP.md](docs/MAP.md) (`MAP`). Camera intents keyed by planning state, zoom triggers, route draw, sheet-aware padding.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (`ARCHITECTURE`). Layering contract, dependency direction, module boundaries, expected repo structure.
- [docs/PROVIDERS.md](docs/PROVIDERS.md) (`PROVIDERS`). The provider registry and the ride-class support matrix.
- [docs/CONNECT.md](docs/CONNECT.md) (`CONNECT`). The fare acquisition boundary, specified as a port and left unimplemented.
- [docs/ROADMAP.md](docs/ROADMAP.md) (`ROADMAP`). Milestones and what each one unblocks.
- [docs/DECISIONS/README.md](docs/DECISIONS/README.md) (`DECISIONS_INDEX`). Index of every architecture decision record.
- [docs/RESEARCH/ride-hailing-ph.md](docs/RESEARCH/ride-hailing-ph.md) (`RESEARCH_RIDE_HAILING_PH`). The Philippine market, operators, fare regulation, and what comparable aggregators did.
- [docs/RESEARCH/map-motion-candidates.md](docs/RESEARCH/map-motion-candidates.md) (`RESEARCH_MAP_MOTION`). Candidate map SDKs and route animation techniques.
- [docs/RESEARCH/stack-candidates.md](docs/RESEARCH/stack-candidates.md) (`RESEARCH_STACK`). Candidate platforms, with the tradeoffs that will decide the pick.

Templates for new documents live in [docs/_templates](docs/_templates/feature-spec.md).

## Repo structure

```
core/       pure domain, fares, providers, geo, storage ports
platform/   map, deeplink, http, persistence adapters
app/        UI shell and feature surfaces
docs/       specs, research, decisions, templates
tools/      repo tooling
```

The one hard rule is that `core/` imports nothing from `platform/` or `app/`. Reasoning and module detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Checks

```
node tools/check-docs.mjs
```

Validates front matter, changelog and version agreement, relative links, doc map parity, ADR index parity, and that `DESIGN.md` still contains no invented color values.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Established the doc map as the authoritative index.
