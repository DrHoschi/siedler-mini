# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-29-camera-world-view-foundation`
- Current immutable baseline: **CR-28 – Visible World Runtime Integration Foundation**
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Active system block: **CR-29 – Camera & World View Foundation**
- CR-29A – World View / Camera State Contract: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**
- CR-29B – Deterministic World-to-Screen Projection: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**
- CR-29C – Controlled Pan & Zoom Integration: **AUTOMATED_PASS / BROWSER_INPUT_VERIFICATION_PENDING**
- Next allowed action: **verify CR-29C real browser drag/pan + pinch or wheel zoom; no whole-CR freeze yet**

## 2. Frozen CR-28 baseline

Whole-system frozen marker:

`frozen/cr-28-visible-world-runtime-integration-foundation`

Frozen commit:

`1ca2997a3933b312737dda5a220f1026d149bdf1`

The CR-29 whole-CR branch was created directly from this exact frozen commit. CR-28 remains immutable.

Frozen visibility chain:

`gameplay/world owners -> CR-28A immutable projection -> CR-28B deterministic rendering -> CR-28C browser-visible Canvas`

## 3. CR-29 – Camera & World View Foundation

Question answered by CR-29:

> How does the player view the already-visible world through a controlled, deterministic camera/view boundary without changing gameplay truth?

### CR-29A – World View / Camera State Contract

**COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Implementation:

- `src/render/world-view-camera-state.js`
- `src/dev/cr-29a-self-test.node.js`

Contract boundary:

- camera/view state contains only `viewportWidth`, `viewportHeight`, `offsetX`, `offsetY`, `zoom`,
- viewport dimensions and zoom must be positive finite numbers,
- offsets must be finite numbers,
- equal inputs produce equal immutable state,
- no gameplay/world owner references.

### CR-29B – Deterministic World-to-Screen Projection

**COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Implementation:

- `src/render/world-to-screen-projection.js`
- `src/render/camera-world-rendering.js`
- `src/dev/cr-29b-self-test.node.js`
- `src/main.js` composes CR-28 rendering through CR-29A/B before Canvas execution.

Deterministic screen-space contract:

- point coordinate: `screen = worldRenderCoordinate * zoom + offset`,
- rectangle width/height and circle radius scale by `zoom`,
- command order, role, source identity and visible state are preserved,
- source CR-28 render commands remain unchanged,
- projected screen commands are deeply immutable,
- same CR-28 commands + same CR-29A state -> same screen-space commands,
- viewport dimensions define the Canvas execute boundary.

### CR-29C – Controlled Pan & Zoom Integration

**AUTOMATED_PASS / BROWSER_INPUT_VERIFICATION_PENDING**.

Implementation:

- `src/render/world-view-camera-control.js`
- `src/dev/cr-29c-self-test.node.js`
- `src/main.js` now binds pointer/wheel input only to CR-29 camera state.

Controlled presentation behavior:

- one active pointer drag pans by producing a new immutable CR-29A camera state,
- two active pointers pan by midpoint movement and zoom by distance ratio,
- wheel zoom is anchored at the pointer position,
- zoom is clamped to the controlled range `0.5 .. 3`,
- anchored zoom preserves the selected screen anchor,
- viewport resize changes only camera viewport dimensions,
- no input path mutates Map, Buildings, Persons, Logistics, Workforce, BuildingStock or other gameplay owners,
- CR-29B remains the only world-to-screen projection path.

Automated verification:

GitHub Actions run `34053144140` on commit `a09b046b5e2c5b1be73ce85743a8526f3415a99e` ran frozen regression + CR-28 whole-system gate + CR-29A/B/C tests successfully: **PASS / 0 BLOCKER**.

Manual evidence still required before CR-29C may be marked `COMPLETE_NOT_FROZEN`:

- real browser drag changes only the visible camera offset,
- real browser pinch (touch) or wheel (desktop) changes zoom,
- zoom remains controlled and the world remains visible/usable,
- gameplay/world owner state remains unaffected from the user's observable behavior.

After this browser verification, execute **CR-29 Completion / Regression / Freeze Gate** against frozen CR-28.

## 4. CR-29 hard global non-scope

CR-29 adds no:

- Save/Load/Continue ownership,
- Gameplay HUD,
- Build menu,
- Inspector,
- gameplay selection/commands,
- new pathfinding/movement/traffic behavior,
- BuildingStock/Workforce/Logistics ownership changes,
- production/construction/simulation semantics,
- mandatory new visual assets.

CR-29 is a presentation/view foundation only.

## 5. Frozen boundaries that CR-29 must preserve

- CR-28 projection/rendering remains read-only toward gameplay state,
- camera/view state is not gameplay truth,
- renderer owns no gameplay state and has no write-back path,
- stable Map/Building/Person identities remain unchanged,
- frozen CR-28 browser-visible world remains regressable,
- `main` remains historical reference only and is not a development base.

## 6. Next allowed action

Perform **CR-29C real-browser input verification** on the deployed whole-CR-29 branch.

Do not begin the CR-29 Completion / Regression / Freeze Gate until real drag/pan and pinch/wheel zoom behavior has been confirmed. Do not begin any successor CR.

---

**Updated:** 2026-09-06 after automated **CR-29C – Controlled Pan & Zoom Integration** verification: **PASS / 0 BLOCKER**, browser input verification still pending.
