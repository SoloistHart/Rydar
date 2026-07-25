---
doc: FLOWS
status: draft
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Screen and flow spec

Behavioral spec for every surface in Rydar. Written in the vocabulary of [DOMAIN.md](DOMAIN.md), so read that first. Camera behavior is deliberately absent here and lives in [MAP.md](MAP.md). Visual treatment is absent too and lives in [../DESIGN.md](../DESIGN.md).

Nothing in this file names a framework, a navigation library, or a sheet component. It describes what each surface owns, what it shows, what it does on every input, and what it does when things fail.

## The shell

Rydar has one screen. The map fills it, edge to edge, from launch to teardown. Everything else is a sheet or a floating control over that map. There is no page the map is absent from, because losing the map would cost the user their spatial context, which is the one thing a list of prices cannot give back.

Persistent chrome over the map.

- **Account control, top left.** Opens the Connected apps sheet. Present in every state.
- **History control, top right.** Opens History. Present in every state.
- **Recenter control.** Returns the camera to the user's location. Appears only when the camera has drifted from it.

The map is interactive at all times. Pan, pinch, and rotate are never locked, including while a sheet is open and while the route draw animation is running. A user who grabs the map mid-animation cancels the animation and keeps their gesture. The animation is a courtesy; the gesture is intent, and intent wins.

## Sheet system

Every sheet obeys the same rules, so that they are not each a special case.

- One sheet at a time, except the single stacked case noted under Provider detail.
- Sheets sit above the map and never cover it entirely. The map keeps a visible region at all times, and that region is what the camera frames against. See the padding contract in [MAP.md](MAP.md).
- Every sheet has three possible detents: peek, half, and full. A sheet declares which ones it supports.
- A sheet is dismissed by its own explicit control, not by an accidental swipe. Destructive dismissal, meaning one that discards a picked destination or a fetched comparison, always requires the explicit control.
- The sheet that is showing is a function of `PlanningState`. It is not navigation history. A state change swaps the sheet; the back gesture moves the state machine backward, which then swaps the sheet.

State to sheet mapping.

| `PlanningState` | Sheet |
| --- | --- |
| `idle` | Where to, peek |
| `picking_origin` | Location picker, scoped to origin |
| `origin_set` | Where to, half |
| `picking_destination` | Location picker, scoped to destination |
| `routing` | Where to, half, with a route-pending indicator |
| `routing_failed` | Where to, half, with an inline retry |
| `route_ready` | Choose your ride, half |
| `choosing_class` | Choose your ride, half |
| `class_selected` | Choose your ride, half, target class expanded |
| `provider_selected` | Choose your ride with the handoff action revealed |

The Connected apps sheet and History are modal over any state and do not change `PlanningState`.

## Launch

Cold start does three things concurrently: loads the map, resolves the location permission, and reads stored connections. The loading surface stays up until the map can render a frame. It shows brand identity only. No tips, no rotating copy, no progress percentage.

Then it branches on whether any connection record exists.

- No connection record, meaning first run. The Connected apps sheet opens automatically at full detent.
- At least one record. Straight to `idle` with the Where to sheet at peek.

Location permission handling.

- Granted. The origin defaults to the current location, labeled as such.
- Denied or restricted. The app is fully usable. The origin slot is empty and prompts for a pick instead of showing a fake location. A single inline row explains that enabling location would fill this in, with an action that opens system settings. It is shown once per session, not as a recurring wall.
- Granted but no fix yet. The origin slot shows a resolving state with the map at a city-level default. It does not block picking a destination.

## Connected apps sheet

Reachable from the account control, and automatically on first run. Full detent. This is where Rydar earns the right to fetch prices.

Contents, in order.

- Title and a close control.
- One row per provider in registry order. Each row carries the logo, the provider name, a one-line description of what that provider is for, and a trailing action.
- A Diagnostics row at the bottom, separated from the provider list. Logs, map options, and lab tools. Developer-facing, not user-facing, and it stays out of the provider group so it never reads as a provider.

Row trailing action by `Connection` variant, from [DOMAIN.md](DOMAIN.md).

| Variant | Action | Behavior |
| --- | --- | --- |
| `disconnected` | Connect | Starts the connect flow for that provider |
| `connected` | Connected, with a check | Tapping opens the connection detail |
| `expired` | Reconnect | Same as connect, and the row states that access lapsed |
| `unsupported` | Nothing actionable | Row is present and muted, stating why |

`unsupported` providers stay visible. Hiding them would leave the user wondering whether Rydar knows the app exists.

Connection detail. Opens over the sheet for a connected provider. Shows the provider identity, the account label such as a masked phone number, the date connected, and a single destructive action to disconnect. Disconnecting asks for confirmation, drops the stored credential, and immediately removes that provider's quotes from any live comparison rather than leaving stale rows behind.

The connect flow itself is intentionally unspecified here. It is a port, defined in [CONNECT.md](CONNECT.md). What this sheet guarantees is that the flow reports one of exactly two outcomes, connected or not connected with a reason, and that the sheet stays usable either way.

Dismissal. The close control commits nothing and cancels nothing; connections apply as they succeed. Closing with zero providers connected is allowed. Rydar then runs in a degraded mode where the flow works end to end and every quote row reads `not_connected` with a Connect action. That is a deliberate onboarding path, not an error.

## Where to sheet

The resting state of the app. Peek detent when `idle`, half once an origin exists.

Contents.

- The heading, `Where to?`.
- The origin slot. Marked with the origin indicator. Shows the label and sublabel of the current origin `Place`, or a prompt when empty.
- The destination slot. Marked with the destination indicator. Shows the destination `Place` or the prompt to add one.
- A bookmarks control, aligned with the slots, opening saved places directly.
- An `Add destination` affordance, reserved for multi-stop. Present in the layout, inert for now, and it must not look enabled. It is in the spec because removing it later would be a layout regression, and multi-stop is a known future.
- A primary action, `Compare fares`. Disabled until both endpoints resolve. Disabled means visibly inert, not hidden, so the user can see what completing the form buys them.

Interactions.

- Tapping either slot enters the location picker scoped to that slot, moving the state machine to `picking_origin` or `picking_destination`.
- The slots can be swapped. Swapping from a `route_ready` or later state discards the route and the comparison and returns to `routing`, because a reversed trip is a different trip.
- `Compare fares` moves to `routing`.

## Location picker

One surface, used for both endpoints, parameterized by which slot it is filling. Full detent. Building it twice would guarantee the two drift apart.

Contents.

- Title naming the slot being filled, `Origin` or `Destination`.
- A close control that abandons the pick and restores the previous value.
- A map-mode control that collapses the sheet to peek and switches to pin-drop mode.
- A `Recent` group. Each row shows the place label, its sublabel, and its straight-line distance from the current origin. Distance is a cheap orientation cue and does not need routing.
- A `Bookmarks` group, when any exist, above recents.
- A search field, pinned so it stays reachable at any scroll position.

Search behavior. Debounced, results replacing the recent and bookmark groups while a query is active. Clearing the query restores them. Each result row can be bookmarked inline without leaving the picker. Zero results says so plainly and keeps the map-mode control prominent, since a dropped pin is the fallback for anything unnamed.

Pin-drop mode. The sheet collapses to peek, the map takes over, and a pin tracks the map center. The peek sheet shows the reverse-geocoded label for wherever the pin currently sits, updating live as the map moves. This is the live-update behavior the flow requires: the label and the sheet track the pin continuously, not on release. Reverse geocoding is debounced and its in-flight state is visible, and a failure shows coordinates rather than an error, because a coordinate is still a usable destination. Confirming commits a `Place` with source `map_pin`.

Committing a pick advances the state machine. Origin picked moves to `origin_set`. Destination picked moves to `routing`.

## Routing

`routing` is a real state with a visible surface, not a flicker. The Where to sheet stays at half with both endpoints filled and a pending indicator on the primary action.

Success moves to `route_ready`, with a `Trip` carrying Rydar's own distance and duration. The camera frames both endpoints and the route draws. See [MAP.md](MAP.md).

Failure moves to `routing_failed`. The sheet keeps both endpoints, states that the route could not be built, and offers retry. Endpoints are never cleared on a routing failure; making the user retype an address because a network call failed is the kind of small betrayal that loses an app.

### Distance divergence

Rydar's route distance and a provider's quoted trip distance will disagree. They are computed by different routing engines against different road graphs, and in the reference material a single trip appeared as 26.9 km by one measure and 9.5 km by a provider's own. That gap is not a bug to reconcile.

The rule is that both numbers are shown and both are attributed. The trip header carries Rydar's distance and duration. Each provider row carries that provider's own distance next to its price. Rydar never overwrites a provider's distance with its own, never averages them, and never hides one to make the screen look consistent. When the two differ by more than a threshold, currently `TBD`, the provider row states that the provider measures the trip differently, so a user comparing a fare against a distance is not left thinking one of the numbers is a typo.

## Choose your ride sheet

Opens on `route_ready`, replacing the Where to sheet. Half detent, expandable to full. The trip header stays visible above it, showing both endpoints, Rydar's distance and duration, and a control back into editing.

Collapsed rows. One row per `RideClass` in a fixed order: motorcycle, four-seater, six-seater, taxi, comfort. The order is fixed rather than sorted by price, because a stable position is worth more to a repeat user than a ranking they did not ask for.

Each collapsed row shows the class name, an icon, Rydar's trip distance, the `FareSpan` across available quotes in that class, and a demand note when any provider in the class reports elevated demand. A class with no available quotes still appears, with the span replaced by the dominant unavailability reason and its action.

Expansion. Tapping a row expands it, moving to `class_selected`, and reveals one row per provider serving that class. Only one class is expanded at a time. Motorcycle expands to Angkas and JoyRide. Taxi expands to inDrive and the other taxi-capable providers. The mapping is registry data, from [PROVIDERS.md](PROVIDERS.md), never hardcoded here.

Provider row contents, driven by `QuoteResult`.

| `QuoteResult` | Row shows |
| --- | --- |
| `fresh` | Logo, provider name, its own tier label, its trip distance and duration, the fare rendered per its `FareShape`, an info affordance |
| `stale` | The same, plus a visible age and a refresh action |
| `unavailable` | Logo, provider name, and the reason with its action. Never a price |

Fare rendering follows `FareShape` and never collapses it. `exact` shows one figure. `range` shows a low and high. `offer` is labeled as an offer with the suggested figure, because inDrive's number is a starting point the rider names, not a price the provider set.

Unavailability copy and action.

| Reason | Row says | Action |
| --- | --- | --- |
| `not_connected` | Not connected | Connect, opens the Connected apps sheet |
| `needs_reauth` | Connection expired | Reconnect |
| `no_service_for_class` | Does not offer this ride type | None |
| `outside_coverage` | Not available at this pickup | None |
| `provider_error` | Could not get a price | Retry |
| `timeout` | Took too long to respond | Retry |
| `rate_limited` | Too many requests, try shortly | Retry, disabled until a cooldown elapses |

Selecting a provider row moves to `provider_selected` and reveals a single primary action, `Open in [provider]`. One primary action, always. A second competing button here would make the most important tap in the app ambiguous.

## Provider fare detail

The one stacked sheet in the app. Opens over the Choose your ride sheet from a provider row's info affordance, so the comparison stays visible behind it and the user does not lose their place.

Contents.

- Provider identity and a Done control.
- The headline estimated fare, rendered per `FareShape`.
- Route, holding the provider's own trip distance and duration, labeled as the provider's figures.
- Available add-ons. Each names the add-on, its amount, any platform fee charged on top, and whether it is optional or conditional. A conditional add-on states its condition, such as a raincoat rental only offered while it is raining.
- Demand and availability. Whichever of the demand level, the busier-than-usual multiplier, drivers nearby, riders waiting, and any provider note are actually present. Absent fields are omitted, never shown as zero or as a dash.
- Fare breakdown, line by line, from the `FareLine` list. Base, distance, time, surge, fees, discounts.
- A freshness stamp naming when these figures were captured.
- A closing qualifier that the final fare may vary with traffic, route, and waiting time.

Every figure on this sheet is the provider's, and the sheet says so. Rydar adds no computed field of its own here.

## Handoff

The `Open in [provider]` action attempts, in order: open the installed provider app with as much of the trip prefilled as that provider's link format supports, then the provider's web surface, then the app store listing.

Before the handoff, Rydar writes the history entry with the quotes as they stood and an outcome of `handed_off`. It writes before leaving, because the app may not get a chance to run again before the user returns.

Prefill honesty. The action never implies more than the link can carry. When a provider's link cannot accept the destination, the row states that the destination must be re-entered in that app. Discovering that after the jump, having been led to expect otherwise, is worse than knowing beforehand.

The app is absent. The fallback opens the store listing and the outcome recorded stays `none`, because nothing was handed off.

Returning to Rydar. The comparison is still there, with its age visible. Rydar does not know what happened and does not ask on return, since an interruption on re-entry buys the user nothing.

## History

Modal over the map, from the history control. Full detent.

Contents.

- Title, a close control, and a filter control.
- A period header, defaulting to this month, with a summary count.
- Entries grouped by month, newest first. Each entry shows origin and destination labels, the timestamp, the cheapest quote at the time with its provider, and whether Rydar handed off and to whom.
- Tapping an entry opens the stored snapshot, showing that comparison exactly as it stood, clearly marked historical and offering to re-run the same trip as a fresh comparison.

Filters. By period and by outcome, meaning handed off or compared only. Filters are visible on the header rather than hidden behind a menu, because a filtered empty state is otherwise indistinguishable from having no history.

Empty states, and there are two distinct ones.

- No history at all. States that comparisons will appear here, and points at making one.
- History exists but nothing matches the current filter. Says exactly that, names the active filter, and offers to clear it. This is the case the reference screenshots got right and it is worth preserving, because the alternative reads as data loss.

## Cross-cutting failures

**Offline.** The map falls back to whatever tiles are cached. Search and routing state that they need a connection. Bookmarks, recents, and history stay fully readable, since they are local. Nothing in the app shows a full-screen offline wall.

**All providers unavailable.** The Choose your ride sheet still renders every class with every provider row and its reason. The sheet does not collapse into a single global error, because the per-provider reasons are the actionable part.

**A quote arriving late.** Quotes populate per provider as they land. Rows show a pending state and settle independently. The sheet never waits for the slowest provider before showing the first price.

**Backgrounded mid-flow.** State survives. On return, quotes older than their TTL are marked `stale` with a refresh action, and the trip and route are untouched.

## Open questions

- The divergence threshold at which a provider row calls out its differing distance measure. `TBD`.
- Whether the collapsed class rows ever sort by price, as an explicit user preference rather than a default.
- Whether re-running a historical trip should reuse the stored places or re-geocode them.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Specified the shell, the sheet system, all seven surfaces, the unavailability copy table, the distance divergence rule, and cross-cutting failures.
