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
- Next allowed action: **CR-29C – Controlled Pan & Zoom Integration**

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
- no gameplay/world owner references,
- no input/gesture behavior.

### CR-29B – Deterministic World-to-Screen Projection

**COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Implementation:

- `src/render/world-to-screen-projection.js`
- `src/render/camera-world-rendering.js`
- `src/dev/cr-29b-self-test.node.js`
- `src/main.js` now composes the existing CR-28 world projection/render path with an immutable CR-29A camera state.

Deterministic screen-space contract:

- point coordinate: `screen = worldRenderCoordinate * zoom + offset`,
- rectangle width/height and circle radius scale by `zoom`,
- command order, role, source identity and visible state are preserved,
- source CR-28 render commands remain unchanged,
- projected screen commands are deeply immutable,
- same CR-28 world/render commands + same CR-29A camera state -> same screen-space commands,
- changing only camera state changes presentation only,
- viewport dimensions define the Canvas clear/execute boundary,
- no gameplay/world mutation or ownership change,
- no browser control, gesture, pan or zoom input exists yet.

Verification:

GitHub Actions run `34052011986` on commit `3c8aa07bb523a61c0a75f22a3f3d465ae1b04a7b` ran frozen regression + CR-28 whole-system gate + CR-29A + CR-29B successfully: **PASS / 0 BLOCKER**.

### CR-29C – Controlled Pan & Zoom Integration

Now the next authorized step. It may add controlled user manipulation of the already-defined CR-29A state using the deterministic CR-29B projection. Camera changes affect presentation only and must never mutate Map, Buildings, Persons, Logistics, Workforce, BuildingStock or other gameplay owners.

After A/B/C, CR-29 requires a whole-system Completion / Regression / Freeze Gate against frozen CR-28.

## 4. CR-29 hard global non-scope

Until explicitly introduced by later authorized blocks, CR-29 adds no:

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

**CR-29C – Controlled Pan & Zoom Integration** may now begin on this same whole-CR-29 branch.

CR-29C may manipulate only CR-29 camera/view presentation state. Do not add HUD, Build Menu, Inspector, gameplay selection/orders or gameplay ownership changes.

---

**Updated:** 2026-09-06 after **CR-29B – Deterministic World-to-Screen Projection** verification: **PASS / 0 BLOCKER**.
