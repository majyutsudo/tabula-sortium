# TABULA SORTIUM — storage format v1

Status: development baseline (branch `cleanup/schema-v1`). Application version and stored-data schema version are independent.

## Storage locations

| Storage | Key / format | Meaning |
| --- | --- | --- |
| Browser workspace | `tabula_sortium_v01` | `{schemaVersion: 1, settings, state, customIds, recipes, recipeId}` |
| Reading history | `tabula_sortium_history_v034` | Array of reading snapshots |
| User-defined spreads | `tabula_sortium_spread_library_v1` | Array of spread definitions (including `cardSize`) |
| Card-size preference | `tabula_card_size_v2` | Numeric UI preference |
| JSON export | `format: "tabula-sortium", version: 1` | `kind: "reading"` or `"backup"` |
| JSON backup workspace | `workspace.schemaVersion: 1` | Same workspace object as local storage |

The old-looking browser key names above are **active** and are deliberately retained, so users' existing current data remain reachable. They are not evidence that the data itself uses an obsolete format.

## Compatibility policy

- Legacy parameter migrations for the former palette order, `cardDesign: "tabula"`, `tabula_card_size_v1`, and retired shuffle IDs are removed.
- Existing browser workspaces without `schemaVersion` remain readable during the development transition and are written back with version 1 at the next normal save.
- An explicit unsupported workspace schema version is rejected rather than silently converted.
- JSON export's existing top-level `version: 1` is retained. Current imports permit `workspace.schemaVersion` to be absent to avoid breaking previously exported current-format backups.
- No migration from unsupported historic schemas is promised.

## Preserve on round trip

A backup must preserve deck order, drawn/removed cards, card IDs and reversal flags, slot assignment, coordinates, angles, face-up state, card size, spread library with position names and card sizes, shuffle recipes, snapshots, selected card pool, candles, visual effects and other currently supported settings.

A standalone reading export is imported into the reading history; it does not replace the current table. A full backup import replaces the workspace after confirmation.

## Verification still required

Static syntax and source-contract checks are not a substitute for browser-level tests. Before merging into `main`, test with isolated browser profiles: local save/reload, backup export/import, reading import, custom spread/card size, invalid JSON, out-of-capacity storage, and reset actions. Check that the existing live `main` site is unaffected.

## Scope of this change

The development branch removes **compatibility-only conversion paths**; it does not split the monolithic app into modules, redesign reset behavior, or change reading validation. Those should be separate reviewed changes.
