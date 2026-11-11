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

## Legacy live integration (v0.402)

The existing single-table runtime now loads `js/physical-identity.js`.
This compatibility layer fills/validates `instanceId` on the active
`deck`, `placed` and `removed` arrays, and keeps matching IDs in the
read-only `dealCheckpoint`. IDs survive normal single-table local saves,
reloads, ordinary collection, stock restoration and new-reading reshuffles.
UI card operations still use the legacy arrays.

For the currently supported one-copy-per-face single deck, a missing ID is
normalized to `A:<cardId>`, consistent with the existing multi-workspace
naming convention. Existing IDs are respected and never rewritten merely
because a card changes array or order. Duplicate faces and duplicate physical
IDs are rejected; they are not silently repaired.

This is **not** the final arbitrary-deck identity lifecycle. New IDs for
freshly created or replaced physical decks, independent copies of identical
pictures inside the *same* deck, and engine-authoritative shared state remain
separate, uncompleted migration gates. The existing multi-workspace identity
format is unchanged for compatibility; do not claim the new container engine
is driving the UI.

User-approved default: collect ordered bundles as they currently lie; preserve
individual physical identities into subsequent readings. The explicit
pre-deal restore remains a distinct action.

Regression coverage: `tests/physical-identity.test.mjs` adds identity
retention, collection ordering, storage roundtrip and invalid-state tests.
Browser and complete Node-suite validation are still required before a
production release.

## Manual tabletop piles — incremental UI prototype (v0.411)

The single-table UI now loads `js/table-piles.js`. A user can arm
**＋束を置く**, tap the desired cloth location, and create an explicit
empty ordered pile. Dragging a dealt card onto the pile removes that physical
card from `state.placed` and puts it at index zero of `state.tablePiles[i].cards`.
The old spread slot becomes vacant, so the existing Deal command can refill
it. Tapping or dragging the pile's top card returns it to a loose position
or nearby empty preset slot. Dragging the pile handle moves the pile.
An empty pile can be removed, or all piles are collected with the regular
collection action. Top-first order and physical `instanceId` are preserved.

`TabulaPhysicalIdentity.ensureSingle` now accounts for pile cards and the
single-table bridge projects them as explicit ordered containers. Existing
stock, position, history and UI structures remain the runtime source of
truth: this is **not** yet the engine-authoritative cutover.

Deliberate scope limits:
- **Single-table mode only.** Creating the shared additional table with
  existing manual piles is blocked rather than silently discarding cards.
  Two-deck and independent-table pile operations await unified state.
- Cards may be moved into piles one at a time, and the **top card** is
  retrievable. Splitting or moving multiple cards as a block, arbitrary
  reordering within a pile, fanning, hiding/revealing underlying cards, and
  undo are not implemented yet.
- Piles are user-designated objects; visual overlap in a spread never
  converts into pile ownership.
- Positions currently use a simple zone percentage and visible handles.
  Further improvements for small screens and touch precision are pending.
- The original `state.removed` (automatic dealing exclusions) remains a
  separate legacy category, distinct from user-created tabletop piles.
- Reading snapshots and export formats need a later audit for displaying
  pile contents, although single-table local state stores `tablePiles`.
  The full interactive editing experience must receive browser verification.

Implementation intentionally preserves existing Tarot workflows and
card images. Do not advertise multi-deck or all-solitaire support yet.

## Ordered multi-card manipulation — v0.413

The single-table manual pile UI now supports top-block transfers and splitting:
- The selector beneath a nonempty pile chooses **上からN枚**. Drag its top
  visible card onto another explicit pile to put those N cards above the target,
  preserving the selected block's top-to-bottom order.
- Drag the selected top block onto an unoccupied part of the tabletop to
  create a new pile at that position, without duplicating any card. A single
  card retains its prior behavior of returning to a loose tableau position.
- Drag a pile's **header/handle** onto another pile to stack *all* source
  cards on the destination; the now-empty source pile is removed.
  Dragging the header elsewhere simply moves the existing pile.
- Selecting multiple cards and simply tapping the top does not remove them:
  the user must drag, preventing accidental loss of the intended block.
- Physical IDs, card orientations, block order and explicit pile membership
  are retained through save/reload and ordinary collection.

`js/table-piles.js` exports `transfer(state,source,destination,count)` and
`split(state,source,count,x,y)`. Invalid destinations, invalid counts,
self-transfers, and invalid positions fail before any card is removed.
These are still **single-table** operations on the legacy-compatible
`state.tablePiles`, not the final engine-authoritative multi-table model.
Within a pile, only a contiguous block from the top can be moved; arbitrary
internal removal, fanning and undo remain future work.


## Stable, read-only container projection — v0.422

The runtime still uses the existing `state.deck`, `state.placed`,
`state.removed`, and `state.tablePiles`. There is **no authority cutover**.

`TabulaCardBridge.singleStable(state, slots)` introduces a stricter,
lossless-in-identity projection to the experimental container engine.
It differs from the older `single()` compatibility projection:
- Every physical card must have an explicit, unique `instanceId`;
  catalogue card IDs may repeat without conflating the physical cards.
- Engine keys are these persistent instance IDs, not freshly generated
  `deckId:index` keys. Input is never modified.
- Stock order, placement slots, explicit top-first pile order, face state,
  rotation, the existing removed group, and each manual pile's fan vector
  survive the projection.
- The projected engine validates card conservation independently of the UI.
- This bridge is **read-only** and not loaded by the live app yet; it does
  not authorize routing live moves or saving its representation in place
  of the established state.

**Required next gates:** introduce explicit container roles (stock, tableau,
foundation, waste/talon, discard, dealing exclusion), optional table-slot
multi-card ownership, and a write-back/transaction boundary with equivalent
save/reload and backup round-trips. Validate Free Spread and Four Seasons
manual operations before enabling an engine-driven UI. Monte Carlo additionally
needs ordered compaction and refill. A rule-checking game engine is not needed
for the first manual-play milestone.

Until then do not alter the established pile or spread gestures as a side
effect of migration. The `main` branch remains untouched.


## Named tabletop container roles — v0.423

Manual tabletop piles now support a `role` field with generic values:
`pile` (ordinary), `tableau`, `foundation`, `waste` (talon),
and `discard`. Role is location metadata, **not** a property of a card;
a split-off bundle starts as an ordinary pile. Existing pile cards retain
physical `instanceId`, top-first order, face state, and the pile fan vector.

The live UI can change the role by clicking/tapping the existing pile
movement handle and choosing a role from the temporary selector. No extra
permanent control is added. The role is shown in the pile header and stored
with the workspace. Dragging stock onto a `waste` pile deals a face-up card;
other destinations continue to follow the normal face-up setting.

The experimental engine exposes `roleOf` and immutable `setPileRole`.
The strict bridge also projects roles. Do not replace the existing
`state.removed` exclusion category with a player-created discard pile:
these are separate locations with different purposes.

Roles currently **do not enforce rules** about which cards are allowed to
enter, leave, or be visible. A future optional rule layer can enforce
foundation sequence, waste-top-only access, or tableau sequences without
putting those rules into physical-card transfer operations.

This release still does not make the experimental engine authoritative;
validation must cover the two-deck/multi-table lifecycle and write-back
before migration. `main` is untouched.


## Intentional stack creation by hover — v0.424

While dragging one independent tabletop card over another, holding the
overlap steady for about 650 ms arms a prospective two-card pile, marked
with a temporary border on the target. Releasing while still overlapping
commits `TabulaTablePiles.stackPlaced`: the dragged card becomes top,
the designated target becomes bottom, the new pile takes the target's
coordinates, and both cards retain physical identities and face states.
Quick release retains the established independent-card overlap behavior.

The operation does not absorb unrelated overlapping cards. It is disabled
in the spread editor, during pile-placement arming, and in multi-workspace
mode. This is a deliberate conversion, not automatic pile membership
inferred from visual overlap.

The existing `＋束を置く` control remains available for creating an
empty location. It now lives alongside Shuffle/Cut/Deal/Open in the
primary table shortcut bar; on narrower screens the six operations
form two rows. No new permanent controls are placed over the cards.


## Zoomed pile interactions and placement controls — v0.427

The tabletop camera's touch and desktop pointer-capture pan handlers now
explicitly exempt `.table-pile` descendants alongside regular `.card`
elements. Zoomed tabletop background pans still begin on bare cloth,
but a gesture starting on an expanded pile's intermediate card remains a
pile card drag, including on mobile. This fixes the earlier camera
interception without changing pile data or its drag semantics.

The small bottom-right placement popup is organized into `配置`
(free snap, select a card, create an empty pile) and `操作` (hand-placement
mode). Shared button dimensions, font and active-state styling replace
the earlier mixed inline styles. The main five-button reading action bar
remains unchanged. The group layout is rebuilt only if missing, while
the existing DOM controls retain their event handlers and IDs.


## Registered spread positions holding multiple cards — v0.429

A deliberately stacked pair of placed cards now retains the destination's
registered `slot` index on the newly created `tablePiles` object. This
is container/location ownership; the source position becomes vacant. The
pile's other properties (role, free-angle fan, physical top-first order)
continue to work as before. Splitting a stack produces an unanchored
ordinary pile; the original pile keeps its registered position.

The live tabletop treats anchored piles as occupying their spread slots for
vacancy markers and automatic dealing. It shows the attached position number
on the pile handle, preserves the name in its tooltip, and renders the
top card of the pile in the spread's results list. Completion checks include
visible top cards of anchored piles.

`TabulaCardBridge.singleStable` projects the anchored pile into the *actual
registered slot container* of `TabulaCardEngine`, with all its cards,
order, face state, role and fan vector. It does not create a parallel pile
container. Strict validation rejects out-of-range slot anchors; engine
operations still preserve physical card identity and conservation.

**Boundary:** the live UI is still backed by its established placed/pile
arrays. The shared card engine remains read-only; it has no write-back yet.
Empty anchored piles currently reserve their locations, so automated
vacancy refill into those placeholders is a separate next milestone.
Avoid changing the live two-table mode until a full round-trip is validated.


## Vacant anchored position refill — v0.430

A registered spread position may continue to own an **empty** manual pile after
all its cards have been moved elsewhere. Such piles now count as *vacant* for
deal ordering, but the existing pile identity, role and fan geometry persist.
An empty anchored pile is shown as its own clickable refill placeholder rather
than a duplicate spread slot marker; clicking it deals one stock card into the
existing pile. Standard registered-spread dealing likewise refills the
empty pile rather than creating a separate placed card at the same location.

A pile with cards still counts as an occupied position. Bare, unanchored empty
piles are unchanged. The stock's next physical card is transferred intact,
and its face-up state follows normal deal settings (talon piles open face-up).
The source pile and all remaining card identities and ordering are preserved.
Removing the empty pile itself frees the registered slot normally.

The ordinary `state.placed` and `state.tablePiles` arrays still own live
operations. The experimental common-container engine remains projection-only;
this is the first UI path toward manual refill of registered multi-card slots.
