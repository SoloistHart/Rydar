---
doc: AGENTS
status: active
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Working in this repo

For humans and for agents. Read this before changing anything.

## What this repo currently is

A documentation and context layer for Rydar, with no application code yet. The tech stack, map SDK, and visual identity are all deliberately unchosen. Nearly every task here is either writing a spec, making a decision that closes off alternatives, or the first code that follows one.

## Read in this order

1. [README.md](README.md) for the doc map, which is authoritative.
2. [PRODUCT.md](PRODUCT.md) for what Rydar is and, more usefully, the six things it is not.
3. [docs/DOMAIN.md](docs/DOMAIN.md) for the vocabulary every other document uses.
4. Then whichever of [docs/FLOWS.md](docs/FLOWS.md), [docs/MAP.md](docs/MAP.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [DESIGN.md](DESIGN.md), [docs/PROVIDERS.md](docs/PROVIDERS.md), or [docs/CONNECT.md](docs/CONNECT.md) covers your task.
5. [docs/DECISIONS](docs/DECISIONS/README.md) to find out what has already been settled and why.

Do not skip step three. Every other spec is written in the vocabulary of the domain model, and reading them out of order produces changes that use the wrong words for the right things, which is how a model quietly drifts.

## The three rules that matter most

**Never invent a value that is marked `TBD`.** Colors, fonts, spacing, zoom levels, durations, deep link schemes, staleness windows. If a task needs one, the task is blocked on a decision, and the correct move is to say so rather than pick something plausible. A fabricated value that ships once becomes the standard by accident. This is enforced for colors in `DESIGN.md` by the doc checker and enforced everywhere else by review.

**Never fabricate a price.** Not an average across providers, not an interpolation, not a placeholder figure in a mockup. A provider with no price shows a reason, from the table in [docs/FLOWS.md](docs/FLOWS.md). This is the product's whole credibility and it is a one-line change away from being lost.

**Never let `core` import from `platform` or `app`.** The dependency rule in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). It has no mechanical enforcement yet, which means it currently depends on whoever is reviewing.

## Doc impact, on every change

A change is not done until the docs that describe it agree with it. Before finishing any task, walk this list and state what you touched and what you deliberately did not.

| If you changed | Update |
| --- | --- |
| A data shape, a state, or an invariant | [docs/DOMAIN.md](docs/DOMAIN.md) |
| Screen behavior, copy, or a failure state | [docs/FLOWS.md](docs/FLOWS.md) |
| Camera behavior, zoom, route rendering, or motion | [docs/MAP.md](docs/MAP.md) |
| A module, a port, or a dependency direction | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| A visual token, component structure, or a ban | [DESIGN.md](DESIGN.md) |
| A provider, a class mapping, or a handoff detail | [docs/PROVIDERS.md](docs/PROVIDERS.md) |
| The fare fetch contract or its failure taxonomy | [docs/CONNECT.md](docs/CONNECT.md) |
| Scope, a non-goal, or a feature's status | [PRODUCT.md](PRODUCT.md) |
| Anything that closed off an alternative | A new ADR in [docs/DECISIONS](docs/DECISIONS/README.md) |
| A milestone's contents or order | [docs/ROADMAP.md](docs/ROADMAP.md) |

Every touched doc needs its `version` bumped, its `updated` date set, and a `## Changelog` line describing what changed. The checker verifies those three agree. See [docs/CONVENTIONS.md](docs/CONVENTIONS.md).

Adding a new document means adding it to the doc map in `README.md` in the same change. The checker fails otherwise, which is intentional, since an unlisted document is one nobody reads.

## Decisions

A choice that closes off an alternative is an ADR, not a paragraph in a spec. Use [docs/_templates/adr.md](docs/_templates/adr.md) and add it to the [index](docs/DECISIONS/README.md).

The distinction is worth being precise about. A spec says what the system does now. An ADR says what else was possible and why it lost. A reader six months out cannot tell a considered choice from an accident unless the losing options are written down, and that reader is usually one of the two people who made the choice.

These are the pending decisions large enough to deserve an ADR when they land: the platform and language, the map SDK, the geocoding and routing providers, on-device versus server-side fare fetching, the visual identity token set, and the mechanism that enforces the `core` dependency rule.

## New features

Start from [docs/_templates/feature-spec.md](docs/_templates/feature-spec.md). Name the data shape before the screen. If the feature introduces state, extend the `PlanningState` machine rather than adding a flag beside it, since a boolean next to a state machine is how the machine stops being the truth.

## Checks

```
node tools/check-docs.mjs
```

Validates front matter on every mapped document, agreement between `version`, `updated`, and the newest changelog entry, that every relative link resolves, doc map parity in both directions, ADR index parity, and that no color value has appeared in `DESIGN.md`.

Run it before finishing any documentation change. It is the only automated check in the repo right now, so it does not get to be skipped.

## Commits

Small, one concern each, present tense, describing intent over mechanics. Reference an ADR when a commit implements a decision. Do not bundle a doc update with an unrelated change, since the doc update is the part a reviewer most needs to see clearly.

## Things to push back on

Say no to these rather than building them, and point at the reason.

- Booking, dispatch, payments, or driver tracking inside Rydar. Non-goals in [PRODUCT.md](PRODUCT.md), not a roadmap.
- A single blended fare figure across providers.
- Hiding a provider that failed, instead of stating why it failed.
- Reordering quote rows as they arrive.
- A second primary action on a sheet.
- Choosing a `TBD` value in passing to unblock yourself.
- A provider name in a conditional in feature code. That belongs in the registry.

Declining with a reason is the expected behavior here, not an escalation.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Established the reading order, the three hard rules, the doc impact table, and the push-back list.
