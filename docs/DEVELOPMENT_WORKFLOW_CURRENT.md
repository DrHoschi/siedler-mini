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
- CR-29C – Controlled Pan & Zoom Integration: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**
- Next allowed action: **CR-29 Completion / Regression / Freeze Gate**

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

**COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Implementation:

- `src/render/world-view-camera-control.js`
- `src/dev/cr-29c-self-test.node.js`
- `src/main.js` binds pointer/wheel input only to CR-29 camera state.

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

Accepted real-browser evidence on 2026-09-06:

- iPhone Safari initial world view showed the expected grid, 3 Buildings and 3 Persons,
- real drag/pan visibly changed camera offset,
- real pinch zoom visibly enlarged the world,
- a subsequent zoom-out visibly reduced the world,
- grid, Buildings and Persons remained coherent and visible through those view changes,
- no observable gameplay/world-state mutation was caused by camera operation.

Browser input verification: **PASS / 0 BLOCKER**.

CR-29C is therefore complete for the current whole-CR branch, but CR-29 itself remains not frozen until its own whole-system gate passes.

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

Execute **CR-29 Completion / Regression / Freeze Gate** against the frozen CR-28 baseline.

The whole-system gate must include CR-29A + CR-29B + CR-29C together with the frozen predecessor regression and the accepted real-browser evidence. Only at **PASS / 0 BLOCKER** may CR-29 be marked FROZEN and receive its frozen marker.

Do not begin or authorize a successor CR before that gate is complete.

---

**Updated:** 2026-09-06 after accepted real iPhone Safari browser verification of **CR-29C – Controlled Pan & Zoom Integration**: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.
