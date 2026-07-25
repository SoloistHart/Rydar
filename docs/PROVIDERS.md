---
doc: PROVIDERS
status: draft
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Provider registry

The registry is the single source of truth for which providers Rydar compares, which ride classes each serves, how each provider's own tier names map onto Rydar's classes, and what its handoff link can carry. It lives in `core/providers` as data. No UI file may contain a provider name in a conditional.

Shapes referenced here are in [DOMAIN.md](DOMAIN.md). Ride classes are Rydar's own vocabulary, deliberately closed, and are not any provider's naming.

## Verification status

Facts below are marked so nobody builds on a guess.

- **Confirmed** means sourced from the provider or from reporting, cited in [RESEARCH/ride-hailing-ph.md](RESEARCH/ride-hailing-ph.md).
- **Observed** means seen in the reference material for this project and not otherwise verified.
- **Unverified** means assumed and needing confirmation before implementation.

Every deep link scheme in this file is `TBD` and unverified. None have been tested. Do not treat any handoff detail here as fact.

## Ride class support matrix

Rydar's class on the left, the provider's own tier name in the cell.

| Provider | `motorcycle` | `car_4` | `car_6` | `taxi` | `comfort_xl` |
| --- | --- | --- | --- | --- | --- |
| inDrive | no | yes, unverified tier name | unverified | yes, observed | yes, observed |
| Grab | no | GrabCar, confirmed | GrabCar 6-seater, confirmed | GrabTaxi, confirmed | unverified |
| Angkas | yes, confirmed | no | no | no | no |
| Green GSM | no | unverified | unverified | yes, confirmed | unverified |
| JoyRide | MC Taxi, confirmed | JoyRide Car, confirmed | JoyRide Car 6-seater, confirmed | Taxi, confirmed | Super Taxi, unverified mapping |

Two mappings need a decision rather than a lookup. Whether JoyRide's Super Taxi belongs in `taxi` or `comfort_xl` is a judgment call, since it is a metered taxi in a newer and larger vehicle. And Grab has no motorcycle class in the Philippines at all, because GrabBike is not offered here and Move It is a separate app, which is a genuine market quirk rather than missing data.

The matrix is a summary for readers. The machine-readable version is the registry entry per provider, and if the two ever disagree the registry wins and this table is the bug.

## Registry entry shape

```
record RegistryEntry {
  id:            ProviderId
  displayName:   text
  tagline:       text                 one line, what this provider is for
  classes:       list of ClassMapping
  connect:       ConnectCapability
  handoff:       HandoffDescriptor
  pricing:       PricingModel
  coverage:      text
  notes:         text
}

record ClassMapping {
  rydarClass:    RideClass
  providerLabel: text                 shown verbatim on the provider row
}

oneof PricingModel {
  fixed_upfront { surge: boolean }
  metered       { bookingFee: boolean }
  rider_offer   { }
  no_surge      { }
}
```

`PricingModel` exists because it predicts which `FareShape` a provider's quote will take, and the comparison surface needs that before the first fetch in order to render a sensible skeleton. It also gives the fare detail sheet the vocabulary to explain why two providers' numbers are not directly comparable.

## Providers

### inDrive

Tagline, observed. Name your price and pick your driver.

Pricing. Originally a rider-offer model, which is the company's signature. Reporting says the LTFRB suspended fare negotiation in the Philippines and inDrive now follows the standard fare matrix, confirmed. The reference material still shows inDrive quotes labeled as offers with a low-to-high spread, observed. Rydar renders whatever the fetch returns, and the `offer` variant of `FareShape` exists precisely so this provider can be shown honestly under either regime.

Classes. Taxi and a comfort tier, observed. Whether a plain four-seater tier exists separately is unverified.

Coverage. Relaunched in the Philippines in June 2024, operating in Metro Manila plus several provincial cities, confirmed.

Notes. The one provider whose price is a starting point rather than a quote. Never present an inDrive figure as a fixed fare, and never fold it into a cross-provider average.

### Grab

Tagline, observed. Rides, delivery, and payments in one app.

Pricing. GrabCar is fixed upfront with a demand surge multiplier, confirmed. GrabTaxi is an LTFRB-metered fare plus a booking fee and is not subject to algorithmic surge, confirmed. These are two different pricing models inside one app, which means a single Grab connection can produce quotes of two different shapes on the same trip, and the registry must model them as separate class mappings rather than one Grab price.

Classes. GrabCar for `car_4`, GrabCar 6-seater for `car_6`, GrabTaxi for `taxi`, all confirmed.

Coverage. The dominant operator, Metro Manila and major cities nationwide, confirmed.

Notes. No motorcycle class in the Philippines. Grab is also the only provider in the registry whose surge behavior differs between two of its own tiers, so the demand signal must be attached per class rather than per provider.

### Angkas

Tagline, observed. Motorcycle rides built for Metro Manila traffic.

Pricing. Fixed fare for a motorcycle ride, typically an exact figure rather than a range, confirmed. Operates under the LTFRB motorcycle taxi pilot study.

Classes. Motorcycle only, confirmed.

Add-ons. A raincoat rental and a ride insurance upgrade, both confirmed by reporting and consistent with the reference material. The raincoat is conditional, offered when it is raining, and carries a platform fee on top of its own price. This provider is the reason `AddOn` carries a separate fee field and a conditional marker.

Coverage. Metro Manila, Cebu, and Cagayan de Oro, confirmed.

### Green GSM

Tagline, observed. Budget-friendly rides with upfront pricing.

Pricing. Upfront, observed. Whether it surges is unverified.

Classes. Taxi, confirmed. Whether it exposes distinct seat-count tiers is unverified.

Coverage. Launched in the Philippines in June 2025 as the first all-electric taxi operator, initially across ten of the sixteen Metro Manila cities, confirmed. Fleet is entirely VinFast electric vehicles and drivers are direct employees, confirmed.

Notes. An all-electric fleet is a real differentiator and the fare detail sheet should surface it, since a rider choosing between two similar prices may well choose on that basis. Coverage is the narrowest in the registry, which makes `outside_coverage` a common and expected result for this provider rather than an error.

### JoyRide

Tagline, observed. Motorcycle, taxi, and car options in one app.

Pricing. A stated no-surge policy since launch, with fares computed on a shortest-route basis rather than by demand, confirmed. This makes JoyRide the reference point during a surge, and the comparison screen will often show it as the cheapest option precisely when every other provider is elevated.

Classes. MC Taxi for `motorcycle`, JoyRide Car in four and six seat variants, a metered Taxi, and Super Taxi, all confirmed as products. The Super Taxi mapping onto a Rydar class is unverified and needs a call.

Coverage. The broadest provincial reach among the motorcycle operators, including Metro Manila, nearby provinces, Cebu, and Baguio, confirmed.

Notes. Widest class coverage of any provider in the registry, so a JoyRide outage degrades more of the comparison screen than any other single provider.

## Not in the registry

**Move It.** A licensed motorcycle taxi operator under the same LTFRB pilot as Angkas and JoyRide, confirmed, and integrated into Grab's ecosystem while still requiring its own app in the Philippines. A strong candidate for the second wave and deliberately excluded from the first, since the flow does not need a fourth motorcycle option to be proven.

**Lalamove Ride.** Entered ride-hailing in early 2025, confirmed. Candidate, unassessed.

Adding either is a registry entry plus an adapter plus an ADR. It touches no UI, which is the property the registry exists to provide.

## Adding a provider

1. Add the registry entry, including the class mappings and the pricing model.
2. Confirm the handoff link format and record exactly which fields it can prefill. The UI promises only what is recorded here.
3. Implement the `FareProvider` adapter per [CONNECT.md](CONNECT.md), mapping every failure onto an `UnavailableReason`.
4. Add recorded-response tests for the adapter, so a provider changing its interface fails a test instead of silently emptying a comparison.
5. Source the logo at the required sizes. Never recolor or crop it, per [../DESIGN.md](../DESIGN.md).
6. Write the ADR if the addition changes the ride class set or a class mapping.
7. Update this document's matrix and the `ROADMAP` if the provider was a milestone.

## Open questions

- Every deep link scheme, and which fields each can prefill. All `TBD`, all blocking the handoff work.
- Whether JoyRide Super Taxi is `taxi` or `comfort_xl`.
- Whether inDrive currently returns an offer or a fixed fare, given the LTFRB suspension.
- Whether Grab's `comfort_xl` tier exists in the Philippines under a name Rydar should map.
- Green GSM surge behavior and its exact service area, which determines how often `outside_coverage` fires.
- Whether Move It joins before the first release.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Registered five providers with a class support matrix, per-provider pricing models, and explicit verification markers on every claim.
