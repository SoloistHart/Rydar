---
doc: ADR_0001
status: active
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# ADR 0001. Rydar compares fares and never books

**Status.** Accepted.

**Date.** 2026-07-26.

**Deciders.** Rhohart Martel, Vincent Perez.

## Context

Rydar's problem is that a Metro Manila commuter has to open four apps to find out which one is cheapest and which one actually has a driver. The obvious product is a comparison screen. The tempting product, one step further, is booking the winner without leaving Rydar.

That step is the decision. It looks like a small extension of the same feature and it is not. Booking inside Rydar would make Rydar a transport intermediary, which in the Philippines means a Transport Network Company answerable to the LTFRB, with driver-side obligations, a payment surface, dispute handling, and liability for rides it did not operate. Comparable aggregators in other markets consistently stop at a handoff, and the ones that pushed further stopped being aggregators.

The question had to be settled before any spec was written, because the answer determines the domain model. A booking product needs a ride lifecycle, a trip state after departure, a driver identity, and a payment record. A comparison product needs none of those and is a substantially smaller system.

## Decision

Rydar compares fares and hands off. Its last act in any flow is opening the chosen provider's app.

Rydar does not dispatch, does not confirm a booking, does not take a payment, does not track a ride in progress, and has no driver-facing surface. These are non-goals in [../../PRODUCT.md](../../PRODUCT.md), stated as hard boundaries rather than as a phasing plan.

Two consequences are written into the model rather than left to discipline. The history record's outcome is `handed_off`, never `booked`, because Rydar genuinely cannot observe whether a ride happened. And every fare is attributed to the provider that gave it, with a capture time, because Rydar produces no fare of its own.

## Alternatives considered

### Book inside Rydar through provider APIs

Would be the better user experience, one screen from destination to driver, and would give Rydar a real business model through commission. It lost on two grounds. No provider here offers a third-party booking API, so it is not currently possible regardless of desire. And it would put Rydar in the regulated intermediary position described above, which is a different company rather than a different feature.

### Comparison now, booking later as a phase two

Superficially attractive, and the reason it was rejected is instructive. Holding booking open as a future phase would leak into the domain model immediately, because the model would be shaped to accommodate a ride lifecycle that may never exist. Speculative accommodation is how a small product acquires the weight of a large one without the benefit. Declaring the boundary permanent buys a smaller model today, and reversing it later is an honest rewrite rather than a quiet accumulation.

### An aggregator that also sells its own rides

Would put Rydar in competition with the providers whose prices it displays, which destroys the neutrality the comparison depends on. A user cannot trust a comparison run by a participant.

## Consequences

Easy. The domain model has no ride lifecycle, no payment, and no driver. The state machine ends at handoff. Rydar holds no money and carries no liability for any ride. Regulatory exposure is limited to what it stores and how it obtains prices.

Hard. Rydar has no transactional revenue path. The handoff is a real seam in the experience, and its quality depends entirely on what each provider's link format can carry, which is per-provider and not under Rydar's control. Rydar also cannot report whether its recommendation was taken, so it is partly blind to its own effect.

Foreclosed. Commission revenue, in-app ride tracking, any driver-side product, and knowing what actually happened after a handoff.

## Revisit when

A provider offers a third-party booking API under terms that do not make Rydar a regulated intermediary. That is a business conversation, not an engineering one, and it would justify a new record rather than an amendment to this one.

## Changelog

- 2026-07-26 `0.1.0` Initial version.
