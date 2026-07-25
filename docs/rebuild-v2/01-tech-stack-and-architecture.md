# RYDAR v2 — Tech Stack Reassessment & Rebuild Architecture

> **Mandate:** reassess the stack from scratch, **not biased toward the current Flutter codebase**, for an Android-first rebuild that fetches **real** fares by replaying reverse-engineered provider APIs (with on-device token capture) instead of estimating them. iOS ships later as a **separate Swift repo**.

---

## 1. Recommendation up front (TL;DR)

| Decision | Verdict |
|----------|---------|
| **UI + app framework** | **Native Android — Kotlin + Jetpack Compose (Material 3)** |
| **Why not Flutter/RN** | Their only advantage is one shared UI codebase across iOS+Android. You've already chosen a **separate native Swift** iOS app, so that advantage is *pre-spent*. What's left is a native problem (WebView token capture, crypto, attestation, Keystore) that native Kotlin does best and lightest. |
| **Where the price logic runs** | **On-device** capture + replay. Genuine device = genuine attestation, and no token honeypot on a server. |
| **Price source design** | `FareSource` interface with two impls: `EstimationFareSource` (port your v1 engine, works day one) and `LiveApiFareSource` (per-provider adapters, gated by the spike). |
| **Backend** | Keep **Supabase** for boring sync only (saved places, history, prefs, provider kill-switches). **Never** store tokens or proxy provider calls through it. |
| **The RAM problem** | Largely a **misdiagnosis**. The hog is Gradle + Android Studio + the emulator — all of which native Android *also* uses. Fixes in §8 help *any* stack; native is lighter than Flutter/RN at the margin but won't make Gradle disappear. |
| **iOS later** | Keep `domain` + `data` as pure-Kotlin, Android-free modules so they can become a **Kotlin Multiplatform** shared layer later *if* re-writing the provider logic in Swift proves painful. Don't adopt KMP for the MVP. |

**Net:** Kotlin/Compose, on-device, adapter-per-provider, estimation fallback, Supabase for sync. Score table and reasoning below.

---

## 2. Context recap (what we're changing)

**v1 (current):** Flutter/Dart, Riverpod, `flutter_map`/OSM, Supabase, `geolocator`, `url_launcher`. Core premise = *on-device fare **estimation*** from a bundled 98-row calibration dataset; a hard "Independence Principle" of **no provider APIs, no scraping, no tokens**. Providers: Angkas, JoyRide, Move It (moto only, NCR only). Handoff = deep-link into the real app.

**v2 (target):** invert the premise. Fetch **real** fares by capturing each provider's session token (in-app login) and replaying their quote endpoint on demand (only when the user sets pickup+dropoff). Rebuild UI, drop the estimation engine to a **fallback**, and re-pick the stack. Providers: all of them, Grab included, sequenced by difficulty.

This is no longer a thesis with graded "independence"; it's a personal price-unifier. See `00-spike-playbook.md` for the go/no-go gate that must pass before the expensive parts of this rebuild.

---

## 3. Unbiased stack reassessment

### 3.1 What actually makes this app hard
The UI is the easy 80%. The hard 20% — and therefore the thing the stack must optimize for — is:

1. **In-app login + token capture** (WebView request interception, cookie extraction, or native replay of the auth flow).
2. **Request replay with fidelity** (exact headers, per-provider OkHttp clients, cookie jars, retries).
3. **Crypto** (reproducing HMAC request signing).
4. **Attestation reality** (Play Integrity lives at the native/Google layer).
5. **Secure on-device secrets** (Android Keystore).

Every one of those is *native Android work in every framework*. Flutter and React Native don't remove it — they wrap it in platform channels / native modules and add a second runtime on top.

### 3.2 Decision criteria (weighted)

| # | Criterion | Weight | Why it matters here |
|---|-----------|-------:|---------------------|
| 1 | Native interception + crypto/attestation control | 25% | The core hard problem |
| 2 | Dev-loop RAM footprint | 20% | Your stated pain (low-RAM PCs) |
| 3 | Fit with "iOS = separate Swift repo" | 15% | Kills the cross-platform argument |
| 4 | Secure on-device token handling | 10% | Keystore, encrypted storage |
| 5 | Multi-provider maintainability | 10% | Adapters for N providers |
| 6 | UI iteration speed | 10% | Screen-building velocity |
| 7 | Reuse from v1 + ecosystem | 10% | Salvage value |

### 3.3 Scoring (1 = poor, 5 = excellent)

| Criterion (weight) | Flutter | React Native | **Native Kotlin** | KMP* |
|---|:---:|:---:|:---:|:---:|
| Interception/crypto/attestation (25) | 3 | 2 | **5** | 5 |
| Dev-loop RAM (20) | 2 | 2 | **4** | 3 |
| Fit w/ separate Swift iOS (15) | 2 | 2 | **5** | 5 |
| Secure token handling (10) | 3 | 3 | **5** | 5 |
| Multi-provider maintainability (10) | 4 | 4 | **4** | 4 |
| UI iteration speed (10) | 4 | 5 | **3** | 3 |
| Reuse from v1 + ecosystem (10) | 5 | 2 | **3** | 3 |
| **Weighted total /5** | **3.05** | **2.60** | **4.30** | **4.10** |

\* KMP = Kotlin Multiplatform. Scores as the strongest *future* option once iOS is real, but adds build complexity you don't want in the MVP.

### 3.4 Verdict
**Native Android — Kotlin + Jetpack Compose.** It wins the two heaviest criteria (native control 25%, RAM 20%) outright, and the iOS-split decision (15%) turns Flutter/RN's headline strength into dead weight. React Native scores worst *for this app* precisely because its fast-UI/JS advantage doesn't touch the hard native 20%, and it stacks a Node/Metro runtime on top of the Gradle build you're already struggling to fit in RAM.

**React Native would only become the answer if all three flip:** (a) you reverse the iOS decision and want one shared RN codebase, (b) the spike shows providers need only a plain bearer token (no signing/attestation), and (c) you already have a React/JS team. Absent those, Kotlin.

### 3.5 The RAM claim, examined honestly
> "Flutter seems heavy in RAM on our computers."

The measured pain in your own repo is **Gradle** (`org.gradle.jvmargs` capped at 2 GB, README telling you to `./gradlew --stop` to free memory) — not the Flutter framework. Android Studio + a running emulator each cost 1–4 GB. **A native Kotlin project uses the same Gradle, the same Android Studio, the same emulator.** So:

- Switching to Kotlin gives a **real but modest** win: you drop the Dart VM, Flutter DevTools, and the Flutter engine from the dev loop. RN would *add* Node+Metro instead.
- The **big** wins are environmental and available today (see §8): lighter IDE, physical device instead of emulator, Gradle tuning, no `kapt`.

Don't rebuild *for* RAM. Rebuild for the real-price mechanism; treat the RAM improvement as a welcome side effect and capture most of it via §8 regardless.

---

## 4. Recommended stack, layer by layer

| Concern | Choice | Notes |
|---------|--------|-------|
| Language | **Kotlin** | — |
| UI | **Jetpack Compose + Material 3** | Matches your dark-theme design; less boilerplate than XML |
| Async | **Coroutines + Flow / StateFlow** | Parallel provider fetches via `async`/`awaitAll` |
| DI | **Koin** (not Hilt) | No annotation processing → lighter, faster builds on low-RAM machines. Hilt's `kapt`/`ksp` is a real build-time cost |
| Networking | **OkHttp + Retrofit + kotlinx.serialization** | OkHttp is non-negotiable: per-provider clients, `Interceptor` for auth headers/signing, `CookieJar` for session capture |
| In-app login capture | **`androidx.webkit` WebView** (`shouldInterceptRequest`, `CookieManager`, `evaluateJavascript`) **or** native replay of the auth endpoints via OkHttp | Two `AuthStrategy` impls — WebView for web logins, native for app-only OTP flows |
| Secure token storage | **Android Keystore-backed encryption** (Tink, or `EncryptedSharedPreferences`/DataStore with a Keystore key) | Tokens **encrypted at rest**, never plaintext, never leave device. Note `androidx.security-crypto` is in maintenance — Tink or a Keystore-wrapped DataStore is the durable choice |
| Local persistence | **Room** (history, saved-places cache) + **DataStore** (prefs, feature flags) | — |
| Maps | **MapLibre GL Native (Android)** with OSM/MapTiler tiles | Vector, free, matches your Carto-Voyager look. **osmdroid** is the lighter raster fallback if MapLibre feels heavy |
| Routing / geocoding | **OSRM** (self-host or public) + **Nominatim**, haversine fallback | Demoted to *map polyline + address search only* — real billed distance now comes from the provider's quote response |
| Location | **FusedLocationProvider** (Play Services) | Standard, battery-friendly |
| Backend / sync | **Supabase** via `supabase-kt` (postgrest + auth) | Reuse existing schema; sync only. **No tokens, no provider proxying** |
| Handoff | Port your existing **Kotlin `MainActivity`** package-detection + launch logic | Already native — direct lift |
| Build | Gradle + **version catalogs**, **ksp** over kapt, config cache on | See §8 |

---

## 5. Target architecture

Clean-ish MVVM with a hard seam at `FareSource` so the risky part is swappable and the app is fully functional on estimates from day one.

```
┌─────────────────────────────────────────────────────────────┐
│ presentation  (Jetpack Compose + ViewModels / StateFlow)     │
│   Home · RouteEntry · Searching · Comparison · SavedPlaces    │
└───────────────┬─────────────────────────────────────────────┘
                │ calls use cases
┌───────────────▼─────────────────────────────────────────────┐
│ domain   (PURE KOTLIN — no Android imports → KMP-ready)      │
│   models: RouteRequest, ProviderQuote, LocationPoint, Money  │
│   GetQuotesUseCase                                           │
│   interface FareSource { suspend fun quotes(req): Flow<...> } │
│   interface ProviderClient { … }                             │
└───────────────┬─────────────────────────────────────────────┘
                │ implemented by
┌───────────────▼─────────────────────────────────────────────┐
│ data                                                        │
│                                                             │
│   EstimationFareSource ──► ported v1 fare engine + JSON     │
│                                                             │
│   LiveApiFareSource ──► ProviderRegistry                    │
│        ├─ MoveItClient   ┐                                  │
│        ├─ JoyRideClient  ├─ each: AuthStrategy + QuoteApi   │
│        ├─ AngkasClient   │   + optional Signer              │
│        └─ GrabClient     ┘                                  │
│                                                             │
│   SessionManager ──► TokenStore (Keystore-encrypted)        │
│   SyncRepository ──► Supabase (places/history/flags)        │
│   RoutingRepository ──► OSRM/Nominatim (map + address only) │
└─────────────────────────────────────────────────────────────┘
```

### 5.1 The core seam
```kotlin
// domain — pure Kotlin
data class RouteRequest(val pickup: LatLng, val dropoff: LatLng, val vehicle: VehicleType)
data class ProviderQuote(
    val provider: ProviderId,
    val fare: Money?,            // null when unavailable
    val source: QuoteSource,     // LIVE or ESTIMATE
    val etaMinutes: Int? = null,
    val confidence: Confidence,
)

interface FareSource {
    fun quotes(req: RouteRequest): Flow<ProviderQuote>   // emits progressively
}
```

### 5.2 Live source merges with fallback
`GetQuotesUseCase` asks `LiveApiFareSource` first; for any provider that errors, is disabled by the kill-switch, or times out, it emits the `EstimationFareSource` result tagged `source = ESTIMATE`. The comparison UI shows cheapest-first **as quotes land**, with a small badge distinguishing **live** from **estimate**.

```kotlin
class GetQuotesUseCase(
    private val live: LiveApiFareSource,
    private val estimate: EstimationFareSource,
    private val flags: ProviderFlags,
) {
    fun run(req: RouteRequest): Flow<ProviderQuote> = channelFlow {
        for (p in flags.enabledProviders()) launch {
            val q = runCatching { live.quote(p, req) }.getOrNull()
            send(q ?: estimate.quote(p, req))     // graceful degradation
        }
    }
}
```

---

## 6. Provider integration layer (the part that must scale to "all providers")

One **adapter per provider**, all behind a common interface, discovered through a registry. Adding a provider = adding one adapter; nothing else changes.

```kotlin
enum class ProviderId { MOVE_IT, JOYRIDE, ANGKAS, GRAB }

interface ProviderClient {
    val id: ProviderId
    val auth: AuthStrategy               // how we get/refresh a session
    suspend fun quote(req: RouteRequest): ProviderQuote
}

sealed interface AuthStrategy {
    class WebViewLogin(val loginUrl: String, val tokenRule: TokenExtraction) : AuthStrategy
    class NativeOtp(val endpoints: OtpEndpoints) : AuthStrategy
}
```

Each adapter is built **directly from its spike capture report** (`00-spike-playbook.md` §8): the auth endpoint, quote endpoint, required headers, and signing notes are the implementation checklist.

### 6.1 Token capture flow (in-app login)
1. User taps **Connect Move It**.
2. `AuthStrategy` runs — either a WebView loads the provider login and `shouldInterceptRequest`/`CookieManager` lifts the token from the auth response, **or** a native form drives the captured OTP endpoints via OkHttp.
3. Token is **encrypted (Keystore)** and stored by `TokenStore`; only ever read on-device.
4. `quote()` attaches the token (and any reproduced signature) via an OkHttp `Interceptor`.
5. On `401`, `SessionManager` refreshes or re-prompts login.

### 6.2 Resilience — because providers *will* break your captures
- **Remote kill-switch:** a Supabase table `provider_flags(provider, enabled, min_app_version)`. Flip `enabled=false` to instantly demote a broken provider to estimate-only **without shipping an app update**.
- **Fallback everywhere:** any live failure silently falls back to `EstimationFareSource`. The user always sees a number.
- **Per-provider health telemetry** (local-first): track live-success rate so you know which adapter needs attention.

---

## 7. iOS later (separate Swift repo) — keep the door open cheaply

You've chosen native Swift/SwiftUI for iOS in a different repo — reasonable. The risk is **re-implementing the hard provider logic twice** (Kotlin now, Swift later).

**Recommendation:** enforce that `domain/` and the provider-client contracts are **pure Kotlin with zero Android imports**. That costs nothing now and means that *if* the Swift re-write of the provider logic proves painful, you can lift those modules into a **Kotlin Multiplatform** shared library consumed by both the Android app and the Swift app (native UIs on each side). Adopt KMP **only if/when that pain is real** — not for the MVP. This gives you Flutter-style logic reuse for the *hard* layer without Flutter's weight or a shared UI.

---

## 8. Low-RAM dev environment playbook (do this no matter the stack)

1. **Ditch Android Studio for daily work** → IntelliJ IDEA Community Edition, or VS Code + Kotlin/Gradle extensions. Build via **Gradle CLI**. (Keep Android Studio around only for the layout inspector/profiler when you actually need it.)
2. **Physical device, never the emulator.** The AVD is often the single biggest RAM consumer (1–4 GB). You already test on a real device.
3. **Tune Gradle** in `gradle.properties`:
   ```properties
   org.gradle.jvmargs=-Xmx1536m -XX:+UseParallelGC
   org.gradle.workers.max=2
   org.gradle.parallel=false
   org.gradle.caching=true
   org.gradle.configuration-cache=true
   ```
4. **Avoid `kapt`.** Use **Koin** (no codegen) for DI and **ksp** (not kapt) if you ever need codegen. kapt is a major memory/time sink.
5. **`./gradlew --stop`** between heavy builds (you already do this) — frees the daemon's heap.
6. **Keep the module graph small** early; add modules only when they pay for themselves.

Expected result: a dev loop meaningfully lighter than your current Flutter+Gradle setup, and *far* lighter than React Native + Metro + Gradle.

---

## 9. Reuse map — what to salvage from v1

| Salvage | Item | How |
|--------|------|-----|
| ✅ Keep | **Supabase schema** (`profiles`, `saved_places`, `ride_activity` + RLS) | Language-agnostic; drive from `supabase-kt` |
| ✅ Keep | **Kotlin handoff / package-detection** (`MainActivity` logic, `<queries>`, URL schemes) | Direct lift into native app |
| ✅ Keep | **NCR data** (`places_ncr.json`, bounds, landmarks) + **reference dataset** + `field-samples/` | Seeds address search **and** the estimation fallback |
| ✅ Keep | **Estimation engine logic** (formula, calibration/time-adjustment JSON) | Port Dart→Kotlin as `EstimationFareSource` — your safety net |
| ✅ Keep | **UX flows & model shapes** (`ProviderQuote`, `LocationPoint`, comparison/searching flow) | Reuse as design spec; re-implement in Compose |
| ❌ Drop | Flutter/Dart UI, Riverpod, `flutter_map` | Replaced by Compose + MapLibre |
| ❌ Demote | Routing chain (GraphHopper/OSRM) **as a fare input** | Keep only for map polyline + address search |
| ❌ Delete | `lib/data/mock/`, `features/provider_booking/` (fake booking), `HandoffPayload.bookingToken` | Legacy; gone in v2 |

---

## 10. Phasing (maps to the FareSource seam)

| Phase | Deliverable | Depends on spike? |
|------:|-------------|:---:|
| **0** | **Spike** — prove one 🟢 provider (`00-spike-playbook.md`) | — (this IS the gate) |
| **1** | **Native shell on estimates** — Compose UI, MapLibre, Nominatim search, saved places, Supabase sync, ported handoff, `EstimationFareSource`. A fully working app with *zero* live APIs. | ❌ build now |
| **2** | **First `LiveApiFareSource`** — the 🟢 provider from the spike: `AuthStrategy` + token store + quote adapter, behind a flag. Live-vs-estimate badge in UI. | ✅ needs green |
| **3** | **Scale providers** — one adapter at a time; remote kill-switch; attempt Grab last. | ✅ per provider |
| **4** | **Polish + iOS prep** — extract `domain`/provider contracts into a KMP-ready module *if* pursuing shared logic with the Swift app. | — |

**The point of the seam:** Phase 1 is 100% mechanism-independent, so you (or whoever "tasked" the rebuild) can build the entire real app *in parallel* with the spike. If the spike comes back all 🔴, you still have a shipped, working, native price-comparison app on estimates — you've lost nothing.

---

## 11. Risks & honest caveats

- **Legal/ToS:** replaying private provider APIs violates their Terms even for personal use; PH statutes (RA 10175 Cybercrime, RA 10173 Data Privacy) are in play if scope ever widens. Keep it your account, your device, human-scale.
- **Grab specifically:** assume the hardest defenses (signing + Play Integrity). Plan for estimate-only and treat any live success as upside.
- **Fragility:** captures break when providers update. The kill-switch + estimation fallback are what keep the app usable through that churn — they are features, not nice-to-haves.
- **Token security is on you:** on-device, Keystore-encrypted, never synced. A leaked provider token is a real account-takeover risk.
- **Attestation may simply win** on some providers. That's fine — the architecture already treats "live" as best-effort over a reliable estimation floor.
```
