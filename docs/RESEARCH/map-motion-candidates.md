---
doc: RESEARCH_MAP_MOTION
status: active
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Research. Map SDK and route animation candidates

Gathered 2026-07-26 to inform the map SDK decision. **Nothing here is chosen.** [../MAP.md](../MAP.md) is written as SDK-independent intents precisely so this note can be wrong without invalidating the spec.

## What Rydar actually needs from a map SDK

Derived from [../MAP.md](../MAP.md), in rough order of how likely each is to disqualify a candidate.

1. **Animated fit-to-bounds with asymmetric padding.** The single most important capability. A bottom sheet occupies the lower part of the screen, so framing a route requires per-edge padding, not a uniform inset. An SDK that only supports uniform padding forces manual camera math and makes the visible-region contract painful.
2. **Progressive polyline update without remounting the layer.** The route draw needs one mutable geometry source updated in place. An SDK that requires rebuilding a feature collection per frame will not hold sixty frames per second.
3. **Camera animation driven inside the SDK,** with selectable easing behavior, so the app is not pushing a coordinate per frame across a bridge.
4. **Full style control.** [../../DESIGN.md](../../DESIGN.md) needs a map style whose label density and palette can be tuned so a route line is not competing with street names, in both a light and a dark theme.
5. **Gesture events that report user interaction,** so gesture ownership can suspend state-driven camera intents.
6. **Tile caching, and ideally offline regions.** Metro Manila connectivity is uneven, and [../FLOWS.md](../FLOWS.md) requires the app to stay usable offline.
7. **Cost that survives a consumer app.** Ride comparison implies frequent sessions per user, so per-map-load pricing is the model to scrutinize.

## Candidates

### Mapbox

The most capable option on the requirements above, and the one whose relevant APIs were verified rather than assumed.

Verified from the React Native SDK documentation and source. A camera reference exposes `fitBounds(ne, sw, padding, duration)` where padding accepts either a uniform number or an array, and the declarative camera accepts explicit per-edge padding of top, bottom, left, and right, which is exactly requirement one. Animation mode is selectable between a flying animation, an easing animation, a linear animation, an instant move, and none. The SDK also ships animated primitives including an animated shape source and an animated coordinates array with a route-specific variant that progressively reveals a path from its start to a moving end point, which is requirement two solved by the library rather than by hand.

One documented caveat matters. The animated components run on the JavaScript thread rather than the native driver, which is a direct risk to the sixty-frames-per-second target on mid-range Android hardware and is the specific thing [../MAP.md](../MAP.md) requires be measured before the route draw is accepted.

Commercial shape, from secondary sources and needing confirmation against current terms. A free tier around fifty thousand web map loads and twenty-five thousand mobile monthly active users, then per-load and per-active-user pricing. Full style control via a visual design tool. Genuine offline region downloads, which is the strongest differentiator for Rydar's offline requirement. Data comes from OpenStreetMap, whose quality varies by region, and Philippine coverage quality has not been assessed.

### Google Maps

Strongest data for this market in the ways that matter to a destination picker, meaning points of interest, place names, and the recognizability that lets a user find a mall by name. Sources consistently note limited style customization, limited to no developer-facing offline map support, and the highest per-load pricing of the mainstream options.

For Rydar the tension is direct. Google likely wins on place search and POI recognition, and likely loses on style control and offline, both of which are stated requirements. That suggests the real question is whether the map renderer and the geocoder have to be the same vendor, which they do not, since [../ARCHITECTURE.md](../ARCHITECTURE.md) has `PlaceSearch` and `CameraController` as separate ports.

### MapLibre

The open-source fork of Mapbox's GL rendering engine, permissively licensed, compatible with Mapbox style JSON, with no API key or per-load platform fee. Its native mobile SDKs historically trailed Mapbox, with sources reporting that a 2025 release narrowed the iOS and Android gap considerably. It is a renderer and not a platform, so tiles, geocoding, and routing all need separate providers.

Attractive for cost and for avoiding lock-in. The specific risk for Rydar is that requirements one and two are the ones a renderer-only project is least likely to have polished, so both would need verifying against the current native SDKs rather than assumed from Mapbox parity. Its animated route helpers, in particular, should not be presumed to exist.

### Platform-native maps

Apple's and Google's first-party SDKs. Best integration and no additional dependency, at the cost of two separate implementations, weaker style control, and no shared behavior between platforms. Only sensible if the stack decision lands on separate native apps.

## Route animation techniques

Three approaches surfaced, in increasing order of control.

**Library-provided animated route coordinates.** Mapbox's animated route array progressively reveals a path toward a moving end point, with a timing configuration that can target a distance along the route. Least code, and it expresses progression by distance along the path, which is exactly what [../MAP.md](../MAP.md) requires and what avoids the crawl-then-sprint artifact of vertex-indexed animation.

**Manual interpolation on a timer.** Documented as the general pattern. Interpolate along the coordinate list on an interval, update state, re-render the shape source. Straightforward and portable to any SDK. It also re-renders per tick, which is the performance risk, and interval-based timing does not adapt to a dropped frame.

**Distance-based chunking with a following camera.** One published walkthrough splits the path into distance-based chunks and appends one per frame at roughly sixteen milliseconds, moving the camera to follow the newest chunk, with start, stop, and reset controls. The chunking is right for Rydar; the following camera is not, because [../MAP.md](../MAP.md) settles the frame first and then draws inside a stable viewport, on the grounds that chasing a moving camera with a growing line hides the route.

The general lesson across all three is that progression must be parameterized by distance travelled rather than by array index. Every source that produced a natural-looking result did it that way.

## Geocoding and routing

Deliberately separate decisions from the renderer, since [../ARCHITECTURE.md](../ARCHITECTURE.md) makes them separate ports.

The aggregator projects examined in [ride-hailing-ph.md](ride-hailing-ph.md) used Nominatim as a free geocoder with a Google Maps fallback, with throttling and caching around it. Nominatim's usage policy makes it unsuitable for a consumer app's interactive search without self-hosting, which is worth checking before it is considered.

For Rydar, place search quality is a product-quality issue rather than a technical one. A destination picker that cannot find a Metro Manila mall by its common name fails at the first step of the flow, so this candidate set needs evaluating on local results specifically, not on generic benchmarks.

## What to verify before deciding

- Asymmetric per-edge camera padding, on device, at multiple sheet detents.
- The route draw at sixty frames per second on mid-range Android, which is the audience's actual hardware, using each candidate's own animation primitives.
- Whether a candidate's animated primitives run on the native driver or the JavaScript thread, since Mapbox's documentation is explicit that its animated components do not.
- Local place search quality against Metro Manila landmarks, malls, and informal place names.
- Current pricing and terms directly from each vendor. Every commercial figure in this note is secondhand and dated.
- Offline region support against the offline behavior [../FLOWS.md](../FLOWS.md) requires.

## Sources

- Mapbox Maps SDK for React Native documentation. Camera API including `fitBounds` and per-edge padding, animation modes, the animations guide, and the animated module including the route coordinates array and its JavaScript-thread caveat.
- rnmapbox/maps repository, `src/components/Camera.tsx`. Confirms the camera reference signatures.
- A published walkthrough of chunked Mapbox line animation with a following camera.
- APIScout, Woosmap, Radar, and a 2026 geospatial stack review. Comparative positioning, pricing, offline support, and MapLibre's status. All secondary and all needing confirmation at the vendor.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Recorded four SDK candidates against seven derived requirements, three route animation techniques, and the six things to verify on device before deciding.
