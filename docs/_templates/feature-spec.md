---
doc: FEATURE_NAME
status: draft
version: 0.1.0
updated: YYYY-MM-DD
owners: [rhohart-martel, vincent-perez]
---

# Feature name

## Why

The user problem, in the language of a person who has it. Which persona from `PRODUCT.md`, and what they do today instead.

## Data shape first

Name the shapes before any screen. New records and unions, or the existing ones from `docs/DOMAIN.md` this feature reads and writes. If it introduces state, say how `PlanningState` extends rather than what flag sits beside it.

State plainly whether this changes the domain model. If it does, `docs/DOMAIN.md` is part of this change.

## Behavior

What each surface shows and what every input does. Reference the sheet system and the existing surfaces in `docs/FLOWS.md` rather than restating them.

## Failure and empty states

Every way this can fail, what the user sees, and what they can do about it. A provider failure maps to an `UnavailableReason`. A feature spec with no failure section is not finished, because the failure paths are where a comparison app earns or loses trust.

## Map and motion impact

Whether this changes camera behavior, adds a state to the lookup table in `docs/MAP.md`, or changes sheet occlusion. Say none if none.

## Design impact

Which roles and components from `DESIGN.md` this uses. Any new component structure. Any token that does not exist yet, named as `TBD` rather than chosen here.

## Out of scope

What this feature deliberately does not do, especially anything a reader would reasonably assume it does.

## Verification

How anyone confirms this works, on the real surface. Which unit tests cover the pure logic, and what has to be looked at on a device.

## Open questions

What is unresolved, and what each one blocks.

## Changelog

- YYYY-MM-DD `0.1.0` Initial version.
