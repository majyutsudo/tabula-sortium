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

## Identity and collection contract (v0.401)

User-approved rules:

- **Physical identity never encodes a mutable position.** A card keeps its
  `instanceId` through draws, shuffles, cuts, collection and subsequent
  readings with the same physical deck.
- **Normal collection preserves the current order within each collected
  bundle.** The caller explicitly chooses bundle order and whether to
  deposit on top or bottom. Depositing successive bundles on top naturally
  reverses the sequence of *bundles*, without reversing their internal cards.
- **Restore to the state before dealing is a separate operation** and must not
  be implemented as ordinary collection.
- **New reading reuses the physical deck**, rather than creating new IDs.
  Recreating an entirely new physical deck is an explicit different action.

The engine now accepts optional `instanceIds` in each deck definition and
provides `collect({from, to, toEnd})` for explicit whole-pile collection.
Names like `A:0` remain a fallback for temporary/test constructions; they
must *not* be regenerated from stock indices at the future live-state cutover.

**Important:** `card-bridge.js` is still a legacy **projection** that
generates positional internal keys and exposes the original identity via
`identityMap`. It is not a persistent-ID write-back adapter. The next
integration must avoid changing legacy state until a stable, saved instance
registry and round-trip checks are implemented. Existing single-table
`initialize()` still creates fresh legacy card objects, so this approved
behavior is an engine-level contract, **not yet a live UI feature**.

### Next migration gate

Before enabling the engine in the UI, add a persistent card registry to the
workspace storage and verify:
1. new readings preserve the IDs while changing ordering;
2. collected cards preserve physical order, and old restore is independent;
3. the same picture in multiple decks remains independently identifiable;
4. creating, editing or replacing a physical deck is an explicit lifecycle;
5. save/reload, backups, multiple tables and card conservation round-trip.
