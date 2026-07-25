---
doc: CONNECT
status: draft
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# The fare acquisition boundary

## This is deliberately unimplemented

Connecting a provider and fetching its prices is the feature Rydar's entire value rests on, and it is the one thing this documentation set does not decide. That is on purpose. The mechanism carries unresolved legal, security, and reliability questions, and choosing it in passing while writing a spec would be the worst possible way to answer them.

What this document does is fix the **boundary**. The contract, the failure taxonomy, the invariants any mechanism must satisfy, and the questions that have to be answered before code is written. Everything upstream of the boundary, meaning the whole app, can be built against this contract without knowing the answer.

Do not implement a fetch from this document alone. The mechanism decision lands as an ADR first.

## What connect means

A connection is the user's authorization for Rydar to ask one provider for prices on that user's behalf. Its record is the `Connection` union in [DOMAIN.md](DOMAIN.md), with four variants of connected, disconnected, expired, and unsupported.

What a connection is **not**. It is not a Rydar account. It is not a payment method. It does not let Rydar book, cancel, or modify anything. Its only capability is reading price estimates for a trip the user is currently planning.

That narrow scope is a design constraint, not a phase. Whatever mechanism gets chosen, if it grants Rydar more capability than reading a price estimate, it is the wrong mechanism.

## The port

`core/providers` defines this. Adapters in `platform` implement it, one per provider.

```
port FareProvider {
  id: ProviderId

  supports(rideClass) -> boolean
      From the registry. Pure, synchronous, no network.

  quote(request: QuoteRequest) -> QuoteOutcome
      Asynchronous. Never throws. Always resolves.
}

record QuoteRequest {
  trip:       Trip
  classes:    list of RideClass     only those this provider supports
  connection: Connection            must be the connected variant
  deadline:   duration              hard cap, adapter must respect it
}

oneof QuoteOutcome {
  quotes  { list of FareQuote }                       one per class returned
  partial { list of FareQuote, failures: list of (RideClass, UnavailableReason) }
  failed  { reason: UnavailableReason, retryAfter: duration? }
}
```

Four properties are load-bearing.

**`quote` never throws.** Every failure is a typed `UnavailableReason`, because that reason is rendered directly in the UI, per the copy table in [FLOWS.md](FLOWS.md). An adapter that throws a raw platform error forces the comparison layer to guess what to tell the user, and a guess becomes "something went wrong", which tells them nothing.

**`partial` is a first-class outcome.** A provider can price a motorcycle and fail on a car in the same call. Collapsing that into all-or-nothing would throw away a good quote.

**The deadline is a hard cap.** The comparison surface settles rows independently and must never be held by the slowest provider. An adapter that outruns its deadline is a bug, not a slow network.

**Normalization is not the adapter's job.** An adapter reports what the provider said. Turning that into comparable `QuoteResult` values, grouping by class, computing the span, and marking the cheapest all happen in `core/fares`, so those rules exist once.

## Failure taxonomy

Every adapter maps its own errors onto exactly these, from [DOMAIN.md](DOMAIN.md). The mapping is part of the adapter's contract and part of its tests.

| Reason | Means | Adapter must set it when |
| --- | --- | --- |
| `not_connected` | No authorization exists | Called without a `connected` connection |
| `needs_reauth` | Authorization lapsed | The provider rejects the credential as expired or invalid |
| `no_service_for_class` | This provider does not offer this class | Registry says unsupported, or the provider reports it for this trip |
| `outside_coverage` | Pickup or dropoff is outside the service area | The provider says so, explicitly |
| `provider_error` | The provider failed or replied unusably | A server error, or a response that cannot be parsed |
| `timeout` | No answer within the deadline | The deadline elapsed |
| `rate_limited` | Asked too often | The provider signals throttling. Set `retryAfter` |

`outside_coverage` and `no_service_for_class` must not be conflated. One means try a different provider, the other means try a different ride class, and those are different actions for the user. An adapter that reports the wrong one sends the user down a dead end.

A parse failure is `provider_error`, never an empty result. Silence would present as a provider having no price, which is the one thing the product must never fabricate.

## Invariants for any mechanism

These bind whatever the ADR chooses.

- **No credential in application logs, in analytics, in crash reports, or in plain local storage.** Secrets go to the platform keystore through `platform/persistence`.
- **Disconnect is complete and immediate.** The credential is destroyed and any live quotes from that provider are dropped from the comparison in the same action. A disconnect that leaves a working session is a security bug.
- **A fetch happens only for a trip the user is actively planning.** No background polling, no speculative prefetch, no fetching for a trip the user has already changed. This limits both the load Rydar puts on providers and the exposure of the user's movement.
- **One request per provider per comparison.** Rate limiting is per provider, respects `retryAfter`, and backs off. Rydar must not be the reason a provider tightens its interface.
- **The user can see and revoke every connection.** The Connected apps sheet in [FLOWS.md](FLOWS.md) is the only surface needed for this, and it must stay sufficient.
- **A quote is stamped with its capture time,** because freshness is presented to the user and cannot be inferred later.
- **A provider's own trip distance is preserved verbatim.** Never replaced with Rydar's, per the divergence rule in [FLOWS.md](FLOWS.md).
- **Adding or replacing a mechanism for one provider touches only that adapter.** If a mechanism change requires a UI change, the boundary has leaked.

## Candidate mechanisms

Recorded so the eventual ADR has a starting point. None is chosen. Each is a real approach taken by a comparable product, per [RESEARCH/ride-hailing-ph.md](RESEARCH/ride-hailing-ph.md).

**Official partner APIs.** Cleanest by far, and unavailable. None of the five providers offers a public fare API to third parties. Worth revisiting only as a business conversation, not an engineering one, and worth noting that a single partnership would obsolete every other option for that provider.

**On-device authenticated requests.** Rydar replays the same requests the provider's own client makes, using a credential the user supplied, from the user's device. Keeps credentials on-device, keeps the request coming from the user's own network, and matches Rydar's positioning as a client acting for its user. Fragile against interface changes, needs per-provider reverse engineering, and raises the sharpest terms-of-service questions.

**Server-side fetch through a Rydar-operated service.** Centralizes the fragile part, so a provider change is fixed once rather than shipped in an app update. Costs a backend, makes Rydar a custodian of user credentials, concentrates the requests behind one set of addresses, and pulls the product from a local utility into a service with an operational burden.

**Device automation.** Driving the provider's own app in an emulator, which is what at least one comparable aggregator resorted to for providers with no web surface. Demonstrably works and does not scale. Recorded for completeness, not as a serious candidate.

**Published fare matrices.** Computing an estimate from LTFRB rate structures and known base fares. Requires no connection at all and produces a genuinely useful figure for regulated metered tiers. It is also, strictly, Rydar inventing a price, which [PRODUCT.md](PRODUCT.md) forbids. If it is ever used it must be labeled unambiguously as a Rydar estimate rather than a provider quote, and it must never occupy a provider row.

The likely answer is per provider rather than global, which is exactly why the port is per provider.

## Blocking questions

These must be answered before any adapter is written. They are listed in dependency order.

1. **What does each provider's terms of service permit,** and what is Rydar's honest position on it.
2. **What credential does a connection actually hold,** per provider, and what is the minimum that suffices.
3. **On-device or server-side.** This decides whether Rydar has a backend, and it therefore decides the shape of the whole project.
4. **What Rydar stores, and where,** including whether a user's trip history ever leaves the device.
5. **The quote TTL per provider,** which sets the `fresh` to `stale` boundary that the UI already renders.
6. **What happens on a provider interface change,** meaning how it is detected, how fast it can be fixed, and what the user sees in the gap.

Question one gates all the others. It is a judgment call about what Rydar is willing to be, and it is not an implementation detail.

## What can be built before any of this is answered

Everything else, which is the point of fixing the boundary first.

The whole flow works against a fake `FareProvider`. The comparison logic, the class grouping, the span and cheapest computation, the freshness rules, every row state including all seven unavailability reasons, the sheets, the camera choreography, and history. A fake adapter that returns fixed quotes for one class, fails with `timeout` on another, and reports `outside_coverage` on a third exercises more of the real UI than a working single-provider integration would.

The first milestone therefore ships zero real connections, per [ROADMAP.md](ROADMAP.md). That is not a limitation of the approach, it is the approach.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Fixed the `FareProvider` port, the failure taxonomy mapping, the eight mechanism-independent invariants, five recorded candidate mechanisms, and the six blocking questions.
