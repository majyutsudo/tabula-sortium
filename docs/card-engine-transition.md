# TABULA — card engine transition, development note (v0.400)

Status: **projection only**. The running UI, legacy storage, and dealing handlers
remain the source of truth. Nothing in `index.html` loads `card-engine.js` or
`card-bridge.js` yet.

## Modules

- `js/card-engine.js`: immutable operations on physical identities and ordered
  card containers. Each physical card must occupy exactly one container.
- `js/card-bridge.js`: pure, read-only conversion of an existing single-table
  state or multi-workspace snapshot to the engine's representation.
- `tests/card-engine.test.mjs` and `tests/card-bridge.test.mjs`: static tests.

## Projection semantics

`TabulaCardBridge.single(state, slots)` accepts the active single-table state
and the selected spread positions. It requires unique existing `id` values,
matching the current single-deck contract. `state.deck` order, `state.placed`
slot membership, loose placements, and `state.removed` are accounted for.
`state.dealCheckpoint` is intentionally *not* a physical location and must
not be counted as extra cards.

`TabulaCardBridge.multi(workspace, slotDefinitions)` accepts the existing
multi-workspace structure and an explicit slot list for every table. A/B
provenance and the mixed stock are retained; the mixed stock is represented as
a named temporary pile. Missing slot definitions for occupied positions fail
rather than dropping cards.

Output is `{engine, identityMap, cardPayloads}`. Original card payloads are
copied, not mutated. Existing card IDs and full UI-specific placement metadata
remain in the payload map so they are not silently lost during inspection.

## Known boundaries before cutover

1. The bridge is **not yet a write-back adapter**. Moving cards in its projected
   engine state does not update the live UI or localStorage.
2. The engine's generated identifiers (`deckId:index`) are deterministic within
   a projection but are **not persistent identities across different snapshots**
   of the legacy single-table state. Assign persistent instance IDs at the
   future authoritative-state cutover.
3. Free cards are projected as single-card piles; when adding genuine interactive
   piles, distinguish a card's visual overlap from intentional stack membership.
4. The current `slot` index model allows only one legacy card per position;
   the new engine allows multiple cards in a slot container.
5. The old `removed` array and the workflow's transient piles are not yet
   unified with interactive tabletop discard piles.
6. Full tests and browser regression checks are required before replacing
   `state.deck`, `state.placed`, and `dualSession`. No storage schema
   migration has been committed.

## Required next step

Design and test persistent instance identifiers, a unified container registry,
and a reversible conversion/controlled cutover for one table before replacing
any live state. Preserve normal draw/cut/shuffle, custom deal, two-deck mode,
reading snapshots, and backup/restore. Keep `main` untouched.
