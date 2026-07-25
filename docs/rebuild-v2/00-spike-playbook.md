# RYDAR v2 — Provider API Feasibility Spike Playbook

> **Purpose:** Prove that ONE provider's *login → fare-quote* flow can be captured on a research device and replayed from your own code — **before** you invest in the full rebuild. This is the go/no-go gate for the entire "real prices" premise.

> **Scope note:** This is a personal project. Everything below is done with **your own account**, on **your own device**, at **manual, human-scale volume**. Do not automate at scale, do not share captured tokens, do not resell data. You are still violating each provider's Terms of Service by replaying their private API — accept that this is a personal-use gray area and keep the blast radius to your own account.

---

## 0. The single question this spike answers

> **Can I obtain a session token for provider X and use it — from a plain HTTP client that is not the official app — to fetch a real fare quote for a pickup/dropoff pair?**

If **yes** → `LiveApiFareSource` is buildable for that provider.
If **no** → that provider stays **estimate-only** (your existing fare engine), and you've spent 2 days instead of 6 weeks finding out.

---

## 1. Success criteria (what "done" looks like)

A standalone `spike.py` (Python `requests`, run on your PC — **not** the app) that:

1. Authenticates as you (or reuses a token you captured), and
2. Sends a quote request for a hardcoded NCR pickup/dropoff, and
3. Prints a **real peso fare** that matches what the official app shows for the same trip (±0, it should be identical).

That's the proof. If `spike.py` can do it, native Kotlin can do it.

---

## 2. Pick the target — weakest provider first

Do **not** start with Grab. Sequence by expected difficulty (easiest → hardest):

| Order | Provider | Package | Why this order |
|------:|----------|---------|----------------|
| 1 | **Move It** | `com.moveit.app.customer` | Smallest eng team; Move It fares are the public TWG matrix anyway, so even a partial capture is low-risk to validate against. |
| 2 | **JoyRide** | `com.joyride.rider` | Mid-size; you already have a field anchor (PITX→One Ayala 12.3 km → ₱169) to sanity-check the captured number. |
| 3 | **Angkas** | `com.angkas.customer` / `com.angkas.passenger` | Larger, more mature; expect more defenses. |
| 4 | **Grab** | `com.grabtaxi.passenger` | Heaviest anti-bot, request signing, and attestation. Assume hardest; treat success as a bonus. |

**Prove the pattern on Move It or JoyRide. Only then attempt Grab.**

---

## 3. Research environment (rooted phone)

You chose a rooted spare phone — the right call. This lets you defeat certificate pinning and read the real app's exact traffic.

### 3.1 Device
- A spare Android phone rooted with **Magisk** (any recent Magisk). arm64 device preferred.
- Sign in to the provider app **with your real account** and confirm it works normally first.

### 3.2 PC tooling
```bash
pip install frida-tools objection mitmproxy httpx
# jadx (decompiler): https://github.com/skylot/jadx  (jadx-gui is easiest)
# apktool (resources/smali): https://apktool.org
# Optional but very nice: HTTP Toolkit (https://httptoolkit.com) — automates
# Frida-based Android interception so you can often skip the manual proxy setup.
```

### 3.3 Frida on the device
```bash
# 1. Find device arch
adb shell getprop ro.product.cpu.abi          # e.g. arm64-v8a

# 2. Download matching frida-server from github.com/frida/frida/releases
adb push frida-server-XX.X.X-android-arm64 /data/local/tmp/frida-server
adb shell "su -c 'chmod 755 /data/local/tmp/frida-server'"
adb shell "su -c '/data/local/tmp/frida-server &'"

# 3. Verify from PC
frida-ps -U | head            # should list running processes
```

### 3.4 Defeat certificate pinning (pick ONE)

**Option A — objection (easiest):**
```bash
objection -g com.moveit.app.customer explore
# then inside the objection shell:
android sslpinning disable
```

**Option B — Frida unpinning script:**
```bash
# Use a maintained universal unpinning script (search "frida-android-unpinning HTTPToolkit")
frida -U -f com.moveit.app.customer -l unpinning.js
```

**Option C — HTTP Toolkit:** click "Android device via Frida," pick the app. It injects the unpin + proxy automatically. For most apps this is the fastest path.

### 3.5 Point the phone at your proxy
- Start `mitmweb` (or Burp / HTTP Toolkit) on your PC, note `PC_IP:8080`.
- On the phone Wi-Fi, set manual proxy `PC_IP:8080`.
- If an app still refuses to connect after unpinning, it may also pin at the native layer — note that as a **difficulty signal** (see §6).

---

## 4. Capture procedure

Do this slowly and deliberately, capturing each stage separately so you can tell auth traffic from quote traffic.

1. **Clean slate:** in the provider app, **log out** and clear app data (`adb shell pm clear com.moveit.app.customer`). Start your proxy capture.
2. **Capture the login handshake:** log in normally (phone number → OTP, or email/password). Watch for:
   - the endpoint that accepts credentials / OTP
   - the response that returns a **token** (bearer / JWT / session cookie / refresh token)
   - any **device registration** call that happens before or during login
3. **Capture the quote:** set a **pickup and dropoff** in NCR (use PITX→One Ayala so you can check JoyRide against your ₱169 anchor). Watch for:
   - the endpoint that returns the **fare/price**
   - whether it's a simple "estimate fare" call or a "create booking draft" call that happens to include a price
4. **Save everything:** export the relevant flows (mitmproxy: press `w`). For each interesting request record: full URL, method, **all headers**, request body, response body.

---

## 5. The four feasibility gates

For your target provider, answer these four. They decide everything.

### Gate 1 — Auth model: how is the token minted?
- OTP-by-SMS, password, OAuth, social login?
- Is the token **device-bound** (tied to a device ID / registration call)?
- **Recommendation:** OTP is fine (user logs in through Rydar's in-app WebView/form once; you keep the token). Device-bound tokens are workable *if* you can reproduce the device-registration call.

### Gate 2 — Token reusability (THE core test)
Take the captured token and replay the quote request from `spike.py` on your PC:
```python
import httpx
BASE = "https://<captured-host>"
TOKEN = "<captured token>"
r = httpx.post(f"{BASE}/<captured quote path>",
    headers={"Authorization": f"Bearer {TOKEN}", "User-Agent": "<copy app UA>"},
    json={ ... exact captured body with your pickup/dropoff ... })
print(r.status_code, r.text)
```
- **200 + real fare** → 🟢 you're basically done proving it.
- **401/403** → the token alone isn't enough → check Gates 3 and 4.

### Gate 3 — Request signing
Look for a header like `X-Signature`, `X-Sig`, `X-MSGID`, `hmac`, or a body field that looks like a hash.
- If present, find where the secret comes from:
  - **Static secret in the APK** → decompile with `jadx-gui`, search for the header name / `Hmac` / `sha256` / `secret`. If it's a hardcoded key, you can reproduce the signature. 🟡→🟢
  - **Dynamically derived** (per-session, native lib, obfuscated) → you'll need to **hook the signing function with Frida** and call it, or port the native lib. Hard. 🟡→🔴
- **Recommendation:** if signing is static, reproduce it. If it's a native `.so` with obfuscation, time-box hard — this is where projects die.

### Gate 4 — Attestation (the usual killer)
Look for **Play Integrity** / (legacy) **SafetyNet** tokens, or headers like `X-Integrity`, `X-Attestation`, `X-Play-Integrity`.
- If the **quote** endpoint requires a valid integrity token, you **cannot** mint one off-device from `spike.py` — it's cryptographically tied to Google + the app signature.
- Two escape hatches:
  1. The token may only be required at **login/registration**, not on every quote — then capture once, reuse the session. 🟡
  2. On the **shipped** app, calls originate from the real device, so genuine Play Integrity can pass — but your `spike.py` proof won't. In that case, prove it instead with an **on-device Frida hook** that calls the app's own quote function and logs the result. 🟡
- If attestation gates every quote **and** is device+app-signature bound with no reuse window → 🔴 **estimate-only** for that provider.

---

## 6. Decision matrix (per provider)

| Result | Meaning | Rebuild action |
|--------|---------|----------------|
| 🟢 **Green** | Token replays from non-app client; signing reproducible or absent; no per-call attestation | Build `LiveApiFareSource` adapter for this provider |
| 🟡 **Yellow** | Works only on-device / needs a captured session reused / signing is fiddly but doable | Build adapter but **on-device only**, expect breakage; keep estimate fallback hot |
| 🔴 **Red** | Per-quote attestation or unreproducible native signing | **Estimate-only.** Do not sink time here. Revisit if they loosen defenses |

**Rule:** you only need **one 🟢** to justify the rebuild architecture. Each additional provider is incremental.

---

## 7. If dynamic capture is blocked — static fallback (jadx)

If an app defeats your proxy even after unpinning (native pinning, root/Frida detection):

1. Pull the APK: `adb shell pm path com.x.y` → `adb pull <path>`.
2. Open in **jadx-gui**. Search for:
   - the base URL / Retrofit `@POST`/`@GET` interfaces → endpoints
   - `Authorization`, `Bearer`, header-builder classes → auth shape
   - `Hmac`, `sign`, `signature`, `secret`, `MessageDigest` → signing
   - `Integrity`, `SafetyNet`, `attest` → attestation
3. You can often reconstruct the whole contract from code without ever seeing live traffic. Slower, but root/anti-Frida defenses don't stop static analysis.

---

## 8. Time-box & output

- **≤ 2–3 focused days per provider.** If a provider isn't 🟢/🟡 by then, mark it 🔴 and move on.
- **Do Move It or JoyRide first.** Getting one green unblocks the rebuild; you don't need all four before starting.

### Per-provider capture report (fill one out for each)
```
Provider:            Move It
Package:             com.moveit.app.customer
Auth endpoint:       POST https://.../login  (OTP)
Token type:          JWT bearer, ~24h expiry, NOT device-bound
Quote endpoint:      POST https://.../fare/estimate
Required headers:    Authorization, User-Agent, X-App-Version
Signing:             none observed
Attestation:         none on quote endpoint
Replay from spike.py: 200 OK, returned ₱168 for PITX→One Ayala
Verdict:             🟢 GREEN — build adapter
Notes:               token refresh flow at POST /token/refresh
```

Keep these reports in `docs/rebuild-v2/spikes/`. They become the spec for each provider adapter in the rebuild.

---

## 9. What feeds the rebuild

Every 🟢/🟡 capture report maps directly onto a `ProviderClient` adapter in the architecture doc (`01-tech-stack-and-architecture.md` §6). The report's *auth endpoint*, *quote endpoint*, *headers*, and *signing notes* are literally the adapter's implementation checklist.
