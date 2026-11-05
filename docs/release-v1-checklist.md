# TABULA SORTIUM — v1.0 release review

This is a development checklist, not a release announcement. Do not merge the draft PR into `main` until the owner approves publication. The currently published version is v0.9.95.

## Architecture reviewed

- [x] Separate HTML, CSS, and JavaScript assets while preserving script order.
- [x] Split card definitions and built-in spreads (`js/catalog.js`).
- [x] Extract pure operations: `card-rules.js`, `shuffle.js`, `spread-geometry.js`, and `ui-format.js`.
- [x] Extract storage helpers: `storage-format.js`, `spread-store.js`, `reading-history.js`.
- [x] Preserve active browser storage keys and JSON import/export formats.
- [x] Change `resetEverything` so the remembered card size is reset.
- [ ] Decide a version number and update the title/version only at release time.

## Automated verification

- [x] Add Node tests for pure helpers and storage contracts.
- [x] Expand CI's Node command to include every `tests/*.test.mjs` file.
- [x] Add Playwright coverage for reading-history round trip, workspace save/reload, JSON backup, bad JSON, reset actions, and mobile controls.
- [ ] Run the **latest** head of `cleanup/schema-v1` against GitHub Actions and confirm the whole job succeeds.
- [ ] Investigate or fix every failed test; do not interpret a previously passing run as validation for a newer commit.
- [ ] Run once more immediately before merging.

To prevent a large volume of CI emails, commits do **not** automatically start the workflow. Add the `run-validation` label to draft PR #1 to run it once; remove and re-add the label for a later run. Keep the PR in draft until approved.

## Manual browser acceptance

- [ ] Compare PC and mobile screenshots against currently deployed v0.9.95.
- [ ] Check all 78 card images, the gallery, magnifier, overlays, and close/open behavior.
- [ ] Exercise one-card, three-card, Celtic cross, and free-placement spreads.
- [ ] Create, edit, duplicate, delete, cancel, and restore custom spreads, including circular placement.
- [ ] Exercise shuffle variants and custom multi-step recipes; verify cut interactions.
- [ ] Save named readings, compare two readings, rename/delete, and restore a reading after a fresh session.
- [ ] Export/import a standalone reading and a full backup using a **copy** of real user data; verify positions, reversal flags, deck order, card size, and saved recipes.
- [ ] Check behavior when localStorage is blocked/full and when JSON imports are corrupted or unsupported.
- [ ] Check zoom, drag, touch, orientation changes, and scroll on phone/tablet.
- [ ] Confirm production images/paths all load when served from GitHub Pages.
- [ ] Back up important user data before publishing any change.

## Release procedure

1. Review the draft PR and all modified files; avoid opportunistic changes to live data.
2. Finish acceptance checks and verify the current commit in CI.
3. After explicit approval, merge into `main`; confirm GitHub Pages deploy and perform a production smoke test.
4. Keep the backup and a rollback reference to v0.9.95, so the release can be reverted if necessary.

## Scope note

The remaining `js/tabula.js` contains tightly coupled DOM handlers, animations, and application state. Its size alone does not establish that code is obsolete. Avoid deleting any function until call sites and interaction tests establish that it is dead.
