---
doc: DESIGN
status: draft
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Rydar design system

## Status and how to read this

**No visual identity has been chosen.** Every color, font, radius, duration, and spacing value in this document is the literal token `TBD`. That is deliberate and it is enforced: `node tools/check-docs.mjs` fails if a color value appears in this file. An agent generating UI from this document must ask for the missing values rather than inventing them, because a fabricated value that ships once becomes the design system by accident.

What **is** locked is everything that does not need a palette to decide. Structure, hierarchy, which element carries which meaning, motion intent, touch targets, accessibility floors, and the list of things Rydar will not do. Those are product decisions, they follow from [PRODUCT.md](PRODUCT.md) and [docs/FLOWS.md](docs/FLOWS.md), and they hold regardless of what the app ends up looking like.

The reference screenshots in the project brief are UX references only. Their palette, their orange accent, and their type choices are not Rydar's and must not be copied forward.

## 1. Visual theme and atmosphere

Rydar's atmosphere target, in words, since words survive a palette change.

**Calm instrument over a living map.** The map moves, has color, and carries the user's attention. Everything Rydar draws on top of it is quiet, flat, and unmistakably a control surface. The app should feel like a well-made transit instrument, not a marketplace competing for a tap.

Calibration.

- **Density: 6 of 10.** Denser than a consumer marketing app, looser than a dashboard. A comparison screen holds five ride classes, each expandable to several providers with prices, distances, and demand notes. That is a lot of numbers, and they need to scan in a glance without becoming a spreadsheet.
- **Variance: 3 of 10.** Deliberately low. Sheet content is a vertical list of comparable rows, and comparable things must be laid out identically or the comparison stops working. Asymmetry is a virtue on a landing page and a defect on a price comparison.
- **Motion: 5 of 10.** Purposeful only. The route draw, the camera, sheet transitions, and quote rows settling as they arrive. Nothing loops, nothing pulses, nothing shimmers for atmosphere.

The design tension to resolve deliberately, every time. Rydar's chrome must be legible over an arbitrary map region, which can be dark water, bright commercial blocks, or dense labels. Surfaces are therefore opaque or heavily obscured, never lightly translucent, and no text is ever placed directly on the map without a surface behind it.

## 2. Color palette and roles

Values are `TBD`. The roles are not, and they are what an implementation must bind to. Never reference a raw color anywhere in the app; reference a role.

| Role | Purpose | Value |
| --- | --- | --- |
| `surface/sheet` | Bottom sheet background. Must fully obscure the map behind it | `TBD` |
| `surface/raised` | Rows and cards inside a sheet, one step above the sheet | `TBD` |
| `surface/sunken` | Grouped or inset regions such as a fare breakdown block | `TBD` |
| `surface/scrim` | Dim over the map behind a modal sheet | `TBD` |
| `text/primary` | Prices, place names, headings | `TBD` |
| `text/secondary` | Sublabels, distances, timestamps, metadata | `TBD` |
| `text/disabled` | Inert controls such as the reserved multi-stop affordance | `TBD` |
| `border/hairline` | Row separators and structural lines | `TBD` |
| `accent/primary` | The single accent. Primary action, active selection, focus ring | `TBD` |
| `accent/on-primary` | Content on top of the accent | `TBD` |
| `map/origin` | Origin pin and origin slot indicator | `TBD` |
| `map/destination` | Destination pin and destination slot indicator | `TBD` |
| `map/route` | Route line | `TBD` |
| `map/route-casing` | Contrast layer under the route line | `TBD` |
| `state/cheapest` | Marks the cheapest available quote in a class | `TBD` |
| `state/demand-elevated` | Elevated demand note | `TBD` |
| `state/demand-high` | High demand or surge note | `TBD` |
| `state/unavailable` | Provider row with no price | `TBD` |
| `state/stale` | Aging quote and its age stamp | `TBD` |
| `state/error` | Failure text and retry affordances | `TBD` |
| `state/success` | Connected confirmation | `TBD` |
| `state/destructive` | Disconnect action | `TBD` |

Constraints on whatever values get chosen.

- **One accent.** Exactly one. A comparison screen with two competing accents cannot signal which row is selected.
- **The accent must not read as a provider.** Every provider brings its own brand color into the interface, and if Rydar's accent resembles one of them the app looks like it is promoting that provider. This is a real constraint that rules out several otherwise reasonable choices.
- **`map/origin` and `map/destination` must be distinguishable to a colorblind user.** They also carry a shape difference, per the accessibility section, because color alone cannot be load-bearing.
- **Never pure black or pure white as a surface.** Both are harsh next to a map and both crush the elevation steps between sheet, row, and inset.
- **Demand and cheapest markers are not a traffic-light gradient.** Cheapest is a positive mark. Demand is a warning. They must not be confusable, and neither may be the only carrier of its meaning.
- **Accent saturation stays moderate.** A saturated accent next to a saturated map is visual noise.
- **Dark and light are both first-class.** Every role needs a value in both. The map has a matching style per theme, per [docs/MAP.md](docs/MAP.md).

## 3. Typography

Font families are `TBD`. Roles and rules are locked.

| Role | Used for | Family | Size | Weight |
| --- | --- | --- | --- | --- |
| `display` | Sheet titles such as Where to and Choose your ride | `TBD` | `TBD` | `TBD` |
| `title` | Section headings, provider name in detail | `TBD` | `TBD` | `TBD` |
| `body` | Place labels, provider names, descriptions | `TBD` | `TBD` | `TBD` |
| `caption` | Sublabels, distances, timestamps, freshness stamps | `TBD` | `TBD` | `TBD` |
| `price/primary` | The fare figure on a provider row | `TBD` | `TBD` | `TBD` |
| `price/span` | The low-to-high span on a collapsed class row | `TBD` | `TBD` | `TBD` |
| `label` | Buttons and chips | `TBD` | `TBD` | `TBD` |

Locked rules.

- **Fares use tabular figures.** Non-negotiable. Proportional digits make a vertical stack of prices ragged, and the entire product is a vertical stack of prices that must be scannable down the column.
- **Every numeric field that appears in a column uses tabular figures.** Distances, durations, ETAs.
- **Hierarchy comes from weight and color before size.** A sheet holding five classes and their providers cannot afford large type steps. Three sizes plus two weights plus two text roles is enough separation.
- **The peso sign is never smaller than its digits and never superscript.** It is part of the number.
- **No font smaller than the caption role,** whose minimum is `TBD` but is bounded by the accessibility floor below.
- **Banned.** Generic serifs anywhere. Any decorative or display face. `Inter`, because it is the default that makes every app look like every other app, and Rydar's numbers deserve a face chosen for its figures.
- **Selection criterion when the choice is made.** Judge candidates on their digits at small sizes first, in a stacked column, and on whether the currency sign sits well against them. Everything else is secondary.

## 4. Spacing and layout

Scale values are `TBD`. Structure is locked.

- A single spacing scale, geometric, `TBD` base unit. No arbitrary one-off values anywhere.
- One content inset for sheet edges, `TBD`, applied consistently so every row's text aligns down a single vertical line. Ragged left edges across rows destroy scannability.
- **Rows are the primitive.** Sheet content is a vertical stack of rows. Rows within a group are identical in height, inset, and internal alignment, because unequal rows read as unequal importance.
- **Comparable content aligns in columns.** Provider name left, fare right, at the same right edge in every row of the group. A user compares by moving their eye down a column, and any horizontal drift breaks it.
- Grouping is by hairline separator or spacing. Nested cards are banned; a card inside a card inside a sheet is three elevation steps to say one thing.
- Safe areas are respected on every edge. Sheet content never sits under a home indicator or a notch.
- The map layer always spans the full viewport, and camera math uses the visible region instead. See the padding contract in [docs/MAP.md](docs/MAP.md).

## 5. Elevation and depth

Exactly three levels over the map, and no more.

1. **Map.** The base. Never has a shadow.
2. **Sheet.** Above the map, with a top edge treatment that separates it from arbitrary map content. Treatment is `TBD` and must work over both a dark and a bright map region.
3. **Stacked sheet.** The provider fare detail over the Choose your ride sheet, the one stacked case in the app, with a scrim over the sheet beneath it.

Floating chrome, meaning the account, history, and recenter controls, sits at the sheet level and needs its own contrast treatment because it has map directly behind it rather than a sheet.

Rules. Shadows are diffuse and tinted toward the surface beneath, never a hard offset drop. Outer glows of any kind are banned. Depth is never used decoratively; if two elements are at different levels, that difference must mean something.

## 6. Component specs

Structure and behavior are locked. Every value is `TBD`.

**Bottom sheet.** Grab handle at the top center. Three detents of peek, half, and full, each sheet declaring which it supports. Content scrolls within the sheet; the sheet does not grow to fit content. An explicit close control on any sheet whose dismissal discards work. Corner radius `TBD`, applied to the top corners only.

**Location slot** (origin and destination in the Where to sheet). Leading indicator whose color and shape encode which endpoint it is. Primary label, secondary sublabel beneath. Trailing chevron when tappable. Empty state is a prompt in the secondary text role, never a greyed fake value.

**Class row, collapsed** (Choose your ride). Leading vehicle icon. Class name in the body role. Trip distance in the caption role. Fare span right-aligned in the `price/span` role. A demand note in the caption role when any provider in the class reports elevated demand. Expanding rotates a chevron and reveals provider rows beneath it, in place. The row remains visible and selected while expanded, because it is the header for what it revealed.

**Provider row.** Provider logo at a fixed size, never recolored. Provider name in the body role, its own tier label in the caption role. That provider's distance and duration in the caption role. Fare right-aligned in the `price/primary` role, rendered per its `FareShape`, which means an exact figure, a low-to-high range, or an explicitly labeled offer. A selection control on the leading edge. An info affordance opening the fare detail. Unavailable variant replaces the fare with the reason text and its action, and is visually recessed rather than hidden.

**Cheapest marker.** Marks the cheapest available quote in an expanded class. Carries both a color role and a text label, never color alone.

**Freshness and staleness.** A stale quote shows its age in the caption role next to the fare, plus a refresh affordance. Age is stated in plain words, not a raw timestamp.

**Primary button.** One per sheet, maximum. Accent fill, `accent/on-primary` content, full content width, radius `TBD`. Tactile press feedback of a small downward translate and a slight dim. No glow, no gradient. Disabled state is visibly inert and stays in the layout, so the user can see what completing the form unlocks. The handoff action, `Open in [provider]`, uses this and is the most important tap in the app.

**Destructive button.** Disconnect only. Uses `state/destructive`, requires a confirmation step.

**Search field.** Leading search icon, single-line input, trailing clear control when non-empty. Pinned within its sheet so it stays reachable at any scroll position. Focus ring in the accent role.

**Loading states.** Skeleton rows matching the exact geometry of the row they replace, in the sheet's own surface roles. Circular spinners are banned everywhere except the one place a determinate skeleton is impossible, which is the map's own tile loading, owned by the SDK. Quote rows skeleton and settle independently as each provider responds; the sheet never blocks on the slowest one.

**Empty states.** A composed state, not a bare line of text. Each names what will appear here and offers the action that produces it. The two history empty states are distinct: nothing recorded yet, versus nothing matching the active filter, and the filtered one names the filter and offers to clear it.

**Error and unavailable states.** Always inline, at the row that failed. Never a full-screen error and never a toast for something the user can act on. Each carries its reason and its action, from the unavailability table in [docs/FLOWS.md](docs/FLOWS.md).

**Provider logos.** Rendered as provided by each brand. Never recolored, never cropped to a different shape, never placed on the accent color, never reproduced below its own legibility floor. Each sits in a neutral container of a fixed size so a wide wordmark and a square icon occupy the same footprint and the rows stay aligned.

## 7. Motion and interaction

Values are `TBD`. Intent is locked.

- **Spring physics for anything the user's finger drives.** Sheets, expansion, selection. Duration-based easing for anything the system drives, meaning the camera and the route draw. A finger-driven element on a fixed duration feels detached from the finger.
- **Motion communicates causality, nothing else.** Every animation in Rydar answers one of two questions: where did this come from, or what just changed. Anything that answers neither is deleted.
- **Nothing loops.** No pulse, no shimmer, no float, no breathing. A price comparison screen with a perpetual animation on it is a screen the user cannot finish reading.
- **Sheet transitions.** A sheet replacing another sheet in the same flow slides and cross-fades as one movement, not out-then-in. A modal sheet rises over the map with a scrim.
- **Class expansion.** Height animates. Revealed provider rows stagger in with a small cascade delay, `TBD`, enough to read as sequence and short enough not to delay the last row perceptibly.
- **Quote arrival.** A settling row cross-fades from its skeleton in place. It never slides in and never reorders the list on arrival. Rows reordering under a reaching finger is the fastest way to make a user mistrust a comparison.
- **Selection.** Immediate, under sixteen milliseconds of perceived latency, no animation gate before the state reads as selected.
- **Route draw and camera.** Specified in [docs/MAP.md](docs/MAP.md). Distance-based progression, eased out, cancelled by any gesture.
- **Animate only compositor-friendly properties.** Transform and opacity. Never animate layout, width, height, or position that triggers reflow.
- **Reduced motion.** When the system asks for it, transitions become cross-fades, the camera cuts, the route appears complete, and staggers collapse to simultaneous. No information is lost, only the theater.

## 8. Accessibility floors

These are minimums, not aspirations, and they bound the token values chosen later.

- **Touch targets are at least 44 by 44 density-independent pixels,** including the info affordance on a provider row and the clear control in the search field. Cramming more rows onto a sheet does not justify a target under the floor.
- **Text contrast meets 4.5 to 1 for body and caption, 3 to 1 for large display text.** This is a hard bound on the `text/secondary` role, which is where an under-contrast value would otherwise slip in.
- **Color is never the only carrier.** Origin and destination differ in shape as well as color. Cheapest carries a label. Demand carries text. Unavailable carries its reason in words.
- **Text scales with the system setting.** Rows grow in height and reflow rather than truncating a price or a place name. A clipped fare is worse than a taller row.
- **Every control has an accessible label,** including map pins, the recenter control, and the info affordance.
- **The map has a non-visual equivalent.** Origin, destination, distance, and duration are all available as text in the trip header, so the map is never the only source of a fact.

## 9. Anti-patterns

Banned in Rydar. Each has a reason, because a ban without a reason gets argued with.

- **A fabricated color, font, or spacing value in this document.** The whole point of the `TBD` tokens.
- **Copying the reference screenshots' palette or accent.** They are UX references, not identity.
- **A second primary action on any sheet.** Ambiguity at the moment of the most important tap.
- **Reordering quote rows as they arrive.** Moves the target under the finger.
- **Showing a price Rydar did not receive,** including an average, an interpolation, or a placeholder figure.
- **Hiding an unavailable provider.** Absence tells the user nothing; a reason tells them what to do.
- **Flattening an offer or a range into a single figure.** Misrepresents how that provider prices.
- **Overwriting a provider's own distance with Rydar's.** They legitimately differ, and the difference is information.
- **Any perpetual animation.** Pulse, shimmer, float, breathing, bouncing chevrons.
- **A circular spinner where a skeleton is possible.**
- **Full-screen error or offline walls.** Bookmarks, recents, and history remain readable offline.
- **A toast for anything actionable.** It disappears before the user can act.
- **Nested cards.** Three elevation steps to say one thing.
- **Outer glows and neon accents.**
- **Pure black or pure white surfaces.**
- **Translucent chrome with text directly over the map.** Illegible over an arbitrary map region.
- **Recoloring a provider logo** to match Rydar's palette.
- **Emoji in product copy.**
- **Marketing verbs in interface copy.** No elevating, unleashing, or supercharging. The interface states facts about prices.
- **Filler instructional copy.** No swipe hints, no scroll prompts, no bouncing arrows.
- **Fake placeholder content in any built screen.** No sample fares, no invented provider names, no round-number statistics.
- **Locking map gestures during any animation.**
- **A confirmation prompt on return from a handoff.** Rydar cannot observe the booking and must not pretend to.

## 10. Filling in the tokens

When the identity session happens, this is the order that avoids rework.

1. Choose the map style first, both themes. Every surface and marker color has to survive against it, so it is the binding constraint and choosing it last would invalidate everything else.
2. Derive the surface and text roles from the map style's contrast needs.
3. Choose the accent, checked against all five provider brand colors for collision.
4. Choose the type family on the strength of its digits in a stacked column.
5. Set the spacing base and the radius from the row geometry the comparison sheet needs.
6. Set motion durations last, tuned on the target device rather than in a design tool.

Each step lands as an ADR in [docs/DECISIONS](docs/DECISIONS/README.md), because these are choices that close off alternatives, and a later reader needs to know what lost and why. This document then moves from `draft` to `active` and its version goes to `1.0.0`.

## Changelog

- 2026-07-26 `0.1.0` Initial scaffold. Locked atmosphere calibration, semantic color and type roles, component structure, motion intent, accessibility floors, and the anti-pattern list. All concrete values held at `TBD`.
