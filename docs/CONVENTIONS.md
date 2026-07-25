---
doc: CONVENTIONS
status: active
version: 0.1.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---

# Documentation conventions

Every rule here is enforced by `node tools/check-docs.mjs`. If the checker and this file disagree, the checker wins and this file is the bug.

## Front matter

Every file in the doc map carries a YAML front matter block as the first bytes of the file.

```yaml
---
doc: DOMAIN
status: draft
version: 0.2.0
updated: 2026-07-26
owners: [rhohart-martel, vincent-perez]
---
```

Field meanings.

- `doc` is the stable identifier, upper snake case, unique across the repo. Renaming a file keeps the id so cross references and ADRs stay valid.
- `status` is one of `draft`, `active`, `superseded`, or `stub`. `draft` means the content is real but still moving. `stub` means the file exists to hold a slot and has no usable content yet. `superseded` requires a link to the replacement in the body.
- `version` is semver against the document, not the app. Patch for a typo or clarification, minor for new sections or changed guidance, major for a rewrite that invalidates prior decisions.
- `updated` is an ISO date, `YYYY-MM-DD`, matching the newest changelog entry.
- `owners` is a non-empty list of handles.

## Changelog section

Every doc ends with a `## Changelog` section. One line per change, newest first, dated, naming what changed and not just that something did.

```markdown
## Changelog

- 2026-07-26 `0.1.0` Initial version. Named the eight core shapes and the planning state machine.
```

The newest entry's date must equal the `updated` field and its version must equal the `version` field.

## Placeholder values

Anything undecided is written as the literal token `TBD` with a short reason in parentheses. Never invent a value to fill a slot. This applies hardest to `DESIGN.md`, where a fabricated hex code would silently become the design system.

## Links

Cross-document links are relative markdown links, resolved from the file's own directory. The checker fails on any relative link whose target does not exist, which is what keeps a rename from quietly orphaning half the docs.

## Decision records

A choice that closes off alternatives goes in `docs/DECISIONS/` as a numbered ADR from [_templates/adr.md](_templates/adr.md). Prose in a spec describes the current state. An ADR explains why the alternatives lost. Do not put rationale only in a spec, because the next reader cannot tell a considered choice from an accident.

## Module placeholder READMEs

The one-line `README.md` inside `core/`, `platform/`, `app/`, and `tools/` are signposts, not docs. They carry no front matter and are excluded from the doc map. They exist so the module boundary is visible before any code lands.

## Changelog

- 2026-07-26 `0.1.0` Initial version. Defined front matter fields, changelog format, the `TBD` rule, and link checking.
