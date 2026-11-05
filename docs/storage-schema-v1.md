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

## Verification and release gate

Automated Node tests now cover schema contracts, catalog, card and shuffle rules, spread storage/geometry, reading-history deep copies and formatting. Playwright browser tests cover desktop/mobile basic operations, save/reload, JSON backup export/import, invalid JSON, reset, and reading-history save/restore. The full suite must be run against the latest development commit before merging.

Remaining manual checks before release: actual mouse/touch interactions for the spread editor, all shuffle/cut controls, card gallery and magnifier; custom spread creation/edit/cancel; independent reading JSON import; unavailable/limited localStorage; multiple browsers and screen sizes; and an export/import using a copy of a real existing user backup. Compare screenshots with the current production page and verify every image URL is valid.

Run the on-demand GitHub Actions workflow by labeling draft PR #1 `run-validation` (remove and re-add the label to run again). Workflow dispatch may require the workflow to exist on the default branch; on the working branch use the PR label. Review all failures before merging. `main` remains unchanged until the release is explicitly approved.

## Scope of this development branch

The branch removes **compatibility-only conversion paths**, extracts the existing CSS into `css/tabula.css`, and divides independent JavaScript functionality among `js/catalog.js`, `js/storage-format.js`, `js/spread-store.js`, `js/spread-geometry.js`, `js/card-rules.js`, `js/shuffle.js`, `js/reading-history.js` and `js/ui-format.js`. `js/tabula.js` still contains the tightly coupled user-interface, animation, and main application control flow. The `resetEverything` action now resets the remembered card size as well. An independent formatting module does not imply that all rendering has been modularized.

Do not rename active storage keys during release preparation. The application name/version and the schema version follow different version histories.
