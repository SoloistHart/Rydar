---
doc: ROADMAP
status: draft
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Roadmap

Ordered by what each milestone unblocks, not by how visible it is. Every milestone ends in something that can be looked at and judged.

The ordering principle is that the riskiest unknowns get resolved while they are still cheap to be wrong about. The route draw animation and the fare fetch mechanism are the two places this project is most likely to be surprised, and both are addressed before anything is built on top of them.

## M0. Context layer

**Status.** Complete as of 2026-07-26.

The documentation set in the [doc map](../README.md), the repo skeleton, and the doc checker. No application code.

Unblocks everything else, by making the stack decision a comparison against written requirements rather than a default.

## M1. Decide the stack and the map SDK

**Status.** Next.

Two ADRs. Platform and language, then map SDK together with geocoding and routing, since those three interact.

Done when both records are written with their alternatives and losing reasons, a minimal project builds and runs on a device, and a map renders full-screen with a bottom sheet over it. Nothing else.

The map-with-sheet case is in this milestone deliberately. The visible-region padding contract in [MAP.md](MAP.md) is the single most common place a map-plus-sheet app goes wrong, and finding out that a candidate SDK makes it awkward is worth knowing before any feature depends on it.

## M2. Camera and route choreography

The whole of [MAP.md](MAP.md), against hardcoded coordinates and no real trip. The four camera intents, the zoom tiers with real numbers, the state lookup table, the visible-region math, the route draw, gesture ownership, and pin tracking.

Done when the origin zoom, the fit-to-bounds pull-back, and the route draw all behave as specified with both pins and the full route inside the visible region at every sheet detent, and when a gesture mid-animation cancels cleanly. Profiled on mid-range Android hardware.

This milestone is also the decision point on whether the route draw survives. [MAP.md](MAP.md) says that call needs a measurement rather than an opinion, and this is where the measurement happens.

## M3. Domain core with a fake provider

Everything in `core/`, tested with no platform present. The shapes and the state machine from [DOMAIN.md](DOMAIN.md), normalization and grouping and span and cheapest from `core/fares`, the registry from [PROVIDERS.md](PROVIDERS.md), and a fake `FareProvider` that returns fixed quotes for one class, times out on another, and reports `outside_coverage` on a third.

Done when the full planning flow can be driven through the state machine in tests, every one of the seven `UnavailableReason` values is produced by the fake, and no test needs a device.

The fake is the load-bearing artifact. It exercises more of the eventual UI than a single working provider integration would, which is why it comes before any real connection.

## M4. Visual identity

The identity session, filling every `TBD` in [DESIGN.md](DESIGN.md) in the order that document specifies, starting from the map style because everything else is constrained by it. One ADR for the token set.

Done when `DESIGN.md` has no `TBD` in its color, type, spacing, elevation, or motion sections, the accent has been checked against all five provider brand colors for collision, and both themes are legible over the chosen map style.

## M5. The flow, end to end, against the fake

Every surface in [FLOWS.md](FLOWS.md), wired to the M3 core and the M4 tokens, still with zero real provider connections. Connected apps sheet, Where to, location picker with search and bookmarks and pin drop, Choose your ride with class expansion and provider rows, fare detail, handoff, and history.

Done when a user can walk from a cold start to a handoff attempt, every unavailability state renders with its reason and action, both history empty states are correct, and the app is fully usable with no location permission and no connections.

This is the first milestone that is a demonstrable product. It is also where every specified behavior gets its first contact with reality, so expect corrections back into the specs.

## M6. Fare acquisition

Answer the six blocking questions in [CONNECT.md](CONNECT.md), in order, starting with what each provider's terms permit. Then the mechanism ADR, then the first real adapter.

One provider first, chosen for whichever mechanism turns out to be most tractable rather than for market share. Then the rest, one at a time, each with recorded-response tests.

Done, per provider, when a real quote appears next to a fake one on the same comparison screen and is indistinguishable in shape. That comparison is the test that the boundary held.

## M7. Handoff fidelity

Per-provider deep link verification, filling the `TBD` handoff descriptors in [PROVIDERS.md](PROVIDERS.md). Determine for each provider exactly which fields a link can prefill, then make the UI promise only that.

Deliberately after M6, because a handoff to a provider whose price Rydar cannot yet fetch has nothing to hand off from.

## Deferred

From the feature ledger in [../PRODUCT.md](../PRODUCT.md). Multi-stop trips, for which the `Add destination` affordance is already reserved in the layout. Non-ride alternatives such as transit. Accounts and cloud sync. Fare alerts, which need sustained fetching and therefore need M6 settled first.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Ordered eight milestones by risk retired rather than by visibility, and placed the map-with-sheet case and the fake provider ahead of any real integration.
