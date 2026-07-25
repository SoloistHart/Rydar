---
doc: PRODUCT
status: draft
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Rydar product spec

## The problem

A Metro Manila commuter deciding how to get somewhere opens Grab, then Angkas, then JoyRide, then inDrive. Each one demands the same pickup and destination before it reveals a number. Four apps, four sets of typing, roughly ninety seconds, and by the time the last quote lands the first one has moved. The fare gap is often small, twenty pesos or less, but the availability gap is not. The app that shows a price is not always the app with a driver, and the only way to find out today is to keep all four installed and check them one at a time.

Rydar collapses that into one destination entry and one screen.

## What Rydar is

A price comparison layer over the ride-hailing apps the user already has. Enter a destination once, see every connected provider's fare for every ride class side by side, then tap through to the winning app to book.

The mental model is a flight search engine. It knows the prices, it does not own the planes, and the booking always finishes on the operator's own surface.

## What Rydar is not

These are hard boundaries, not a phasing plan. A feature request that crosses one of these is a different product.

- Not a transport network company. Rydar has no driver supply, dispatches nothing, and is not an LTFRB-accountable operator.
- Not a booking surface. The ride is confirmed in the provider's app, always. Rydar's last act is a handoff.
- Not a payment surface. Rydar never holds a card, a wallet balance, or a peso.
- Not a live tracking surface. Once the user leaves for the provider app, Rydar has no idea what happened, and its history reflects that honestly.
- Not a driver-facing product. There is no driver app and no driver account.
- Not a fare oracle. Every number is attributed to the provider that gave it, with an age. Rydar does not estimate fares of its own and does not average across providers to produce a headline figure.

## Positioning constraints that follow

Because the booking and the money both stay with the provider, Rydar's credibility rests entirely on the numbers being real and attributed. Three consequences run through the whole design.

Rydar never invents a price. If a provider cannot be reached, the row says so with a reason and an action. A blank space or a guessed number would be worse than no app. The `QuoteResult` shape in [docs/DOMAIN.md](docs/DOMAIN.md) exists to make this structurally impossible to get wrong.

Rydar never flattens a provider's pricing model. inDrive asks the rider to name a price. Angkas quotes one number and sells a raincoat. Taxis meter. Showing all three as a single peso figure would misrepresent all three.

Rydar shows its own trip distance separately from each provider's. They disagree in real usage, sometimes badly, and that disagreement is information the user wants rather than noise to be hidden.

## Users

**The daily commuter.** Rides five or more times a week on short urban trips, usually under ten kilometers. Has three or four apps installed already. Optimizes for a mix of price and whether a driver actually exists right now. Cares most about the collapsed comparison screen and about bookmarked home and work.

**The occasional rider.** Rides a few times a month, often longer trips, often to a mall or an airport. Has one or two apps installed and does not know the others are cheaper. Cares most about seeing an option they would not have checked, and about Rydar telling them plainly that a provider is not connected rather than pretending it does not exist.

**The rain-hour rider.** Same person as either of the above, in a surge. Price ceases to matter and availability becomes everything. Cares most about demand signals, drivers nearby, and knowing which app to stop wasting time on.

Not a user. Anyone wanting to hail a ride inside Rydar. That request gets declined, not roadmapped.

## The flow

One path, described here at product level. Screen-by-screen detail lives in [docs/FLOWS.md](docs/FLOWS.md), camera behavior in [docs/MAP.md](docs/MAP.md).

1. **Connect.** On first open, after the loading screen, a sheet lists the supported providers with their logos and a Connect action each. Connecting is what lets Rydar fetch that provider's prices. The user can connect none, some, or all, then dismiss with Done. The sheet is reachable afterward from the account control at the top left, so connecting later is never a dead end.
2. **Where to.** The map takes the screen. A sheet asks where to, showing the origin, which defaults to the current location, and an empty destination slot. Both slots accept a search, a bookmark, a recent, or a dropped pin.
3. **Pick the destination.** Picking updates the map live as the pin moves. With an origin and no destination the camera holds tight on the origin. When the destination lands, the camera pulls back to frame both.
4. **Route.** Rydar draws the route from origin to destination with an animated draw, then reports its own distance and duration.
5. **Choose your ride.** A sheet replaces the destination picker, listing ride classes as collapsed rows with the fare span across providers. Motorcycle, four-seater, six-seater, taxi, comfort.
6. **Expand a class.** Expanding a class reveals the providers that serve it with their individual prices, labels, and headline details. Motorcycle reveals Angkas and JoyRide. Taxi reveals inDrive and the others that offer it.
7. **Inspect a provider.** Tapping a provider row again opens the full detail: estimated fare, the provider's own trip distance, available add-ons with their fees, demand and availability signals, and the fare breakdown. Everything here is attributed to that provider and stamped with an age.
8. **Hand off.** Selecting a provider reveals a single primary action, `Open in [provider]`. It opens the installed app, prefilled as far as that provider's link format allows, and falls back to the store or web when the app is absent.
9. **History.** Every comparison is recorded with its quotes as they stood and whether Rydar handed off. Grouped by month, filterable by status. Reachable from the top right.

## Feature ledger

Status values are `shipped`, `in progress`, `specified` for designed but not built, `open` for accepted but unspecified, and `deferred`.

| Feature | Status | Notes |
| --- | --- | --- |
| Map-first shell with bottom sheets | specified | Structure in [docs/FLOWS.md](docs/FLOWS.md), design scaffold in [DESIGN.md](DESIGN.md) |
| Connected apps sheet | specified | UI is specified, the connect mechanism is not |
| Provider connection and fare fetch | open | Deliberately open. Contract in [docs/CONNECT.md](docs/CONNECT.md), no implementation |
| Origin and destination picking | specified | Search, bookmark, recent, dropped pin |
| Bookmarks | specified | Named saves for both endpoints |
| Recents | specified | Rolling window, distinct from bookmarks |
| Live pin feedback | specified | Map and sheet update as the pin moves |
| Route draw and camera choreography | specified | [docs/MAP.md](docs/MAP.md), SDK undecided |
| Ride class grouping | specified | Five classes, closed set |
| Per-provider quotes within a class | specified | Depends on the connect work |
| Provider fare detail | specified | Add-ons, demand, breakdown, freshness |
| Deep link handoff | specified | Per-provider link formats unverified, `TBD` |
| Comparison history | specified | Snapshot semantics, month grouping, status filter |
| Multi-stop trips | deferred | The Add destination affordance is reserved for this |
| Non-ride alternatives such as transit | deferred | Out of scope for the first release |
| Accounts and cloud sync | deferred | Local-only until there is a reason not to be |
| Fare alerts and price watching | deferred | Needs sustained fetch, which needs the connect work first |

## Success signals

A working Rydar produces these. They are stated so a later feature can be argued against them rather than against taste.

- A commuter reaches a provider decision in one destination entry instead of four.
- The comparison screen shows every connected provider, with a reason attached to each one that has no price.
- The user can tell, after the fact, whether the app they picked was the cheapest at the time.
- Nobody mistakes Rydar for the thing that dispatched their ride.

## Risks

**Fare acquisition is the whole product and the least controlled part of it.** No provider here offers a public fare API for third parties. Comparable aggregators solved this with scraping or device automation, both of which break when a provider changes its interface. This is why the fetch sits behind a port with per-provider failure reasons instead of being assumed reliable. See [docs/CONNECT.md](docs/CONNECT.md) and [docs/RESEARCH/ride-hailing-ph.md](docs/RESEARCH/ride-hailing-ph.md).

**Terms of service and credential handling.** Asking a user to connect a provider account raises real questions about what Rydar stores and what a provider permits. Unresolved and tracked as an open question below, not hand-waved.

**Quote staleness.** A comparison is only true for a short window, and the length of that window differs per provider. Showing an aging number without its age would be the fastest way to lose the user's trust.

**Handoff fidelity.** If a link cannot carry the destination, the user retypes it and most of the saved effort evaporates. Per-provider prefill capability is therefore data in the registry, and the UI promises only what the link can deliver.

## Open questions

- What connection actually means per provider, and what Rydar is permitted to store. Blocks the whole fetch layer.
- Which providers can accept a prefilled origin and destination through a link.
- The staleness window per provider.
- Whether Move It and Lalamove Ride join the initial registry.
- Whether history needs an explicit "I booked this" confirmation, given Rydar cannot observe the booking.

## Glossary

- **Provider.** A ride-hailing app Rydar compares, such as Angkas or Grab.
- **Connection.** The user's authorization for Rydar to fetch prices from one provider.
- **Ride class.** Rydar's own grouping of comparable vehicle types, one of five. Not a provider's tier name.
- **Quote.** One provider's price for one ride class on one trip, at a moment in time.
- **Fare span.** The cheapest and dearest available quote within a ride class, shown on the collapsed row.
- **Comparison.** The full set of quotes for one trip.
- **Handoff.** Leaving Rydar for a provider's app to book. The end of Rydar's involvement.
- **Freshness.** How old a quote is, and whether it is still presented as current.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Set comparison-only positioning, the six hard non-goals, three personas, the nine-step flow, and the feature ledger.
