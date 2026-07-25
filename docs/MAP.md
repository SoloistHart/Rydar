---
doc: MAP
status: draft
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Map and motion spec

Rydar is map-first. The map is not an illustration next to the prices, it is the surface the whole app sits on, and its behavior is as specified as any sheet. This document owns camera behavior, route rendering, and motion. Screen contents live in [FLOWS.md](FLOWS.md), the states referenced here come from [DOMAIN.md](DOMAIN.md).

No map SDK is chosen. Candidates and their relevant capabilities are in [RESEARCH/map-motion-candidates.md](RESEARCH/map-motion-candidates.md). Everything below is written as an intent the adapter in `platform/map` must satisfy, which is what keeps the SDK choice from leaking into feature code.

## The one rule

**The camera is a pure function of `PlanningState` and the visible map region.** No sheet, button handler, or animation callback moves the camera directly.

This exists because the alternative is the standard way map apps rot. Each screen learns to nudge the camera, the nudges start racing each other, and eventually the app fights the user's own pan. Deriving the camera from state makes the behavior a table that can be read, reviewed, and changed in one place.

The adapter therefore accepts a `CameraIntent` and nothing else.

```
oneof CameraIntent {
  hold      { }                                          leave the camera exactly where it is
  focus     { center: Coordinate, zoom: ZoomTier }        one point, tight
  frame     { bounds: BoundingBox, padding: EdgeInsets }  fit a region inside the visible area
  track     { center: Coordinate, zoom: ZoomTier }        continuous, follows a moving point
}
```

`hold` is a first-class variant rather than the absence of an intent. A state that means "do not touch the camera" has to say so explicitly, otherwise every consumer invents its own no-op and one of them gets it wrong.

## Zoom tiers

Numeric zoom is SDK-specific and would be a lie to fix here. The app speaks in tiers, and the adapter maps them.

| Tier | Meaning | Value |
| --- | --- | --- |
| `city` | Metro-wide orientation, used before any location fix | `TBD` |
| `district` | Several neighborhoods, the default resting frame | `TBD` |
| `street` | Individual streets legible, used for pin placement | `TBD` |
| `pin` | Tightest useful frame around a single point | `TBD` |

Tiers are named by what the user can read at that level, not by a number, so a later SDK swap changes four constants in one adapter file rather than every call site.

## Camera lookup table

The complete mapping. Every `PlanningState` from [DOMAIN.md](DOMAIN.md) appears exactly once, which is the property that makes this a table instead of a pile of conditionals.

| `PlanningState` | `CameraIntent` | Why |
| --- | --- | --- |
| `idle` | `focus` on the user's location at `district` | Enough context to recognize where you are without hunting |
| `picking_origin` with no draft | `hold` | The user is reading a list, not the map |
| `picking_origin` in pin mode | `track` the map center at `street` | The pin is the map center, so the camera leads and the label follows |
| `origin_set` | `focus` on the origin at `street` | The zoom-in on origin selection. Tight and deliberate |
| `picking_destination` with no draft | `hold` | Holds the origin frame. The user is searching, and moving the map under them would be theft |
| `picking_destination` in pin mode | `track` the map center at `street` | Same as origin pin mode |
| `routing` | `hold` | Do not move on a pending network call. Movement would imply a result that has not arrived |
| `route_ready` | `frame` the route bounds | The zoom-out that captures both points. Route bounds, not just the two pins, so a curving route is not clipped |
| `routing_failed` | `hold` | Nothing new to show |
| `choosing_class` | `frame` the route bounds | Re-framed because the sheet grew and shrank the visible area |
| `class_selected` | `frame` the route bounds | Same, the expanded class changes sheet height |
| `provider_selected` | `frame` the route bounds | Same |

The zoom choreography the flow asks for falls straight out of this table. Origin picked means zoom in and stay there. No destination yet means hold that frame. Destination landed means pull back to frame both. Nothing else needs to know about zoom.

Frame padding is recomputed on every sheet height change even when the bounds are identical, because the visible region changed and the same bounds now need a different camera to stay centered in it. That is the recurring `frame` rows in the table, and it is why `frame` takes padding as an input rather than assuming a constant.

## Visible region and the padding contract

A bottom sheet covers the lower part of the map. Framing against the raw viewport puts the route behind the sheet, which is the single most common map-with-sheet bug.

The camera frames against the **visible region**, defined as the viewport minus the sheet occlusion, minus the safe area, minus a breathing margin.

```
record EdgeInsets { top, right, bottom, left }

visibleRegion = viewport
              - safeAreaInsets
              - occlusionInsets      bottom = current sheet height, top = chrome height
              - breathingMargin      TBD, uniform
```

Rules that follow.

- The map layer owns the full viewport. The camera math uses the visible region. The map is never resized to fit above the sheet, because that would clip tiles and make the sheet look like it is sitting on a smaller map.
- Sheet height is an animated value, and the padding follows it continuously. A frame recomputed only at the end of a sheet transition looks like the map lurching after the sheet settles.
- Both pins and the entire route polyline must land inside the visible region. If the bounds cannot fit at the minimum usable zoom, the frame prefers showing the origin and the near portion of the route, since the user's own position is the anchor they orient from.
- The recenter control positions itself relative to the visible region, not the viewport, so it never hides behind a sheet.

## Route rendering

Three layers, drawn bottom to top.

- **Route casing.** A wider line under the route, giving contrast against both light and dark map styles without depending on the style's own colors.
- **Route line.** The path from `RouteGeometry`.
- **Endpoint markers.** Origin and destination, visually distinct from each other. Origin reads as where you are, destination as where you are going. Concrete treatment is `TBD` in [../DESIGN.md](../DESIGN.md).

The route is drawn from the `path` in `RouteGeometry`. When the source path is sparse, the adapter densifies it before animating, because a draw animation across long straight segments reveals the polyline's actual vertices and looks broken.

## Route draw animation

On entering `route_ready`, the route draws progressively from origin to destination.

- **Progression is by distance along the path, not by vertex index.** Vertex-indexed animation crawls through dense corners and sprints down straight highway segments. Distance-based progression moves at a constant apparent speed, which is the only version that reads as travel.
- **Duration scales with distance, clamped.** A five hundred metre trip and a thirty kilometre trip should not take the same time to draw, and neither should the long one make the user wait. Range is `TBD`, with a floor and a ceiling.
- **Easing eases out.** The line arrives rather than stopping dead. No linear timing.
- **The camera frame and the draw start together.** The frame settles first so the draw happens inside a stable viewport. Chasing a moving camera with a growing line produces motion sickness and hides the route.
- **A gesture cancels the draw.** Any pan, pinch, or rotate during the animation completes the route immediately at full length and hands the camera to the user. It never rewinds, never restarts, and never fights back. The route being visible is the goal, and the animation is only one way of getting there.
- **The route is complete before the next sheet is interactive.** The Choose your ride sheet can appear during the draw, but the trip header's distance and duration must already be final. A number that changes while the user reads it is worse than a number that arrives a beat late.
- **Reduced motion.** When the system requests reduced motion, the route appears at full length with a short cross-fade and the camera cuts instead of flying. The information is identical; only the theater is dropped.

Replaying the draw is not a feature. A route that re-animates every time a sheet resizes is a distraction, and the animation's job is done the first time.

## Pin-drop tracking

Pin mode, from the location picker in [FLOWS.md](FLOWS.md), inverts the usual relationship. The pin is pinned to the center of the map and the user moves the map underneath it.

- The pin is a fixed screen-space element at the center of the visible region. It is not a map annotation and does not lag the map, because a pin that trails the map during a pan looks like a bug.
- The center coordinate streams continuously as the map moves.
- Reverse geocoding is debounced. Interval is `TBD`, tuned so a slow drag does not fire a request per frame.
- The peek sheet's label updates from the geocode result, showing a resolving state in between. It never shows a stale label as if it were current.
- A failed geocode falls back to formatted coordinates. Coordinates are a usable destination, and an error toast over a perfectly good point would be a self-inflicted dead end.

## Gesture ownership

The user outranks the state machine on camera control, always.

- Any gesture marks the camera as user-owned and cancels in-flight camera animation.
- While user-owned, `focus` and `frame` intents from state transitions are suppressed. The recenter control appears.
- Ownership returns to the app on recenter, or on the next state transition the user explicitly caused, such as committing a new destination.
- `track` in pin mode is the exception, since there the gesture is how the user drives the intent.

## Map style

- Rydar ships one map style per app theme. Style choice is `TBD` and tracked in [../DESIGN.md](../DESIGN.md), and it must satisfy two constraints: route and marker colors stay legible against it, and label density stays low enough that a route line is not competing with street names.
- Points of interest stay enabled. A user picking a destination recognizes a mall by name faster than by shape.
- Traffic overlays stay off by default. Rydar's own duration is already an estimate, and a traffic layer invites the user to second-guess a number Rydar does not control.
- Attribution required by the SDK's terms sits at the bottom edge, positioned against the visible region so a sheet never covers it.

## Performance rules

These are the ones that decide whether the map feels native or cheap.

- Camera animation runs in the SDK, not by pushing a coordinate per frame from application code. Frame-by-frame camera updates from the app layer stutter the moment anything else touches the main thread.
- The animated route uses one mutable geometry source updated in place. It does not remount a layer per frame and does not rebuild the whole feature collection on every tick.
- Debounce every geocode and every routing request. Interval `TBD`.
- Tile and geocode responses are cached, so returning to a recent trip does not refetch what is already on the device.
- Target is a sustained sixty frames per second during the draw and during sheet transitions on mid-range Android hardware, which is what the audience actually carries. Measurement approach is `TBD` once a stack exists.

## Open questions

- Numeric zoom values per tier, which depend on the SDK.
- The breathing margin, the draw duration range, and the geocode debounce interval.
- Whether the route draw is worth its complexity at all. It is specified because the product asked for it, and it is the first thing to cut if it costs frames on target hardware. That call needs a measurement, not an opinion.
- Whether to show the user's live heading during pin mode.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Established the camera-as-pure-function rule, the four camera intents, the full state lookup table, the visible-region padding contract, and the distance-based route draw.
