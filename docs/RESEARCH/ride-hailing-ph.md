---
doc: RESEARCH_RIDE_HAILING_PH
status: active
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Research. Philippine ride-hailing and comparable aggregators

Findings gathered on 2026-07-26 to ground [../PRODUCT.md](../PRODUCT.md), [../PROVIDERS.md](../PROVIDERS.md), and [../CONNECT.md](../CONNECT.md). Nothing here is a decision. Where a figure appears it is a sourced observation at a point in time and it will drift, so treat any number as an order of magnitude rather than a constant to code against.

## The market

Grab is dominant in four-wheel ride-hailing, having acquired Uber's Southeast Asia operations in 2018, and operates across Metro Manila, Cebu, Davao, and other major cities. Uber does not operate in the Philippines.

Motorcycle taxis are a separate and regulated segment. Angkas, JoyRide, and Move It are the three platforms authorized under the government's Motorcycle Taxi Pilot Study, overseen by an LTFRB technical working group. All three provide helmets and insurance. Move It is integrated into Grab's ecosystem but still requires its own app in the Philippines, which is why there is no GrabBike here.

inDrive relaunched in the Philippines in June 2024 and operates in Metro Manila plus several provincial cities. Its signature rider-offer pricing was suspended by the LTFRB, and reporting says it now follows the standard fare matrix like other licensed operators. This matters for Rydar because the reference material still shows inDrive quotes as offers, so the two accounts disagree and the actual behavior needs verification against a live app.

Green GSM launched on 10 June 2025 as the first fully foreign-owned all-electric taxi operator in the country, run by Vietnam's Green and Smart Mobility Joint Stock Company. It began in ten of Metro Manila's sixteen cities with an exclusively VinFast electric fleet and directly employed drivers, and its app reportedly topped the Play Store's Travel and Local category within days of launch. Reported initial fleet figures vary between five hundred and twenty-five hundred vehicles depending on the source, with a stated plan to scale to fifteen thousand over two to three years.

Lalamove launched Lalamove Ride in February 2025. Not assessed.

## Regulatory shape

Two pricing regimes coexist, and the distinction is central to why Rydar cannot present one blended figure.

Transport Network Vehicle Services, the Grab and inDrive model, run under a registered Transport Network Company with app-based booking and algorithmic pricing within LTFRB-approved limits. The full fare is shown before confirmation.

Metered taxis run on LTFRB-calibrated hardware meters, with a nationwide flag-down rate raised to fifty pesos in November 2024. A metered fare is structurally immune to algorithmic surge, since the meter is physical.

The consequence for Rydar is that a metered tier and a TNVS tier are not comparable in the same way two TNVS tiers are. One is a range that depends on the route actually driven, the other is a fixed figure computed up front. This is why [../DOMAIN.md](../DOMAIN.md) has three `FareShape` variants rather than a low and high pair.

## Observed pricing behavior

Sourced figures, all subject to change and none suitable as a constant in code.

Grab's TNVS structure was reported around a forty-five peso base with roughly fifteen pesos per kilometre, two pesos per minute, and a twenty peso booking fee, with a six-seater at a higher base and per-kilometre rate. GrabTaxi adds a booking fee of roughly forty to seventy pesos on top of a metered fare and is not subject to surge. Grab's surge multiplier was reported to reach 2.0x in rush hour and heavy rain, with one 2024 investigation finding a multiplier applied on essentially every ride at an average around 1.51x.

JoyRide states a no-surge policy since launch, with fares computed on a shortest-route basis. This makes it the natural reference point during a surge and means the comparison screen will often show it winning precisely when demand is high.

Motorcycle fares in Metro Manila were reported around a fifty peso base for the first two kilometres, with a typical five kilometre ride in the eighty to one hundred peso range across the three platforms. A same-route comparison put the three within roughly twenty pesos of each other.

Angkas offers a raincoat rental and an insurance upgrade as add-ons, and one report noted a payment-method difference of a few pesos between cash and wallet. Add-ons and payment-method deltas are both small in absolute terms and both visible to the user, which is why [../FLOWS.md](../FLOWS.md) puts them on the fare detail sheet rather than folding them into the headline number.

## What this says about the product

The fare gap between providers is often small, in the five to twenty peso range on a typical trip. If Rydar's value were purely finding the cheapest ride, it would be marginal.

The larger gaps are elsewhere. Availability differs sharply, and reporting repeatedly describes the actual commuter behavior as keeping several apps installed and checking fares and wait times before booking, switching when one has no driver. A no-surge provider and a surging provider can diverge substantially during rain or rush hour. And a metered tier versus a TNVS tier on the same trip can differ by more than either differs from its own competitors.

So the product is not really a cheapest-ride finder. It is a which-app-should-I-open answer, and that reframes what the comparison screen has to show. Demand signals, drivers nearby, and a provider's surge policy carry weight comparable to the price itself, which is why [../DOMAIN.md](../DOMAIN.md) models `DemandSignal` as richly as it does.

## Comparable aggregators

Two open-source projects were examined, both of which solved the same problem Rydar has.

**A multi-platform ride aggregator** covering Uber, Ola, Rapido, and inDrive in an Indian market context. Architecture is geolocation resolution, then parallel headless-browser scraping per provider, then normalization into a unified schema, then ranking by a user priority weighting, then a deep link for one-tap booking. Its stated limitations are exactly the ones Rydar should expect: scraping depends on page structure and selectors break, providers rate limit, surge detection is approximate, and the actual booking requires manual confirmation via the deep link.

**FairFare**, comparing Uber, Cabify, and DiDi in Buenos Aires. The author's account is the useful part. Uber was tractable because it has a web app, and served as the stable fallback. Cabify and DiDi had no web surface, so the author automated an Android emulator via Appium, describing it plainly as inelegant but working. Its resilience tooling is instructive: per-provider status, per-provider timeouts, and saved scraper artifacts for debugging.

The common shape across both is the one [../CONNECT.md](../CONNECT.md) adopts. Parallel per-provider fetch, per-provider failure status, normalization after the fetch rather than inside each adapter, and a deep link handoff instead of an in-app booking.

The common warning is equally clear. Neither project treats fare acquisition as solved, both expect breakage as the normal operating condition, and both keep a per-provider status surface because the user has to be told which provider failed. Rydar's typed `UnavailableReason` set is the same lesson, encoded in the model rather than in a status page.

## Not established

- Whether any of the five providers offers a fare API to third parties under any terms. Nothing found suggests yes.
- What each provider's terms of service say about automated access. Unexamined and the first blocking question in [../CONNECT.md](../CONNECT.md).
- Deep link schemes and prefill capability for any provider. Entirely unverified.
- Whether inDrive currently quotes an offer or a fixed fare, given the LTFRB suspension.
- Green GSM's exact service area, surge behavior, and whether it exposes seat-count tiers.

## Sources

- Expat Focus, Philippines taxis and ride-hailing services. Market structure, Grab dominance, inDrive relaunch and fare-negotiation suspension, taxi flag-down rate.
- Top Gear Philippines, motorcycle taxi apps guide. Same-route fare comparison across Angkas, JoyRide, and Move It. Angkas add-ons. Commuter multi-app behavior.
- Philippines Travel Guides, ride app comparison. Grab rate structure, surge findings, JoyRide no-surge policy and product range.
- Grab Philippines transport page and a third-party fare calculator. GrabCar, six-seater, and GrabTaxi tiers and rate components.
- NoypiGeeks, JoyRide Super Taxi versus Grab. JoyRide product range and same-route fare comparison.
- Manila Bulletin, Newsbytes PH, Autocar Philippines, and BusinessWorld. Green GSM launch, fleet, coverage, and operating model.
- GitHub, ashsweet/MultiPlatform_Ride_aggregator. Aggregator architecture and stated limitations.
- GitHub, ignaciolinari/FairFare. Per-provider acquisition approaches and resilience tooling.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Recorded market structure, the two pricing regimes, observed fare behavior, and two comparable aggregator architectures.
