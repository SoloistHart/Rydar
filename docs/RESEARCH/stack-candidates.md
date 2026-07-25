---
doc: RESEARCH_STACK
status: active
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Research. Platform candidates

Gathered 2026-07-26. **No platform is chosen.** Per [../DECISIONS/0002-docs-first-platform-agnostic.md](../DECISIONS/0002-docs-first-platform-agnostic.md), this decision comes after the specs and lands as its own record. This note exists so that decision is a comparison rather than a default.

## What decides it

Rydar's requirements, ordered by how much each would hurt to get wrong.

1. **A map with a bottom sheet over it, at sixty frames per second on mid-range Android.** This is the app. Metro Manila's audience is Android-majority and not on flagship hardware. Any candidate that cannot hold frames during the route draw and a sheet transition simultaneously is disqualified, and this is a measurement rather than a discussion.
2. **Map SDK support quality.** Which follows from [map-motion-candidates.md](map-motion-candidates.md), and specifically whether the candidate's map bindings are first-party or community-maintained, since asymmetric camera padding and in-place polyline updates are exactly the surface where a thin community binding leaks.
3. **Native bottom sheet behavior.** Multiple detents, a continuously animated height the camera padding can follow, and gesture handling that does not fight the map underneath. Sheet quality is not decoration here; the visible-region contract in [../MAP.md](../MAP.md) depends on the sheet's height being an observable animated value.
4. **Whatever the fare fetch mechanism turns out to need.** Unresolved, per [../CONNECT.md](../CONNECT.md), and it could require custom transport control, custom headers, cookie handling, or platform-specific networking. A candidate that constrains the network layer constrains the answer to the largest open question, which is the reason this decision is second rather than first.
5. **Deep link launching with installed-app detection.** Per-platform and per-provider, and the detection story differs meaningfully between iOS and Android.
6. **Two developers shipping both platforms.** A real constraint. Rhohart and Vincent are the whole team, which weighs heavily against maintaining two native codebases.
7. **Secure credential storage.** Keychain and keystore access, non-negotiable per [../CONNECT.md](../CONNECT.md).

## Candidates

Assessed against the list above. Every claim here is general knowledge about these ecosystems, not measured, and every one needs a prototype before it is trusted.

### React Native, with Expo

One codebase, both platforms, and the map research in [map-motion-candidates.md](map-motion-candidates.md) is already grounded in this ecosystem's Mapbox bindings, whose camera and animated route APIs were verified rather than assumed. Mature sheet libraries with the detent behavior requirement three describes. Straightforward keystore and keychain access. Deep linking is well trodden.

The specific risk is requirement one, and it is not hypothetical. The Mapbox React Native documentation states outright that its animated components run on the JavaScript thread rather than the native driver. That is the exact combination Rydar's route draw needs, so this is the candidate whose headline risk is best understood and most in need of a measurement.

Expo's managed workflow versus a bare project is a sub-decision, and it turns on whether the eventual fare fetch mechanism needs native modules that the managed workflow makes awkward. That means it cannot be settled before [../CONNECT.md](../CONNECT.md) question three is answered.

### Flutter

Strong rendering performance and a consistent frame budget, which speaks directly to requirement one. One codebase. Good sheet primitives.

The open question is requirement two. Map SDK bindings for the leading vector map providers are community packages, and the specific capabilities Rydar needs, meaning asymmetric camera padding and progressive in-place polyline updates, would have to be verified in whatever package is current rather than presumed present. None of the map research so far covers Flutter, which is a gap to close before this candidate is fairly compared.

### Native, SwiftUI and Kotlin separately

Best possible outcome on requirements one, three, five, and seven. First-party sheets, first-party keystore, unconstrained networking, and full control over frame timing.

It loses on requirement six, which is decisive at this team size. Two codebases means every feature specified in [../FLOWS.md](../FLOWS.md) is built twice, and every provider adapter is built twice, by two people who also have to make all the product decisions. Reasonable only if a measurement shows both cross-platform candidates failing requirement one, and that would be a genuinely surprising result worth trusting over this reasoning.

### Kotlin Multiplatform

An interesting middle path, since it maps unusually well onto [../ARCHITECTURE.md](../ARCHITECTURE.md). The `core` ring is pure and platform-independent by design, which is exactly what this approach shares, while UI stays native per platform. That would put the domain model, the state machine, the comparison logic, and the provider adapters in one place and duplicate only the surfaces.

It costs two UI implementations, which is most of the work, so it trades requirement six's cost for a genuine benefit on the layer that matters most for correctness. Worth a serious look rather than a dismissal, and it needs an assessment this note does not yet have.

### Web or PWA

Rejected rather than deferred. Deep linking into installed native apps, reliable background location, keystore-grade credential storage, and offline map regions are all either impossible or materially worse on the web, and the handoff to an installed provider app is not an optional part of Rydar.

## How to decide

Not by reasoning further. The M1 milestone in [../ROADMAP.md](../ROADMAP.md) exists because this decision needs a measurement, and the measurement is small.

Build the same throwaway prototype on the two or three surviving candidates. A full-screen vector map, a bottom sheet with three detents, a hardcoded route drawn progressively over a few seconds, and a camera that fits the route inside the region above the sheet at every detent. Then profile it on the cheapest mid-range Android device on hand.

That prototype answers requirements one, two, and three at once, which are the three that would be most expensive to discover later. It says nothing about requirement four, which is why the stack ADR should record what it assumed about the fetch mechanism, so a later surprise there is traceable rather than mysterious.

## Sub-decisions this unblocks

Each becomes part of the stack record or a follow-on record. State management approach. Testing framework. The mechanism that mechanically enforces the `core` dependency rule, currently `TBD` in [../ARCHITECTURE.md](../ARCHITECTURE.md) and unenforced until then. Package manager and build tooling. Whether a backend exists at all, which is genuinely upstream and belongs to [../CONNECT.md](../CONNECT.md) rather than here.

## Sources

- [map-motion-candidates.md](map-motion-candidates.md), for the map SDK capability findings and the JavaScript-thread caveat on animated components.
- [../CONNECT.md](../CONNECT.md), for why the fetch mechanism constrains this decision rather than the reverse.
- Ecosystem assessments in this note are general knowledge, not measured, and are explicitly the thing the M1 prototype replaces.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Recorded five candidates against seven ranked requirements, rejected web outright, and specified the prototype that decides it.
